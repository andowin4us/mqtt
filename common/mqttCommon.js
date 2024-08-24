const { MongoClient } = require('mongodb');
const mqtt = require("async-mqtt");
const connection = require('../config/connection');
const { v4: uuidv4 } = require("uuid");
const moment = require("moment");
const { sendEmail } = require("../common/mqttMail");

async function utilizeMqtt(message) {
    try {
        //data type check
        if (typeof message === "object" && JSON.parse(message)) {
            let data = JSON.parse(message);

            // Already accumulated logs check.
            if (data.mqttDataLogs_onPrem && data.mqttDataLogs_onPrem.extra_data) {
                console.log("log length is ", data.mqttDataLogs_onPrem.extra_data.length, data.mqttDataLogs_onPrem.device_id);
                let count = [];

                for (let i = 0; i < data.mqttDataLogs_onPrem.extra_data.length; i++) {
                    let onPremProcess = await processMessage(data.mqttDataLogs_onPrem.extra_data[i]);
                    count.push(onPremProcess);
                }

                if(count === data.mqttDataLogs_onPrem.extra_data.length) {
                    const allEqual = count => count.every( v => v === count[0] );

                    if (allEqual(count) === true) {
                        return true;
                    } else {
                        return false;
                    }
                }
            } else {
                // Normal logs check
                return await processMessage(data);
            }
        } else {
            if(message && message.device_id) {
                let resultExisting = await mongoInsert(message, { device_id: message.device_id ? message.device_id : "", log_line_count: message.log_line_count ? message.log_line_count : "" }, "dump_device_id", "find");

                if (!resultExisting) {
                    message._id = uuidv4();
                    data.modified_time = moment().format("YYYY-MM-DD HH:mm:ss");
                    await mongoInsert( message, {}, "dump_device_id", "create" );

                    return false;
                }
            } else {
                message._id = uuidv4();
                message.modified_time = moment().format("YYYY-MM-DD HH:mm:ss");
                await mongoInsert( message, {}, "dump_device_id", "create" );

                return false;
            }

            return false;
        }
    } catch (err) {
        console.log("error occurred.", err);

        return false;
    }
}

async function processMessage (data) {
    console.log("Processing your message now for ", data?.device_id);
    let result = await mongoInsert(data, { deviceId: data?.device_id }, "MQTTDevice", "find");
    let getFlagData = await mongoInsert(data, {}, "MQTTFlag", "find");

    //device id check
    if (result && result.deviceId && data.device_id === result.deviceId) {
        //device mac check
        if (data.mac_id && data.mac_id === result.mqttMacId) {
            let resultConfig = await mongoInsert( data, { deviceId: data.device_id, logType: data.log_type }, "MQTTLoggerType", "find" );
            //logger type check
            if (resultConfig && resultConfig._id) {
                //Device state check.
                if (data.log_type === "Status" || data.log_type === "STATE" || data.log_type === "Heartbeat") {
                    data._id = uuidv4();
                    data.modified_time = moment().format("YYYY-MM-DD HH:mm:ss");
                    data.user_id = result.userId;
                    data.timestamp = moment(new Date(data.timestamp)).format("YYYY-MM-DD HH:mm:ss");
                    await mongoInsert(data, {}, "MQTTLogger", "create");
                    
                    let logTypeUpdate = {};
                    logTypeUpdate[`${data.log_type}`] = {
                        status: data.log_type === "Status" ? data.state : data.log_desc,
                        modified_time: moment().format("YYYY-MM-DD HH:mm:ss")
                    };
                    let mqttStatusDetails = {...result.mqttStatusDetails, 
                        ...logTypeUpdate,
                        mqttBattery: data.battery_level,
                        mqttRelayState: data.relay_state ? data.relay_state : false
                    };

                    if (data.log_type === "Heartbeat") {
                        let startTime = moment().format('YYYY-MM-DD HH:mm:ss');
                        let end = moment(result.modified_time);
                        let duration = moment.duration(end.diff(startTime));
                        let minutes = Math.abs(duration.asMinutes());

                        if(minutes > parseInt(getFlagData.heartBeatTimer)) {
                            let MQTT_URL = `mqtt://${result.mqttIP}:${result.mqttPort}`;
                            data.relay_state = "ON";
                            await publishMessage(MQTT_URL, result.mqttUserName, result.mqttPassword);
                        }
                    }

                    await mongoInsert({mqttStatusDetails: mqttStatusDetails, 
                        modified_time: moment().format("YYYY-MM-DD HH:mm:ss")}, {deviceId: data.device_id}, "MQTTDevice", "update");

                    return true;
                } 
                let resultExistingLogLimit = await mongoInsert( data, { device_id: data.device_id, log_line_count: 240000 }, "MQTTLogger", "find" );
                let resultExisting = await mongoInsert( data, { device_id: data.device_id, log_line_count: data.log_line_count }, "MQTTLogger", "find" );
                //Log Line count check
                if (!resultExistingLogLimit && resultExisting && resultExisting._id) {
                    return false;
                } else {
                    // Log limit 240K length check
                    if (resultExistingLogLimit && resultExistingLogLimit._id) {
                        if (moment(new Date(data.timestamp)).format("YYYY-MM-DD") < moment().format("YYYY-MM-DD")) {
                            return false;
                        }
                    }
                    // Sending mail if log type is "POWER, DOOR".
                    if (["DOOR", "POWER"].includes(data.log_type)) {
                        await sendEmail(getFlagData.superUserMails, { DeviceName: data.device_name, DeviceId: data.device_id, 
                            Action: `${data.log_type} ${data.log_desc}`, 
                            MacId: data.mac_id, 
                            TimeofActivity: moment().format("YYYY-MM-DD HH:mm:ss") 
                        }, getFlagData);
                    }

                    // Check if Door is opened and maintainence request was approved via Super User.
                    if (data.log_type === "DOOR" && data.log_desc === "OPENED") {
                        let checkMaintainence = await mongoInsert(data, {devices: {$all: [data.device_id]}, status: "Approved", endTime: {"$gte": moment().format("YYYY-MM-DD HH:mm:ss")}}, "MQTTMaintainence", "find");
                        
                        if (!checkMaintainence) {
                            await mongoInsert({status: "InActive", modified_time: moment().format("YYYY-MM-DD HH:mm:ss")}, {}, "MQTTDevice", "update" );
                            await sendEmail(getFlagData.superUserMails, { DeviceName: data.device_name, DeviceId: data.device_id, 
                                Action: `Relay triggered ON for device ${data.device_name}`, 
                                MacId: data.mac_id, 
                                TimeofActivity: moment().format("YYYY-MM-DD HH:mm:ss") 
                            }, getFlagData);
                            await mongoInsert({
                                moduleName: "MQTTLogger",
                                modified_user_id: "SYSTEM",
                                modified_user_name: "SYSTEM",
                                modified_time: moment().format("YYYY-MM-DD HH:mm:ss"),
                                log: "RELAY Turned ON"
                            }, {}, "MQTTAuditLog", "create");

                            let MQTT_URL = `mqtt://${result.mqttIP}:${result.mqttPort}`;
                            data.relay_state = "ON";
                            await publishMessage(MQTT_URL, result.mqttUserName, result.mqttPassword);
                        }
                    }

                    let logTypeUpdate = {};
                    logTypeUpdate[`${data.log_type}`] = {
                        status: data.log_desc,
                        modified_time: moment().format("YYYY-MM-DD HH:mm:ss")
                    };
                    let mqttStatusDetails = {...result.mqttStatusDetails, 
                        ...logTypeUpdate,
                        mqttBattery: data.battery_level,
                        mqttRelayState: data.relay_state ? data.relay_state : false 
                    };
                    await mongoInsert({mqttStatusDetails: mqttStatusDetails}, {deviceId: data.device_id}, "MQTTDevice", "update");

                    data._id = uuidv4();
                    data.modified_time = moment().format("YYYY-MM-DD HH:mm:ss");
                    data.user_id = result.userId;
                    data.timestamp = moment(new Date(data.timestamp)).format("YYYY-MM-DD HH:mm:ss");
                    await mongoInsert( data, {}, "MQTTLogger", "create");

                    return true;
                }
            } else {
                let resultExisting = await mongoInsert(data, { device_id: data.device_id, log_line_count: data.log_line_count }, "dump_logger_type", "find" );

                if (!resultExisting) {
                    data._id = uuidv4();
                    data.modified_time = moment().format("YYYY-MM-DD HH:mm:ss");
                    await mongoInsert( data, {}, "dump_logger_type", "create" );
                }
            }
        } else {
            let resultExisting = await mongoInsert( data, { device_id: data.device_id, log_line_count: data.log_line_count }, "dump_device_mac", "find" );

            if (!resultExisting) {
                data._id = uuidv4();
                data.modified_time = moment().format("YYYY-MM-DD HH:mm:ss");
                await mongoInsert( data, {}, "dump_device_mac", "create" );
            }
        }
    } else {
        if (data && data.device_id) {
            let resultExisting = await mongoInsert(data, { device_id: data.device_id, log_line_count: data.log_line_count }, "dump_device_id", "find");

            if (!resultExisting) {
                data._id = uuidv4();
                data.modified_time = moment().format("YYYY-MM-DD HH:mm:ss");
                await mongoInsert( data, {}, "dump_device_id", "create" );
            }
        } else {
            if (data === null || data === undefined) { 
                data = {}; 
            }

            data._id = uuidv4();
            data.modified_time = moment().format("YYYY-MM-DD HH:mm:ss");
            await mongoInsert( data, {}, "dump_device_id", "create" );
        }
    }

    return false;
}

async function mongoInsert(data, filter, collectionName, type) {
    let count = 0;
    const client = await MongoClient.connect(connection.mongo.url, { useNewUrlParser: true }).catch(err => { console.log(err); });

    if (!client) {

        if(count === 4) {
            return false;
        } else {
            count++;
            await mongoInsert(data);
        }
    }

    if(type === "find") {
        try {
            const db = client.db(connection.mongo.database);
            let collection = db.collection(collectionName);
            let res = await collection.findOne(filter);
    
            return res;
        } catch (err) {
            console.log(err);
        }
    }

    if(type === "create") {
        try {
            const db = client.db(connection.mongo.database);
            let collection = db.collection(collectionName);
            let res = await collection.insertOne(data);

            return res;
        } catch (err) {
            console.log(err);
        }
    }

    if(type === "update") {
        try {
            const db = client.db(connection.mongo.database);
            let collection = db.collection(collectionName);
            if(data.log_type && data.log_type === "receipeUpdate") {
                let res = await collection.updateOne(filter, {$set: data});
    
                return res;
            }
            let res = await collection.updateOne(filter, {$set: data}, { upsert: true });
            
            return res;
        } catch (err) {
            console.log(err);
        }
    }
}

async function publishMessage(MQTT_URL, userName, password) {
    const clientId = `mqtt_${Math.random().toString(16).slice(3)}`;
    let options = {
        clientId: clientId,
        clean: true,
        connectTimeout: 4000,
        username: userName || null,
        password: password || null,
        reconnectPeriod: 1000,
    };
    const client = await mqtt.connect(MQTT_URL, options);
    
    client.on('connect', async () => {
        await client.publish("Relay/Control", "ON");
    });
}

module.exports = {
    utilizeMqtt,
    publishMessage,
};