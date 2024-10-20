const dotenv = require('dotenv');
const mqtt = require('mqtt');
const { utilizeMqtt } = require('../common/mqttCommon');
const BullQueue = require('bull');

dotenv.config({ path: process.env.ENV_PATH || '.env' });

const RECONNECTION_TIMEOUT_BASE = 2000;
const MAX_RECONNECT_ATTEMPTS = 5;

class MQTTConnector {
    constructor(url, userName, password, topics, closeConnCheck, resultDevice, createObj) {
        console.log("url, userName, password, topics, closeConnCheck, resultDevice, createObj", url, userName, password, topics, closeConnCheck, resultDevice, createObj);
        this.url = url;
        this.isConnected = false;
        this.topics = Array.isArray(topics) ? topics : [topics];
        this.options = {
            clientId: `mqtt_${Math.random().toString(16).slice(3)}`,
            clean: true,
            connectTimeout: 4000,
            username: userName || null,
            password: password || null,
            reconnectPeriod: 1000,
        };
        this.client = mqtt.connect(this.url, this.options);
        this.closeConnCheck = closeConnCheck;
        this.resultDevice = resultDevice;
        this.createObj = createObj;

        this.queue = new BullQueue('mqttQueue', `redis://${process.env.REDIS_HOST}:6379`);
        this.reconnectAttempts = 0;

        this.initialize();
    }

    initialize() {
        if (this.closeConnCheck) {
            this.client.end();
        } else {
            this.setupEventHandlers();
        }
    }

    setupEventHandlers() {
        this.client.on('connect', this.onConnect.bind(this));
        this.client.on('message', this.onMessage.bind(this));
        this.client.on('reconnect', this.onReconnect.bind(this));
        this.client.on('close', this.onClose.bind(this));
        this.client.on('error', this.onError.bind(this));

        this.queue.process(this.processQueue.bind(this));
    }

    onConnect(packet) {
        console.log("\n\nPacket incoming received type ", packet.cmd);
        if (packet.cmd === 'connack') {
            this.isConnected = true;
            console.log("Successfully connected to broker on " + this.url);
            Promise.all(this.topics.map(topic => this.subscribe(topic)))
                .then(() => console.log("All topics subscribed successfully."))
                .catch(err => console.error("Error subscribing to topics:", err));
        } else {
            this.handleConnectionError(packet.cmd);
        }
    }

    subscribe(topic) {
        return new Promise((resolve, reject) => {
            this.client.subscribe(topic, (err) => {
                if (err) {
                    this.isConnected = false;
                    console.log("Subscription error occurred ", err);
                    return reject(err);
                }
                console.log("Subscribed successfully to " + topic + " topic.");
                resolve();
            });
        });
    }

    onMessage(topic, message, packet) {
        console.log('Topic=' + topic);
        this.queue.add({ topic, message, packet });
    }

    async processQueue(job) {
        try {
            let { topic, message, packet } = job.data;
            console.log("as", message, message.data);

            if (this.resultDevice && this.createObj && this.createObj.length > 0) {
                let response = await this.sendMessage(this.createObj.sendingTopic, this.resultDevice, this.createObj, packet);
                this.createObj = null;
                console.log(response ? "Message sent successfully." : "Message sending failed.");
            } else {
                let processMessage = await utilizeMqtt(message);
                console.log(processMessage ? "Message Process Success." : "Message Process Failed.");
            }
        } catch (err) {
            console.error('Error processing message:', err);
        }
    }

    async sendMessage(topic, device, message, packet) {
        console.log('Topic=' + topic + ' Sending message: ', message);
        this.client.publish(topic, JSON.stringify(message));
        return true;
    }

    onClose() {
        this.client.end();
        console.log(`MQTT connection was closed ${this.url}`);
    }

    onReconnect() {
        console.log(`MQTT reconnecting to ${this.url}`);
        this.reconnect();
    }

    onError(err) {
        console.error(`MQTT error occurred ${this.url}:`, err);
        this.reconnect();
    }

    reconnect() {
        if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
            console.error("Max reconnect attempts reached. Stopping reconnection.");
            return;
        }

        this.reconnectAttempts++;
        const timeout = RECONNECTION_TIMEOUT_BASE * Math.pow(2, this.reconnectAttempts);
        setTimeout(() => {
            console.log(`Reconnecting attempt ${this.reconnectAttempts}...`);
            this.client = mqtt.connect(this.url, this.options);
            this.setupEventHandlers();
        }, timeout);
    }
}

module.exports = MQTTConnector;