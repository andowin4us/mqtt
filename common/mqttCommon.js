const { MongoClient } = require('mongodb');
const mqtt = require('mqtt')
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

                if (resultExisting && resultExisting._id) {
                    console.log("dump_device_id is already present.");

                    return false;
                } else {
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
        }
    } catch (err) {
        console.log("error occurred.", err);

        return false;
    }
}

async function processMessage (data) {
    console.log("Processing your message now for ", data?.device_id);
    let result = await mongoInsert(data, { deviceId: data?.device_id }, "MQTTDevice", "find");

    //device id check
    if (result && result.deviceId && data.device_id === result.deviceId) {
        //device mac check
        if (data.mac_id && data.mac_id === result.mqttMacId) {
            let resultConfig = await mongoInsert( data, { deviceId: data.device_id, logType: data.log_type }, "MQTTLoggerType", "find" );
            //logger type check
            if (resultConfig && resultConfig._id) {
                //Device state check.
                if (data.log_type === "Status") {
                    data._id = uuidv4();
                    data.modified_time = moment().format("YYYY-MM-DD HH:mm:ss");
                    data.user_id = result.userId;
                    await mongoInsert(data, {}, "MQTTLogger", "create");
                    await mongoInsert({mqttState: data.state}, {deviceId: data.device_id}, "MQTTDevice", "update");

                    return true;
                } 
                let resultExisting = await mongoInsert( data, { device_id: data.device_id, log_line_count: data.log_line_count }, "MQTTLogger", "find" );
                //Log Line count check
                if (resultExisting && resultExisting._id) {
                    console.log("In MQTTLogger data is already present.");

                    return false;
                } else {
                    // Sending mail if log type is "POWER, DOOR".
                    if (["DOOR", "POWER"].includes(data.log_type)) {
                        await sendEmail("ag14683@gmail.com", { DeviceName: data.device_name, DeviceId: data.device_id, 
                            Action: `${data.log_type} ${data.log_desc}`, MacId: data.mac_id, TimeofActivity: moment().format("YYYY-MM-DD HH:mm:ss") });
                    }

                    // Check if Door is opened and maintainence request was approved via Super User.
                    if (data.log_type === "DOOR" && data.log_desc === "OPENED") {
                        let checkMaintainence = await mongoInsert(data, {devices: {$all: [data.device_id]}, status: "Approved", endTime: {"$gte": moment().format("YYYY-MM-DD HH:mm:ss")}}, "MQTTMaintainence", "find");
                        
                        if (!checkMaintainence) {
                            await mongoInsert({status: "InActive", modified_time: moment().format("YYYY-MM-DD HH:mm:ss")}, {}, "MQTTDevice", "update" );
                            let MQTT_URL = `mqtt://${result.mqttIP}:${result.mqttPort}`;
                            publishMessage(MQTT_URL, result.mqttUserName, result.mqttPassword);
                        }
                    }

                    data._id = uuidv4();
                    data.modified_time = moment().format("YYYY-MM-DD HH:mm:ss");
                    data.user_id = result.userId;
                    await mongoInsert( data, {}, "MQTTLogger", "create");

                    return true;
                }
            } else {
                let resultExisting = await mongoInsert(data, { device_id: data.device_id, log_line_count: data.log_line_count }, "dump_logger_type", "find" );

                if (resultExisting && resultExisting._id) {
                    console.log("In dump_logger_type log_type is already present.");
                } else {
                    data._id = uuidv4();
                    data.modified_time = moment().format("YYYY-MM-DD HH:mm:ss");
                    await mongoInsert( data, {}, "dump_logger_type", "create" );
                }
            }
        } else {
            let resultExisting = await mongoInsert( data, { device_id: data.device_id, log_line_count: data.log_line_count }, "dump_device_mac", "find" );

            if (resultExisting && resultExisting._id) {
                console.log("In dump_device_mac device_mac is already present.");
            } else {
                data._id = uuidv4();
                data.modified_time = moment().format("YYYY-MM-DD HH:mm:ss");
                await mongoInsert( data, {}, "dump_device_mac", "create" );
            }
        }
    } else {
        if (data && data.device_id) {
            let resultExisting = await mongoInsert(data, { device_id: data.device_id, log_line_count: data.log_line_count }, "dump_device_id", "find");

            if (resultExisting && resultExisting._id) {
                console.log("In dump_device_id device_id is already present.");
            } else {
                data._id = uuidv4();
                data.modified_time = moment().format("YYYY-MM-DD HH:mm:ss");
                await mongoInsert( data, {}, "dump_device_id", "create" );
            }
        } else {
            if (data === null || data === undefined) { 
                let data = {}; 
                data._id = uuidv4();
                data.modified_time = moment().format("YYYY-MM-DD HH:mm:ss");
                await mongoInsert(data, {}, "dump_device_id", "create");
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
    
            // console.log(res);

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
    
            console.log("data insert to ", collectionName, res.insertedCount);
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
    
                console.log("data update to receipeStatus ", collectionName);
                return res;
            }
            let res = await collection.updateOne(filter, {$set: data}, { upsert: true });
    
            console.log("data update to ", collectionName);
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
    const client = mqtt.connect(MQTT_URL, options);
    
    client.on('connect', () => {
        client.publish("Relay/Control", "ON");
    });
}

module.exports = {
    utilizeMqtt
};