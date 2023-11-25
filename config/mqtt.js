const MQTT = require('../helper/mqtt');
const connection = require('./connection');
const { MongoClient } = require('mongodb');
const cron = require('node-cron');
const moment = require("moment");

async function invokeInialization() {
    console.log("invokeInialization");
    try {
        const client = await MongoClient.connect(connection.mongo.url, { useNewUrlParser: true }).catch(err => { console.log(err); });
        const db = client.db(connection.mongo.database);
        let collection = db.collection("MQTTDevice");
        let res = await collection.find({}).toArray();
        
        console.log("list of devices present ", res.length);
        if(res && res.length > 0) {    
            for(let i = 0; i < res.length; i++ ) {
                console.log("Device ", i ," is ", res[i].deviceName);

                if(res[i].status === "Active") {
                    console.log("Initiating Device Connections.");
                    let MQTT_URL = `mqtt://${res[i].mqttIP}:${res[i].mqttPort}`;
                    new MQTT(MQTT_URL, res[i].mqttUserName, res[i].mqttPassword, res[i].mqttTopic, false);
                } else {
                    console.log("Device Status InActive Cannot initiate receiving events.", res[i].deviceName);
                }
            }
        }
    } catch (err) {
        console.log(err);
    }
};

async function invokeDeviceStatusHandler() {
    cron.schedule('* */1 * * *', async () => {
        console.log('This is an every minute device status check handler.');
        try {
            const client = await MongoClient.connect(connection.mongo.url, { useNewUrlParser: true }).catch(err => { console.log(err); });
            const db = client.db(connection.mongo.database);
            let collection = db.collection("MQTTDevice");
            let res = await collection.find({}).toArray();
            
            console.log("list of devices present ", res.length);
            if(res && res.length > 0) {    
                for(let i = 0; i < res.length; i++ ) {
                    console.log("Device ", i ," is ", res[i].deviceName);

                    if(res[i].status === "Active") {
                        //checking that mqtt heartbeat updated status properly.
                        let startTime = moment().format('YYYY-MM-DD HH:mm:ss');
                        let end = moment(res[i].modified_time);
                        let duration = moment.duration(end.diff(startTime));
                        let minutes = duration.asMinutes();
                        minutes = Math.abs(minutes).toFixed(1);
    
                        if(minutes > 2) {
                            console.log("Heartbeat didn't received for this", res[i].deviceName ," from past ", minutes, "minutes");
                            let MQTT_URL = `mqtt://${res[i].mqttIP}:${res[i].mqttPort}`;
                            new MQTT(MQTT_URL, res[i].mqttUserName, res[i].mqttPassword, res[i].mqttTopic, true);
    
                            await collection.updateOne({_id: res[i]._id}, {$set: {"status": "InActive", modified_time: moment().format('YYYY-MM-DD HH:mm:ss') }});
                        }
                    } else {
                        console.log("Device Status InActive Cannot initiate receiving events.", res[i].deviceName);
                    }
                }
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
