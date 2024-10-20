const MQTT = require('../helper/mqtt');
const connection = require('./connection');
const { MongoClient } = require('mongodb');
const cron = require('node-cron');
const moment = require('moment');
const { publishMessage } = require('../common/mqttCommon');
const { getUuid } = require('../helper/util');
const md5Service = require('../services/md5.service');
const { sendEmail } = require('../common/mqttMail');

let client, db, clientRemote, dbRemote;

// Initialize MongoDB client
async function initializeMongo() {
    if (!client) {
        client = await MongoClient.connect(connection.mongo.url, {});
        db = client.db(connection.mongo.database);
    }
}

async function initializeRemoteMongo(flagData) {
    if (!clientRemote) {
        const remoteMongoUrl = `mongodb+srv://${flagData.REMOTE_MONGO_USERNAME}:${flagData.REMOTE_MONGO_PASSWORD}@${flagData.REMOTE_MONGO_HOST}/?retryWrites=true&w=majority`;
        clientRemote = await MongoClient.connect(remoteMongoUrl, {});
        dbRemote = clientRemote.db("mqtt");
    }
}

// Seed data if necessary
async function seedData() {
    const collectionInstance = db.collection('MQTTFlag');
    const collectionUser = db.collection('MQTTUser');

    const instanceData = await collectionInstance.findOne({});
    if (!instanceData) {
        console.log('No seeding data found. Inserting default data.');
        const flagsData = {
            _id: getUuid(),
            instanceExpiry: moment().add(1, 'years').format('YYYY-MM-DD HH:mm:ss'),
            relayTimer: 300,
            isRelayTimer: false,
            heartBeatTimer: 30,
            instanceExpired: false,
            logLineLimit: 240000,
            useRemoteMongo: false,
            superUserMails: 'test@gmail.com',
            ccUsers: '',
            bccUsers: '',
            SMTP_SERVER: 'smtp.migadu.com',
            SMTP_SENDING_EMAIL: 'test@gccglobetech.com',
            SMTP_SENDING_PASSWORD: 'Gofortest@321',
            SMTP_PORT: 465,
            REMOTE_MONGO_HOST: "",
            REMOTE_MONGO_USERNAME: "",
            REMOTE_MONGO_PASSWORD: "",
        };

        const userData = {
            _id: getUuid(),
            name: 'Test1',
            userName: 'test1',
            status: 'Active',
            password: md5Service().password({ password: 'test1234' }),
            accesslevel: 1,
            email: 'super@logsense.com',
            created_time: moment().format('YYYY-MM-DD HH:mm:ss'),
            modified_time: moment().format('YYYY-MM-DD HH:mm:ss')
        };

        await Promise.all([
            collectionInstance.insertOne(flagsData),
            collectionUser.insertOne(userData)
        ]);
    }
}

// Start MQTT clients for devices
async function startDevices() {
    const collection = db.collection('MQTTDevice');
    const devices = await collection.distinct('mqttIP');

    console.log('Devices found: ', devices.length);

    for (const mqttIP of devices) {
        const device = await collection.findOne({ mqttIP: mqttIP, status: "Active" });
        if (device) {
            const MQTT_URL = `mqtt://${device.mqttIP}:${device.mqttPort}`;
            new MQTT(MQTT_URL, device.mqttUserName, device.mqttPassword, device.mqttTopic, false);
        }
    }
}

// Initialize the system
async function invokeInitialization() {
    try {
        await initializeMongo();
        await seedData();
        await startDevices();
    } catch (err) {
        console.error('Initialization error:', err);
    }
}

// Common function to log audit entries
async function logAudit(collection, data) {
    await collection.insertOne({
        moduleName: data.moduleName,
        operation: data.operation,
        message: data.message,
        modified_user_id: 1,
        modified_user_name: 'SYSTEM',
        role: "SuperUser",
        status: "success",
        modified_time: moment().format('YYYY-MM-DD HH:mm:ss'),
        log: JSON.stringify(data.log)
    });
}

// Check and update device statuses
async function checkDeviceStatus() {
    try {
        const collection = db.collection('MQTTDevice');
        const collectionAudit = db.collection('MQTTAuditLog');
        const collectionInstance = db.collection('MQTTFlag');
        const collectionMaintainence = db.collection('MQTTMaintainence');

        const devices = await collection.find({}).toArray();
        const instanceData = await collectionInstance.findOne({});
        const maintainences = await collectionMaintainence.find({ status: 'Pending' }).toArray();
        const currentTime = moment();

        if (devices.length > 0) {
            await Promise.all(devices.map(async (device) => {
                console.log(`Checking status for device ${device.deviceName}`);
                const deviceTime = moment(device.modified_time);
                const durationSeconds = moment.duration(currentTime.diff(deviceTime)).asSeconds();

                let relayStatus = device.mqttStatusDetails.mqttRelayState;
                if (relayStatus === false && instanceData.isRelayTimer && (parseInt(durationSeconds, 10) > parseInt(instanceData.relayTimer, 10))) {
                    await updateDeviceStatus(device, 'InActive', true, durationSeconds, instanceData);
                }
            }));
        }
        
        if(maintainences.length > 0) {
            await Promise.all(maintainences.map(async (maintainence) => {
                const maintainenceEndTime = moment(maintainence.endTime);

                if (currentTime.isAfter(maintainenceEndTime)) {
                    await collectionMaintainence.updateOne({ _id: maintainence._id }, { $set: { status: "Auto_Rejected", isEditable: false, modified_time: currentTime.format('YYYY-MM-DD HH:mm:ss') } });
                    await logAudit(collectionAudit, {
                        moduleName: 'Maintainence',
                        operation: "update",
                        message: `SYSTEM updated the Maintainence Request.`,
                        log: { ...maintainence, status: "Auto_Rejected", isEditable: false, modified_time: currentTime.format('YYYY-MM-DD HH:mm:ss') }
                    });
                }
            }));
        }

        return true;
    } catch (err) {
        console.error('Device status check error:', err);
    }
}

// Update device status
async function updateDeviceStatus(device, status, mqttRelayState, durationSeconds, getFlagData) {
    console.log(`Updating device ${device.deviceName} to ${status} and triggering relay`);
    const MQTT_URL = `mqtt://${device.mqttIP}:${device.mqttPort}`;
    let messageSend = "ON," + device.deviceId;
    await publishMessage(MQTT_URL, device.mqttUserName, device.mqttPassword, messageSend);

    const collection = db.collection('MQTTDevice');
    await collection.updateOne({ _id: device._id }, {
        $set: {
            status,
            mqttStatusDetails: { ...device.mqttStatusDetails, mqttRelayState },
            modified_time: moment().format('YYYY-MM-DD HH:mm:ss')
        }
    });

    await sendEmail(getFlagData.superUserMails, {
        DeviceName: device.deviceName,
        DeviceId: device.deviceId,
        Action: `Relay triggered ON for device ${device.deviceName}`,
        MacId: device.mqttMacId,
        TimeofActivity: moment().format('YYYY-MM-DD HH:mm:ss'),
    }, getFlagData, getFlagData.ccUsers, getFlagData.bccUsers);

    await logAudit(db.collection('MQTTAuditLog'), {
        moduleName: 'DEVICE',
        operation: "Relay ON",
        message: `Relay Timer breached has triggered the relay ON via the predefined timer of ${durationSeconds}`,
        log: { ...device, status, modified_time: moment().format('YYYY-MM-DD HH:mm:ss') }
    });

    // Handle remote Mongo logging
    if (await isRemoteMongoEnabled(device)) {
        await initializeRemoteMongo(instanceData);
        const collectionAuditRemote = dbRemote.collection('MQTTAuditLog');
        await logAudit(collectionAuditRemote, {
            moduleName: 'DEVICE',
            operation: "Relay ON",
            message: `Relay Timer breached has triggered the relay ON via the predefined timer of ${durationSeconds}`,
            log: { ...device, status, modified_time: moment().format('YYYY-MM-DD HH:mm:ss') }
        });
    }

    return true;
}

// Check if remote Mongo is enabled
async function isRemoteMongoEnabled(instanceData) {
    return instanceData.useRemoteMongo;
}

// Check and update device hearbeat
async function checkHeartBeatStatus() {
    try {
        const collection = db.collection('MQTTDevice');
        const collectionAudit = db.collection('MQTTAuditLog');
        const collectionInstance = db.collection('MQTTFlag');

        const devices = await collection.find({ status: 'Active' }).toArray();
        const instanceData = await collectionInstance.findOne({});
        const currentTime = moment();

        if (devices.length > 0) {
            await Promise.all(devices.map(async (device) => {
                console.log(`Checking heartbeat status for device ${device.deviceName}`);
                const deviceTime = moment(device.modified_time);
                const durationSeconds = moment.duration(currentTime.diff(deviceTime)).asSeconds();

                if (parseInt(durationSeconds, 10) > parseInt(instanceData.heartBeatTimer, 10)) {
                    console.log(`Updating device ${device.deviceName} to InActive due to heartbeat missed.`);
                    await collection.updateOne({ _id: device._id }, {
                        $set: {
                            status: 'InActive',
                            modified_time: moment().format('YYYY-MM-DD HH:mm:ss')
                        }
                    });

                    await collectionAudit.insertOne({
                        moduleName: "AuditLog",
                        operation: "update",
                        message: "Device updated to InActive due to Heartbeat Event not received.",
                        modified_user_id: 1,
                        modified_user_name: 'SYSTEM',
                        role: "SuperUser",
                        status: "success",
                        modified_time: moment().format('YYYY-MM-DD HH:mm:ss'),
                        log: JSON.stringify({})
                    });
                }
            }));
        }

        return true;
    } catch (err) {
        console.error('Device status check error:', err);
    }
}

// Schedule the device status handler
function scheduleDeviceStatusHandler() {
    cron.schedule('* */1 * * *', checkDeviceStatus);
    cron.schedule('*/30 * * * * *', checkHeartBeatStatus);
}

module.exports = {
    invokeInitialization,
    scheduleDeviceStatusHandler
};
