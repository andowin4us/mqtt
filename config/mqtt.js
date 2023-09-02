const MQTT = require('../helper/mqtt');
const connection = require('./connection');
const { MongoClient } = require('mongodb');

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
                console.log("Device ", i ," is ", JSON.stringify(res[i]));

                if(res[i].status === "Active") {
                    let MQTT_URL = `mqtt://${res[i].mqttIP}:${res[i].mqttPort}`;
                    new MQTT(MQTT_URL, res[i].mqttUserName, res[i].mqttPassword, res[i].mqttTopic, false);
                } else {
                    console.log("Device Status InActive Cannot initiate receiving events.");
                }
            }
        }
    } catch (err) {
        console.log(err);
    }
};

module.exports = {
    invokeInialization
};
