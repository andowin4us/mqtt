const MQTT = require('../helper/mqtt');
const connection = require('./connection');
const { MongoClient } = require('mongodb');
const cron = require('node-cron');
const moment = require("moment");
const { publishMessage } = require("../common/mqttCommon");

async function invokeInialization() {
    try {
        const client = await MongoClient.connect(connection.mongo.url, { useNewUrlParser: true }).catch(err => { console.log(err); });
        const db = client.db(connection.mongo.database);
        let collection = db.collection("MQTTDevice");
        let collectionInstance = db.collection("MQTTFlag");
        let resInstance = await collectionInstance.findOne({});
        let res = await collection.find({}).toArray();
        
        if (!resInstance) {
            
        }
        console.log("list of devices present to start receiving events ", res.length);
        if(res && res.length > 0) {
            for(let i = 0; i < res.length; i++ ) {
                console.log("Device ", i ," is ", res[i].deviceName, "Initiating Receiving Events.");
                let MQTT_URL = `mqtt://${res[i].mqttIP}:${res[i].mqttPort}`;
                new MQTT(MQTT_URL, res[i].mqttUserName, res[i].mqttPassword, res[i].mqttTopic, false);
            }

            return true;
        }
    } catch (err) {
        console.log(err);
    }
};

async function invokeDeviceStatusHandler() {
    cron.schedule('* */1 * * *', async () => {
        try {
            const client = await MongoClient.connect(connection.mongo.url, { useNewUrlParser: true }).catch(err => { console.log(err); });
            const db = client.db(connection.mongo.database);
            let collection = db.collection("MQTTDevice");
            let collectionAudit = db.collection("MQTTAuditLog");
            let collectionInstance = db.collection("MQTTFlag");
            let res = await collection.find({status: "Active"}).toArray();
            let resInstance = await collectionInstance.findOne({});
            
            console.log("list of devices present for expiry check ", res.length);
            if (res && res.length > 0) {    
                for (let i = 0; i < res.length; i++ ) {
                    console.log("Device ", i ," is ", res[i].deviceName);
                    //checking that mqtt heartbeat updated status properly.
                    let startTime = moment().format('YYYY-MM-DD HH:mm:ss');
                    let end = moment(res[i].modified_time);
                    let expiryDate = moment(resInstance.instanceExpiry);
                    let duration = moment.duration(end.diff(startTime));
                    let minutes = duration.asMinutes();
                    // minutes = Math.abs(minutes).toFixed(1);

                    // To stop receiving events..
                    // let MQTT_URL = `mqtt://${res[i].mqttIP}:${res[i].mqttPort}`;
                    // new MQTT(MQTT_URL, res[i].mqttUserName, res[i]truetrue.mqttPassword, res[i].mqttTopic, true);

                    if(resInstance.isRelayTimer && minutes > parseInt(resInstance.heartBeatTimer)) {
                        console.log("Heartbeat didn't received for this", res[i].deviceName ," from past ", minutes, "minutes");
                        let MQTT_URL = `mqtt://${res[i].mqttIP}:${res[i].mqttPort}`;
                        await publishMessage(MQTT_URL, res[i].mqttUserName, res[i].mqttPassword);
                        await collection.updateOne({_id: res[i]._id}, {$set: {"status": "InActive", modified_time: moment().format('YYYY-MM-DD HH:mm:ss')}});
                        await collectionAudit.insertOne({ 
                            moduleName: "MQTTDevice",
                            modified_user_id: "SYSTEM",
                            modified_user_name: "SYSTEM",
                            modified_time: moment().format("YYYY-MM-DD HH:mm:ss"),
                            log: JSON.stringify({...res[i], "status": "InActive", modified_time: moment().format('YYYY-MM-DD HH:mm:ss') })
                        });
                    }

                    if(startTime > expiryDate) {
                        console.log("Instance Expired and expiry was ", expiryDate);
                        await collectionInstance.updateOne({_id: resInstance._id}, {$set: {"instanceExpired": true, modified_time: moment().format('YYYY-MM-DD HH:mm:ss')}});
                        await collectionAudit.insertOne({ 
                            moduleName: "MQTTFlag",
                            modified_user_id: "SYSTEM",
                            modified_user_name: "SYSTEM",
                            modified_time: moment().format("YYYY-MM-DD HH:mm:ss"),
                            log: JSON.stringify({...resInstance, "instanceExpired": true, modified_time: moment().format('YYYY-MM-DD HH:mm:ss') })
                        });
                    }
                }

                return true;
            }
        } catch (err) {
            console.log(err);
        }
    });
};

module.exports = {
    invokeInialization,
    invokeDeviceStatusHandler
};
