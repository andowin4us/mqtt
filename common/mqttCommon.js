const { MongoClient } = require('mongodb');
const mqtt = require('async-mqtt');
const connection = require('../config/connection');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');
const dotenv = require('dotenv');
const BullQueueService = require('../common/BullQueueService');
dotenv.config({ path: process.env.ENV_PATH || '.env' });
const redisUrl = `redis://${process.env.REDIS_HOST}:6379`;
const emailQueueService = new BullQueueService('email', redisUrl);

let topicsBe = "WIFI,STATE,Heartbeat,RELAY,POWER,Power,MQTT,Power/State,Logs,DOOR,Energy,Weight,process_status,super_access,status,Relay/State,State";
topicsBe = topicsBe.split(',');

async function utilizeMqtt(message) {
    try {
        let data;

        // Ensure message is a valid JSON object
        if (typeof message === 'string' && JSON.parse(message)) {
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
    console.log('Processing message for device', data.device_id, data);
    if (data && data.device_id && data.timestamp) {
        const result = await mongoInsert(data, { deviceId: data.device_id }, 'MQTTDevice', 'find');

        if (result) {
            const getFlagData = await mongoInsert(data, {}, 'MQTTFlag', 'find');
        
            if (!result || !data.device_id || data.device_id !== result.deviceId) {
                console.log("Invalid Device Id.");
                return handleInvalidDeviceData(data);
            }
        
            if (data.mac_id && data.mac_id !== result.mqttMacId) {
                console.log("Invalid Mac Id.");
                return handleInvalidMacId(data);
            }
        
            if (!topicsBe.includes(data.log_type)) {
                console.log("Invalid Log Type.");
                return false;
            }
    
            if (data.log_type === 'Heartbeat') {
                return await handleHeartbeat(data, result, getFlagData);
            }

            if (result?.mqttStatusDetails?.mqttRelayState === true) {
                data.visibleTo = 1;
            } else {
                data.visibleTo = 2;
            }
        
            return await handleOtherLogs(data, result, getFlagData);
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
    const now = moment();
    const end = moment(result.modified_time);
    const duration = now.diff(end, 'seconds');

    const logTypeUpdate = {
        [data.log_type]: data.log_desc,
    };

    const mqttStatusDetails = {
        ...result.mqttStatusDetails,
        ...logTypeUpdate,
        mqttBattery: data.battery_level,
        mqttRelayState: data.relay_state !== 'OFF',
    };

    const modifiedTime = now.format('YYYY-MM-DD HH:mm:ss');

    const mongoUpdate = async (status) => {
        await mongoInsert({ mqttStatusDetails, status, modified_time: modifiedTime }, { deviceId: data.device_id }, 'MQTTDevice', 'update');
    };

    if (parseInt(duration, 10) <= parseInt(getFlagData.relayTimer, 10) && data.relay_state === 'OFF') {
        if (result.status === "InActive") {
            await mongoUpdate("Active");
        } else {
            await mongoInsert({ mqttStatusDetails, modified_time: modifiedTime }, { deviceId: data.device_id }, 'MQTTDevice', 'update');
        }
    }

    if (getFlagData.isRelayTimer && parseInt(duration, 10) > parseInt(getFlagData.relayTimer, 10) && data.relay_state === 'OFF') {
        const MQTT_URL = `mqtt://${result.mqttIP}:${result.mqttPort}`;
        const messageSend = `ON,${data.device_id}`;
        await emailQueueService.addJob({ device: result, message: `Relay triggered ON for device ${data.device_name}.` });
        await publishMessage(MQTT_URL, result.mqttUserName, result.mqttPassword, messageSend);
        mqttStatusDetails.mqttRelayState = true;
        await mongoInsert({ mqttStatusDetails, status: "InActive" }, { deviceId: data.device_id }, 'MQTTDevice', 'update');
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
        await emailQueueService.addJob({ device: result, message: `${data.log_type} ${data.log_desc}.` });
    }

    if (data.log_type === 'DOOR' && data.log_desc === 'OPENED') {
        const checkMaintainence = await mongoInsert(data, { devices: { $all: [data.device_id] }, status: 'Approved', endTime: { $gte: moment().format('YYYY-MM-DD HH:mm:ss') } }, 'MQTTMaintainence', 'find');

        if (!checkMaintainence) {
            await mongoInsert({ status: 'InActive', "mqttStatusDetails.mqttRelayState": true }, {}, 'MQTTDevice', 'update');
            const MQTT_URL = `mqtt://${result.mqttIP}:${result.mqttPort}`;
            let messageSend = "ON,"+data.device_id;
            await publishMessage(MQTT_URL, result.mqttUserName, result.mqttPassword, messageSend);

            await emailQueueService.addJob({ device: result, message: `Relay triggered ON for device ${data.device_name}.` });

            await mongoInsert({
                moduleName: 'DEVICE',
                operation: "Relay ON",
                message: `Relay Timer breached has triggered the relay ON via the predefined timer`,
                modified_user_id: 'SYSTEM',
                modified_user_name: 'SYSTEM',
                status: "success",
                role: "SuperUser",
                modified_time: moment().format('YYYY-MM-DD HH:mm:ss'),
                log: 'RELAY Turned ON',
            }, {}, 'MQTTAuditLog', 'create');
        }
    }

    const logTypeUpdate = {
        [data.log_type]: data.log_desc
    };

    const mqttStatusDetails = {
        ...result.mqttStatusDetails,
        ...logTypeUpdate,
        mqttBattery: data.battery_level
    };

    await mongoInsert({ mqttStatusDetails }, { deviceId: data.device_id }, 'MQTTDevice', 'update');

    data._id = uuidv4();
    data.modified_time = moment().format('YYYY-MM-DD HH:mm:ss');
    data.timestamp = moment(new Date(data.timestamp)).format('YYYY-MM-DD HH:mm:ss');

    await mongoInsert(data, {}, 'MQTTLogger', 'create');

    return true;
}

async function mongoInsert(data, filter, collectionName, type) {
    let localClient;
    let localDb;
    let results = {};

    try {
        // Connect to the local MongoDB
        localClient = await connectToMongo(connection.mongo.url);
        localDb = localClient.db(connection.mongo.database);

        // Perform operation on local MongoDB
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

        return results;
    } catch (err) {
        console.error('MongoDB operation error:', err);
        return null;
    } finally {
        // Ensure connections are properly closed
        if (localClient) await localClient.close();
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
