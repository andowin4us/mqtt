/* eslint-disable no-console */
const dotenv = require('dotenv');
dotenv.config({ path: process.env.ENV_PATH || '.env' });
const mqtt = require('mqtt');
const { utilizeMqtt } = require('../common/mqttCommon');

const RECONNECTION_TIMEOUT = 2000; // 2 seconds
const CLIENT_ID = `mqtt_${Math.random().toString(16).slice(3)}`;

class MQTTConnector {
    constructor(url, userName, password, topic, closeConnCheck, resultDevice, createObj) {
        this.url = url;
        this.isConnected = false;
        this.options = {
            clientId: CLIENT_ID,
            clean: true,
            connectTimeout: 4000,
            username: userName || null,
            password: password || null,
            reconnectPeriod: 1000,
        };
        this.topic = topic;
        this.client = mqtt.connect(this.url, this.options);
        this.closeConnCheck = closeConnCheck;
        this.resultDevice = resultDevice;
        this.createObj = createObj;

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
    }

    onConnect(packet) {
        console.log("\n\nPacket incoming received type ", packet.cmd);

        if (packet.cmd === 'connack') {
            this.isConnected = true;
            console.log("Successfully connected to broker on " + this.url);
            this.client.subscribe(this.topic, this.onSubscribe.bind(this));
        } else {
            this.handleConnectionError(packet.cmd);
        }
    }

    handleConnectionError(cmd) {
        this.isConnected = false;
        console.log("Connect event error occurred ", cmd);
        this.reconnect();
    }

    onSubscribe(err) {
        if (err) {
            this.isConnected = false;
            console.log("Subscription error occurred ", err);
            this.reconnect();
        } else {
            console.log("Subscribed successfully to " + this.topic + " topic.");
        }
    }

    async onMessage(topic, message, packet) {
        console.log('Topic=' + topic);

        if (this.resultDevice && this.createObj && this.createObj.length > 0) {
            let response = await this.sendMessage(this.createObj.sendingTopic, this.resultDevice, this.createObj, packet);
            this.createObj = null;
            return response;
        }

        let processMessage = await utilizeMqtt(message);
        console.log(processMessage ? "Message Process Success." : "Message Process Failed.");
        return processMessage;
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

    onError() {
        console.log(`MQTT error occurred ${this.url}`);
        this.reconnect();
    }

    reconnect() {
        setTimeout(() => {
            this.client = mqtt.connect(this.url, this.options);
            this.setupEventHandlers();
        }, RECONNECTION_TIMEOUT);
    }
}

module.exports = MQTTConnector;