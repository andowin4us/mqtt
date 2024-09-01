const MQTT = require('../helper/mqtt');
const connection = require('./connection');
const { MongoClient } = require('mongodb');
const cron = require('node-cron');
const moment = require('moment');
const { publishMessage } = require('../common/mqttCommon');
const { getUuid } = require('../helper/util');
const md5Service = require('../services/md5.service');

let client;
let db;

// Initialize MongoDB client
async function initializeMongo() {
    if (!client) {
        client = await MongoClient.connect(connection.mongo.url, { useNewUrlParser: true });
        db = client.db(connection.mongo.database);
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
            heartBeatTimer: 60,
            isRelayTimer: true,
            instanceExpired: false,
            logLineLimit: 240000,
            useRemoteMongo: false,
            superUserMails: 'ag14683@gmail.com, andowin4us@gmail.com',
            SMTP_SERVER: 'smtp.migadu.com',
            SMTP_SENDING_EMAIL: 'test@gccglobetech.com',
            SMTP_SENDING_PASSWORD: 'Gofortest@321',
            SMTP_PORT: 465
        };

        const userData = {
            _id: getUuid(),
            name: 'Test1',
            userName: 'test1',
            status: 'Active',
            password: md5Service().password({password: 'test1234'}),
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
    const devices = await collection.find({}).toArray();

    console.log('Devices found: ', devices.length);
    
    devices.forEach((device, index) => {
        console.log(`Device ${index} is ${device.deviceName}. Initiating event reception.`);
        const MQTT_URL = `mqtt://${device.mqttIP}:${device.mqttPort}`;
        new MQTT(MQTT_URL, device.mqttUserName, device.mqttPassword, device.mqttTopic, false);
    });
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

// Check and update device statuses
async function checkDeviceStatus() {
    try {
        const collection = db.collection('MQTTDevice');
        const collectionAudit = db.collection('MQTTAuditLog');
        const collectionInstance = db.collection('MQTTFlag');
        const devices = await collection.find({ status: 'Active' }).toArray();
        const instanceData = await collectionInstance.findOne({});

        const currentTime = moment();
        
        if (devices.length > 0) {
            await Promise.all(devices.map(async (device) => {
                console.log(`Checking status for device ${device.deviceName}`);
                const deviceTime = moment(device.modified_time);
                const instanceExpiry = moment(instanceData.instanceExpiry);
                const durationSeconds = moment.duration(currentTime.diff(deviceTime)).asSeconds();

                const updateStatus = async (status, mqttRelayState) => {
                    console.log(`Updating device ${device.deviceName} to ${status}`);
                    const MQTT_URL = `mqtt://${device.mqttIP}:${device.mqttPort}`;
                    let messageSend = "ON,"+device.deviceId;
                    await publishMessage(MQTT_URL, device.mqttUserName, device.mqttPassword, messageSend);
                    await collection.updateOne({ _id: device._id }, {
                        $set: {
                            status,
                            mqttStatusDetails: { ...device.mqttStatusDetails, mqttRelayState },
                            modified_time: currentTime.format('YYYY-MM-DD HH:mm:ss')
                        }
                    });
                    await collectionAudit.insertOne({
                        moduleName: 'MQTTDevice',
                        operation: "trigger relay ON",
                        message: `Relay Timer breached has triggered the relay ON via the predefined timer of ${durationSeconds}`,
                        modified_user_id: 'SYSTEM',
                        modified_user_name: 'SYSTEM',
                        modified_time: currentTime.format('YYYY-MM-DD HH:mm:ss'),
                        log: JSON.stringify({ ...device, status, modified_time: currentTime.format('YYYY-MM-DD HH:mm:ss') })
                    });
                };

                if (instanceData.isRelayTimer && 
                    ((device.status === 'InActive' && !device.mqttStatusDetails.mqttRelayState) || (durationSeconds > instanceData.heartBeatTimer))) {
                    await updateStatus('InActive', true);
                }
 
                if (currentTime.isAfter(instanceExpiry)) {
                    console.log(`Instance expired for ${device.deviceName}`);
                    await collectionInstance.updateOne({ _id: instanceData._id }, {
                        $set: { instanceExpired: true, modified_time: currentTime.format('YYYY-MM-DD HH:mm:ss') }
                    });
                    await collectionAudit.insertOne({
                        moduleName: 'MQTTFlag',
                        modified_user_id: 'SYSTEM',
                        modified_user_name: 'SYSTEM',
                        modified_time: currentTime.format('YYYY-MM-DD HH:mm:ss'),
                        log: JSON.stringify({ ...instanceData, instanceExpired: true, modified_time: currentTime.format('YYYY-MM-DD HH:mm:ss') })
                    });
                }
            }));
        }
    } catch (err) {
        console.error('Device status check error:', err);
    }
}

// Schedule the device status handler
function scheduleDeviceStatusHandler() {
    cron.schedule('* */1 * * *', checkDeviceStatus);
}

module.exports = {
    invokeInitialization,
    scheduleDeviceStatusHandler
};
