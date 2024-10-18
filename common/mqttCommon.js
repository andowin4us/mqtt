const { MongoClient } = require('mongodb');
const mqtt = require('async-mqtt');
const connection = require('../config/connection');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');
const { sendEmail } = require('../common/mqttMail');

async function utilizeMqtt(message) {
    try {
        let data;

        // Ensure message is a valid JSON object
        if (typeof message === 'object' && JSON.parse(message)) {
            data = JSON.parse(message);
        } else {
            return handleInvalidJson(message);
        }

        // Process logs if available
        if (data.mqttDataLogs_onPrem?.extra_data) {
            return await processLogs(data.mqttDataLogs_onPrem.extra_data);
        }

        // Process single message
        return await processMessage(data);
    } catch (err) {
        console.error('Error occurred:', err);
        return false;
    }
}

async function handleInvalidJson(message) {
    message._id = uuidv4();
    message.modified_time = moment().format('YYYY-MM-DD HH:mm:ss');
    await mongoInsert(message, {}, 'dump_device_id', 'create');
    return false;
}

async function processLogs(logs) {
    const results = await Promise.all(logs.map(processMessage));

    return results.every(result => result === true);
}

async function processMessage(data) {
    if (data && data.device_id && data.timestamp) {
        console.log('Processing message for device', data.device_id);
        const result = await mongoInsert(data, { deviceId: data.device_id }, 'MQTTDevice', 'find');

        //Accepting Events for active devices only.
        if (result && result.status === "Active") {
            const getFlagData = await mongoInsert(data, {}, 'MQTTFlag', 'find');
        
            if (!result || !data.device_id || data.device_id !== result.deviceId) {
                console.log("Invalid Device Id.");
                return handleInvalidDeviceData(data);
            }
        
            if (data.mac_id && data.mac_id !== result.mqttMacId) {
                console.log("Invalid Mac Id.");
                return handleInvalidMacId(data);
            }
        
            if (!result.mqttTopic.includes(data.log_type)) {
                console.log("Invalid Log Type.");
                return false;
            }
    
            if (data.log_type === 'Heartbeat') {
                return await handleHeartbeat(data, result, getFlagData);
            }
        
            return await handleOtherLogs(data, result, getFlagData);
        } else {
            console.log("Device status InActive.");
            return false;
        }
    } else {
        console.log("No Device Data present or invalid Timestamp in the log event.");
        return false;
    }
}

async function handleInvalidDeviceData(data) {
    return await handleDumpData(data, 'dump_device_id');
}

async function handleInvalidMacId(data) {
    return await handleDumpData(data, 'dump_device_mac');
}

async function handleDumpData(data, collectionName) {
    const existing = await mongoInsert(data, { device_id: data.device_id, log_line_count: data.log_line_count }, collectionName, 'find');

    if (!existing) {
        data._id = uuidv4();
        data.modified_time = moment().format('YYYY-MM-DD HH:mm:ss');
        await mongoInsert(data, {}, collectionName, 'create');
    }

    return false;
}

async function handleHeartbeat(data, result, getFlagData) {
    const startTime = moment();
    const end = moment(result.modified_time);
    const duration = moment.duration(startTime.diff(end)).asSeconds();

    const logTypeUpdate = {
        [data.log_type]: data.log_desc,
    };

    const mqttStatusDetails = {
        ...result.mqttStatusDetails,
        ...logTypeUpdate,
        mqttBattery: data.battery_level,
        mqttRelayState: data.relay_state === 'OFF' ? false : true,
    };

    await mongoInsert({ mqttStatusDetails, modified_time: moment().format('YYYY-MM-DD HH:mm:ss') }, { deviceId: data.device_id }, 'MQTTDevice', 'update');
    await mongoInsert({ $set : { mqttStatusDetails, modified_time: moment().format('YYYY-MM-DD HH:mm:ss') } }, { deviceId: data.device_id }, 'MQTTDevice', 'update', "remote");

    if (getFlagData.isRelayTimer && duration > parseInt(getFlagData.heartBeatTimer, 10)) {
        const MQTT_URL = `mqtt://${result.mqttIP}:${result.mqttPort}`;
        let messageSend = "ON,"+data.device_id;
        await sendEmail(getFlagData.superUserMails, {
            DeviceName: data.device_name,
            DeviceId: data.device_id,
            Action: `Relay triggered ON for device ${data.device_name}`,
            MacId: data.mac_id,
            TimeofActivity: moment().format('YYYY-MM-DD HH:mm:ss'),
        }, getFlagData, getFlagData.ccUsers, getFlagData.bccUsers);
        await publishMessage(MQTT_URL, result.mqttUserName, result.mqttPassword, messageSend);
    }

    return true;
}

async function handleOtherLogs(data, result, getFlagData) {
    const existingLogLimit = await mongoInsert(data, { device_id: data.device_id, log_line_count: getFlagData.logLineLimit }, 'MQTTLogger', 'find');
    const existing = await mongoInsert(data, { device_id: data.device_id, log_line_count: data.log_line_count }, 'MQTTLogger', 'find');

    if (!existingLogLimit && existing?._id) {
        console.log("Record already exists.");
        return false;
    }

    if (existingLogLimit?._id && moment(new Date(data.timestamp)).isBefore(moment().startOf('day'))) {
        return false;
    }

    if (['DOOR', 'POWER'].includes(data.log_type)) {
        await sendEmail(getFlagData.superUserMails, {
            DeviceName: data.device_name,
            DeviceId: data.device_id,
            Action: `${data.log_type} ${data.log_desc}`,
            MacId: data.mac_id,
            TimeofActivity: moment().format('YYYY-MM-DD HH:mm:ss'),
        }, getFlagData, getFlagData.ccUsers, getFlagData.bccUsers);
    }

    if (data.log_type === 'DOOR' && data.log_desc === 'OPENED') {
        const checkMaintainence = await mongoInsert(data, { devices: { $all: [data.device_id] }, status: 'Approved', endTime: { $gte: moment().format('YYYY-MM-DD HH:mm:ss') } }, 'MQTTMaintainence', 'find');

        if (!checkMaintainence) {
            await mongoInsert({ status: 'InActive', modified_time: moment().format('YYYY-MM-DD HH:mm:ss') }, {}, 'MQTTDevice', 'update');
            await mongoInsert({ $set: {status: 'InActive', modified_time: moment().format('YYYY-MM-DD HH:mm:ss') } }, {}, 'MQTTDevice', 'update', "remote");

            const MQTT_URL = `mqtt://${result.mqttIP}:${result.mqttPort}`;
            data.relay_state = 'ON';
            let messageSend = "ON,"+data.device_id;
            await publishMessage(MQTT_URL, result.mqttUserName, result.mqttPassword, messageSend);

            await sendEmail(getFlagData.superUserMails, {
                DeviceName: data.device_name,
                DeviceId: data.device_id,
                Action: `Relay triggered ON for device ${data.device_name}`,
                MacId: data.mac_id,
                TimeofActivity: moment().format('YYYY-MM-DD HH:mm:ss'),
            }, getFlagData, getFlagData.ccUsers, getFlagData.bccUsers);

            await mongoInsert({
                moduleName: 'MQTTLogger',
                operation: "Relay ON",
                message: `Relay Timer breached has triggered the relay ON via the predefined timer`,
                modified_user_id: 'SYSTEM',
                modified_user_name: 'SYSTEM',
                modified_time: moment().format('YYYY-MM-DD HH:mm:ss'),
                log: 'RELAY Turned ON',
            }, {}, 'MQTTAuditLog', 'create');

            await mongoInsert({
                moduleName: 'MQTTLogger',
                operation: "Relay ON",
                message: `Relay Timer breached has triggered the relay ON via the predefined timer`,
                modified_user_id: 'SYSTEM',
                modified_user_name: 'SYSTEM',
                modified_time: moment().format('YYYY-MM-DD HH:mm:ss'),
                log: 'RELAY Turned ON',
            }, {}, 'MQTTAuditLog', 'create', "remote");
        }
    }

    const logTypeUpdate = {
        [data.log_type]: data.log_desc
    };

    const mqttStatusDetails = {
        ...result.mqttStatusDetails,
        ...logTypeUpdate,
        mqttBattery: data.battery_level,
        mqttRelayState: data.relay_state || false,
    };

    await mongoInsert({ mqttStatusDetails }, { deviceId: data.device_id }, 'MQTTDevice', 'update');
    await mongoInsert({ $set: { mqttStatusDetails } }, { deviceId: data.device_id }, 'MQTTDevice', 'update', "remote");

    data._id = uuidv4();
    data.modified_time = moment().format('YYYY-MM-DD HH:mm:ss');
    data.user_id = result.userId;
    data.timestamp = moment(new Date(data.timestamp)).format('YYYY-MM-DD HH:mm:ss');

    await mongoInsert(data, {}, 'MQTTLogger', 'create');
    await mongoInsert(data, {}, 'MQTTLogger', 'create', "remote");

    return true;
}

async function mongoInsert(data, filter, collectionName, type, host = "local") {
    let localClient, remoteClient;
    let localDb, remoteDb;
    let results = {};

    try {
        // Connect to the local MongoDB
        localClient = await connectToMongo(connection.mongo.url);
        localDb = localClient.db(connection.mongo.database);

        // If remote host is specified, connect to the remote MongoDB
        if (host === "remote") {
            // Retrieve remote MongoDB credentials
            const flagData = await localDb.collection('MQTTFlag').findOne({});
            if (!flagData) throw new Error('Failed to retrieve flag data for remote MongoDB credentials.');

            if (flagData.useRemoteMongo) {
                const remoteMongoUrl = `mongodb+srv://${flagData.REMOTE_MONGO_USERNAME}:${flagData.REMOTE_MONGO_PASSWORD}@${flagData.REMOTE_MONGO_HOST}/?retryWrites=true&w=majority`;
                remoteClient = await connectToMongo(remoteMongoUrl);
                remoteDb = remoteClient.db(connection.mongo.database);
            }
        }

        // Perform operation on local MongoDB
        if (host === "local" && localClient) {
            const localCollection = localDb.collection(collectionName);
            switch (type) {
                case 'find':
                    results = await localCollection.findOne(filter);
                    break;
                case 'create':
                    results = await localCollection.insertOne(data);
                    break;
                case 'update':
                    results = await localCollection.updateOne(filter, { $set: data });
                    break;
                default:
                    throw new Error(`Unknown operation type: ${type}`);
            }
        }

        // Perform operation on remote MongoDB if applicable
        if (host === "remote" && remoteClient) {
            const remoteCollection = remoteDb.collection(collectionName);
            switch (type) {
                case 'find':
                    results.remote = await remoteCollection.findOne(filter);
                    break;
                case 'create':
                    results.remote = await remoteCollection.insertOne(data);
                    break;
                case 'update':
                    results.remote = await remoteCollection.updateOne(filter, data);
                    break;
                case 'remove':
                    results.remote = await remoteCollection.deleteOne(filter);
                    break;
            }
        }

        return results;
    } catch (err) {
        console.error('MongoDB operation error:', err);
        return null;
    } finally {
        // Ensure connections are properly closed
        if (localClient) await localClient.close();
        if (remoteClient) await remoteClient.close();
    }
}

// Utility function to connect to MongoDB
async function connectToMongo(url) {
    let client;
    try {
        client = await MongoClient.connect(url, { });
        return client;
    } catch (err) {
        console.error('MongoDB connection error:', err);
        return null;
    }
}

async function publishMessage(MQTT_URL, userName, password, message) {
    const clientId = `mqtt_${Math.random().toString(16).slice(3)}`;
    const options = {
        clientId,
        clean: true,
        connectTimeout: 4000,
        username: userName || null,
        password: password || null,
        reconnectPeriod: 1000,
    };

    try {
        const client = await mqtt.connect(MQTT_URL, options);
        client.on('connect', async () => {
            await client.publish('Relay/Control', message);
        });
    } catch (err) {
        console.error('MQTT publish error:', err);
    }
}

module.exports = {
    utilizeMqtt,
    publishMessage,
    mongoInsert
};
