const { MongoClient } = require('mongodb');
const moment = require('moment');
const { bullQueueInstanceEmail, bullQueueInstanceRemote } = require('../config/bullQueueInstance');
const { sendEmail } = require('../common/mqttMail');
const connection = require('../config/connection');

const mongoUrl = `mongodb://${process.env.MONGO_HOST}:27017`;

bullQueueInstanceEmail.processJobs(async (job) => {
    try {
        console.log("Processing email job:", job.data);
        const { device, message } = job.data;

        const localClient = await MongoClient.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true });
        const localDb = localClient.db(connection.mongo.database);

        const localCollection = localDb.collection("MQTTFlag");
        const getFlagData = await localCollection.findOne({});

        await sendEmail(getFlagData.superUserMails, { 
            DeviceName: device.deviceName, 
            DeviceId: device.deviceId, 
            Action: message, 
            MacId: device.mqttMacId, 
            TimeofActivity: moment().format("YYYY-MM-DD HH:mm:ss")
        }, getFlagData, getFlagData.ccUsers, getFlagData.bccUsers);

        await localClient.close();
    } catch (error) {
        console.error(`Failed to process email job ${job.id}:`, error);
        throw error; // Let Bull know the job failed
    }
});

bullQueueInstanceRemote.processJobs(async (job) => {
    try {
        console.log(`Processing remote job ${job.id}`, job.data);
        // Add your remote job processing logic here
        return Promise.resolve();
    } catch (error) {
        console.error(`Failed to process remote job ${job.id}:`, error);
        throw error; // Let Bull know the job failed
    }
});