const { MongoClient } = require('mongodb');
const mqtt = require('async-mqtt');
const connection = require('../config/connection');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');
const { sendEmail } = require('../common/mqttMail');

const MAX_RETRIES = 4;

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
    console.log('Processing message for device', data.device_id);

    const result = await mongoInsert(data, { deviceId: data.device_id }, 'MQTTDevice', 'find');
    const getFlagData = await mongoInsert(data, {}, 'MQTTFlag', 'find');

    if (!result || !data.device_id || data.device_id !== result.deviceId) {
        return handleInvalidDeviceData(data);
    }

    if (data.mac_id && data.mac_id !== result.mqttMacId) {
        return handleInvalidMacId(data);
    }

    if (data.log_type === 'Heartbeat') {
        return await handleHeartbeat(data, result, getFlagData);
    }

    return await handleOtherLogs(data, result, getFlagData);
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
        [data.log_type]: {
            status: data.log_desc,
            modified_time: moment().format('YYYY-MM-DD HH:mm:ss'),
        },
    };

    const mqttStatusDetails = {
        ...result.mqttStatusDetails,
        ...logTypeUpdate,
        mqttBattery: data.battery_level,
        mqttRelayState: data.relay_state === 'OFF' ? false : true,
    };

    await mongoInsert({ mqttStatusDetails, modified_time: moment().format('YYYY-MM-DD HH:mm:ss') }, { deviceId: data.device_id }, 'MQTTDevice', 'update');

    if (getFlagData.isRelayTimer && duration > parseInt(getFlagData.heartBeatTimer, 10)) {
        const MQTT_URL = `mqtt://${result.mqttIP}:${result.mqttPort}`;
        let messageSend = "ON,"+data.device_id;
        await publishMessage(MQTT_URL, result.mqttUserName, result.mqttPassword, messageSend);
    }

    return true;
}

async function handleOtherLogs(data, result, getFlagData) {
    const existingLogLimit = await mongoInsert(data, { device_id: data.device_id, log_line_count: getFlagData.logLineLimit }, 'MQTTLogger', 'find');
    const existing = await mongoInsert(data, { device_id: data.device_id, log_line_count: data.log_line_count }, 'MQTTLogger', 'find');

    if (!existingLogLimit && existing?._id) {
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
        }, getFlagData);
    }

    if (data.log_type === 'DOOR' && data.log_desc === 'OPENED') {
        const checkMaintainence = await mongoInsert(data, { devices: { $all: [data.device_id] }, status: 'Approved', endTime: { $gte: moment().format('YYYY-MM-DD HH:mm:ss') } }, 'MQTTMaintainence', 'find');

        if (!checkMaintainence) {
            await mongoInsert({ status: 'InActive', modified_time: moment().format('YYYY-MM-DD HH:mm:ss') }, {}, 'MQTTDevice', 'update');
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
            }, getFlagData);

            await mongoInsert({
                moduleName: 'MQTTLogger',
                operation: "trigger relay ON",
                message: `Relay Timer breached has triggered the relay ON via the predefined timer of ${durationSeconds}`,
                modified_user_id: 'SYSTEM',
                modified_user_name: 'SYSTEM',
                modified_time: moment().format('YYYY-MM-DD HH:mm:ss'),
                log: 'RELAY Turned ON',
            }, {}, 'MQTTAuditLog', 'create');
        }
    }

    const logTypeUpdate = {
        [data.log_type]: {
            status: data.log_desc,
            modified_time: moment().format('YYYY-MM-DD HH:mm:ss'),
        },
    };

    const mqttStatusDetails = {
        ...result.mqttStatusDetails,
        ...logTypeUpdate,
        mqttBattery: data.battery_level,
        mqttRelayState: data.relay_state || false,
    };

    await mongoInsert({ mqttStatusDetails }, { deviceId: data.device_id }, 'MQTTDevice', 'update');

    data._id = uuidv4();
    data.modified_time = moment().format('YYYY-MM-DD HH:mm:ss');
    data.user_id = result.userId;
    data.timestamp = moment(new Date(data.timestamp)).format('YYYY-MM-DD HH:mm:ss');

    await mongoInsert(data, {}, 'MQTTLogger', 'create');

    return true;
}

async function mongoInsert(data, filter, collectionName, type) {
    const client = await MongoClient.connect(connection.mongo.url, { useNewUrlParser: true }).catch(err => {
        console.error(err);
        return null;
    });

    if (!client) return null;

    const db = client.db(connection.mongo.database);
    const collection = db.collection(collectionName);

    try {
        switch (type) {
            case 'find':
                return await collection.findOne(filter);
            case 'create':
                return await collection.insertOne(data);
            case 'update':
                if (data.log_type === 'receipeUpdate') {
                    return await collection.updateOne(filter, { $set: data });
                }
                return await collection.updateOne(filter, { $set: data }, { upsert: true });
            default:
                throw new Error(`Unknown operation type: ${type}`);
        }
    } catch (err) {
        console.error(err);
    } finally {
        client.close();
    }

    return null;
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
};
