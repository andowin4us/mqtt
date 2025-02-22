const dotenv = require('dotenv');
const mqtt = require('mqtt');
const { utilizeMqtt } = require('../common/mqttCommon');

dotenv.config({ path: process.env.ENV_PATH || '.env' });

const RECONNECTION_TIMEOUT_BASE = 2000;
const MAX_RECONNECT_ATTEMPTS = 5;

class MQTTConnector {
    static instances = new Map(); // Map to keep track of instances by URL

    constructor(url, userName, password, closeConnCheck, resultDevice, createObj) {
        this.url = url;
        this.isConnected = false;
        this.options = {
            clientId: `mqtt_${Math.random().toString(16).slice(3)}`,
            clean: true,
            connectTimeout: 4000,
            username: userName || null,
            password: password || null,
            reconnectPeriod: 1000,
        };

        this.closeConnCheck = closeConnCheck;
        this.resultDevice = resultDevice;
        this.createObj = createObj;

        this.reconnectAttempts = 0;

        this.client = mqtt.connect(this.url, this.options);
        this.setupEventHandlers();
        this.initialize();
    }

    static initialize(url, userName, password, closeConnCheck, resultDevice, createObj) {
        if (!this.instances.has(url)) {
            const instance = new MQTTConnector(url, userName, password, closeConnCheck, resultDevice, createObj);
            this.instances.set(url, instance);
            console.log(`Created new MQTTConnector instance for URL: ${url}`);
        } else {
            console.log(`MQTTConnector instance already exists for URL: ${url}. Not starting a new one.`);
        }

        return this.instances.get(url);
    }

    initialize() {
        if (this.closeConnCheck && this.isConnected) {
            this.client.end(); // Close if instructed and connected
        }
    }

    setupEventHandlers() {
        this.client.on('connect', this.onConnect.bind(this));
        this.client.on('message', this.onMessage.bind(this));
        this.client.on('reconnect', this.onReconnect.bind(this));
        this.client.on('close', this.onClose.bind(this));
        this.client.on('error', this.onError.bind(this));
    }

    onConnect(packet) {
        console.log("\n\nPacket incoming received type ", packet.cmd);
        if (packet.cmd === 'connack') {
            this.isConnected = true;
            console.log("Successfully connected to broker on " + this.url);
            // Subscribe to all topics with wildcard #
            this.subscribe('#')
                .then(() => console.log("Subscribed to all topics successfully."))
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
                resolve();
            });
        });
    }

    async onMessage(topic, message, packet) {
        console.log('Received message on topic=' + topic);
        try {
            const jsonString = message.toString();
            if (this.resultDevice && this.createObj && this.createObj.length > 0) {
                let response = await this.sendMessage(this.createObj.sendingTopic, this.resultDevice, this.createObj, packet);
                this.createObj = null;
                console.log(response ? "Message sent successfully." : "Message sending failed.");
            } else {
                let processMessage = await utilizeMqtt(jsonString);
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
        MQTTConnector.instances.delete(this.url); // Remove the instance from the map on close
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