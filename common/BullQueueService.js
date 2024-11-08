const BullQueue = require('bull');
const { MongoClient } = require('mongodb');
const moment = require('moment');
const { sendEmail } = require('../common/mqttMail');
const connection = require('../config/connection');

class BullQueueService {
    constructor(queueName, redisUrl) {
        this.queue = new BullQueue(queueName, redisUrl);
        this.mongoUrl = `mongodb://${process.env.MONGO_HOST}:27017`;
        
        this.initialize();
    }

    initialize() {
        this.queue.process(this.processJob.bind(this));
        
        this.queue.on('completed', (job, result) => {
            console.log(`Job ${job.id} completed successfully:`);
            this.clearJob(job); // Clear job after processing
        });

        this.queue.on('failed', (job, err) => {
            console.error(`Job ${job.id} failed:`, err);
        });
        
        this.queue.on('stalled', (job) => {
            console.warn(`Job ${job.id} has stalled and may need investigation.`);
        });
    }

    async connectToMongo(url) {
        let client;
        try {
            client = await MongoClient.connect(url, { });
            return client;
        } catch (err) {
            console.error('MongoDB connection error:', err);
            return null;
        }
    }    

    async processJob(job) {
        let localClient, remoteClient;
        let localDb, remoteDb;
        console.log("Processing job:", job.id);
        try {
            const { device, message } = job.data;

            // Connect to the local MongoDB
            localClient = await this.connectToMongo(connection.mongo.url);
            localDb = localClient.db(connection.mongo.database);
    
            const getFlagData = await localDb.collection('MQTTFlag').findOne({});
            if (!getFlagData) throw new Error('Failed to retrieve flag data for remote MongoDB credentials.');

            let emailResults = await sendEmail(getFlagData.superUserMails, { 
                DeviceName: device.deviceName, 
                DeviceId: device.deviceId, 
                Action: message, 
                MacId: device.mqttMacId, 
                TimeofActivity: moment().format("YYYY-MM-DD HH:mm:ss")
            }, getFlagData, getFlagData.ccUsers, getFlagData.bccUsers);

            if (getFlagData.useRemoteMongo) {
                // Connect to the remote MongoDB
                const remoteMongoUrl = `mongodb+srv://${getFlagData.REMOTE_MONGO_USERNAME}:${getFlagData.REMOTE_MONGO_PASSWORD}@${getFlagData.REMOTE_MONGO_HOST}/?retryWrites=true&w=majority`;
                remoteClient = await this.connectToMongo(remoteMongoUrl);
                remoteDb = remoteClient.db(connection.mongo.database);

                await remoteDb.collection('MQTTAuditLog').insertOne({
                    moduleName: 'EMAIL',
                    modified_user_id: 'SYSTEM',
                    operation: "email",
                    message: `Email sent to for ${device.deviceName}.`,
                    status: "success",
                    role: "SuperUser",
                    modified_user_name: 'SYSTEM',
                    modified_time: moment().format('YYYY-MM-DD HH:mm:ss'),
                    log: JSON.stringify({emailResults}),
                });
                await remoteClient.close();
            }

            await localDb.collection('MQTTAuditLog').insertOne({
                moduleName: 'EMAIL',
                modified_user_id: 'SYSTEM',
                operation: "email",
                message: `Email sent to for ${device.deviceName}.`,
                status: "success",
                role: "SuperUser",
                modified_user_name: 'SYSTEM',
                modified_time: moment().format('YYYY-MM-DD HH:mm:ss'),
                log: JSON.stringify({emailResults}),
            });

            await localClient.close();
            return Promise.resolve(); // Indicate success
        } catch (error) {
            console.error(`Error processing job ${job.id}:`, error);
            await localDb.collection('MQTTAuditLog').insertOne({
                moduleName: 'EMAIL',
                modified_user_id: 'SYSTEM',
                operation: "email",
                message: `Email sending to for ${device.deviceName} failed.`,
                status: "failed",
                role: "SuperUser",
                modified_user_name: 'test1',
                modified_time: moment().format('YYYY-MM-DD HH:mm:ss'),
                log: JSON.stringify({error}),
            });
            throw error; // Rethrow error to mark job as failed
        }
    }

    async addJob(data) {
        return this.queue.add(data);
    }

    async clearJob(job) {
        try {
            await job.remove(); // Remove the job from the queue
            console.log(`Job ${job.id} has been removed from the queue.`);
        } catch (error) {
            console.error(`Failed to remove job ${job.id}:`, error);
        }
    }

    async close() {
        await this.queue.close();
        console.log(`Queue ${this.queue.name} closed.`);
    }

    async clear() {
        await this.queue.empty();
        console.log(`Queue ${this.queue.name} cleared.`);
    }
}

module.exports = BullQueueService;
