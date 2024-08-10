/* eslint-disable no-console */
const dotenv = require('dotenv');
dotenv.config({ path: process.env.ENV_PATH || '.env' });
const mqtt = require('mqtt');
const reconnectionTimeout = 2 * 1000;
const clientId = `mqtt_${Math.random().toString(16).slice(3)}`;
const { utilizeMqtt } = require("../common/mqttCommon");
const amqp = require('amqplib');

class MQTTConnector {
	constructor(url, userName, password, topic, closeConnCheck, resultDevice, createObj) {
		this.url = url;
		this.isConnected = false;
        this.options = {
            clientId: clientId,
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

		this.startMQTT();
	}

	startMQTT() {
		let _this = this;

        if( this.closeConnCheck === true ) {
            _this.client.end();
        }

        this.client.on('connect', (packet) => {
            console.log("\n\npacket incoming received type ", packet.cmd);
            
            if( this.closeConnCheck !== true ) {
                if(packet.cmd !== "connack") {
                    _this.isConnected = false;
                    console.log("onConnect events error occured ", packet.cmd);
                    setTimeout(() => {
                        _this.startMQTT();
                    }, reconnectionTimeout);
                } else {                
                    _this.isConnected = true;
                    console.log("Successfully connected to broker on "+this.url+" events receiving started.");
                    this.client.subscribe(this.topic, _this.onSubscribe.bind(_this));
                    // this.client.subscribe("deviceConfiguration", _this.onSubscribe.bind(_this));
                    this.client.on('message', _this.onMessage.bind(_this));
                    this.client.on('reconnect', _this.onReconnect.bind(_this));
                    this.client.on('close', _this.onClose.bind(_this));
                    this.client.on('error', _this.onError.bind(_this));
                }
            }
        });
	}

    onSubscribe(err) {
		let _this = this;        
        if (err) {
            _this.isConnected = false;
            console.log("onSubscribe events error occured ",err);
            setTimeout(() => {
                _this.startMQTT();
            }, reconnectionTimeout);
        } else {
            console.log("onSubscribe events success for "+this.topic+" topic.");
        }
	}

    async onMessage(topic, message, packet) {
        const rabbitMQ = await amqp.connect('amqp://localhost');
        const channel = await rabbitMQ.createChannel();
        await channel.assertQueue('mqtt_events', { durable: true });

        console.log('Topic=' + topic + ' Message=' + message, 'packet='+ packet);
        // this.client.publish(this.topic, 'Hello mqtt')
        // this.sendMessage(topic, message)
        // setTimeout(async () => {
        if(this.resultDevice && this.createObj && this.createObj.length > 0) {
            let response = await this.sendMessage(this.createObj.sendingTopic, this.resultDevice, this.createObj, packet);
            this.createObj = null;
            return response;
        }
        await channel.sendToQueue('mqtt_events', Buffer.from(JSON.stringify({ topic, message })));
        let processMessage = await utilizeMqtt( message, channel );

        if( processMessage === true ) {
            console.log("Message Process Success.");

            return processMessage;
        } else {
            console.log("Message Process Failed.");

            return processMessage;
        }
        // }, 10000);
    }

    async sendMessage(topic, device, message, packet) {
        // let messageBe;
        // let dataKeys = Object.keys(message);
        // for (let i = 0; i < dataKeys.length; i++) {
        //     // if (dataKeys[i] !== 'id') {
        //        if (dataKeys[i] !== 'deviceId') {
        //             if (dataKeys[i] !== 'sendingTopic') {
        //                 if (dataKeys[i] !== 'logCount') {
        //                     if (dataKeys[i] !== 'receipeId') {
        //                         if (messageBe !== undefined) {
        //                             messageBe = `${messageBe},` + `${message[Object.keys(message)[i]]}`;
        //                         } else {
        //                             messageBe = `${message[Object.keys(message)[i]]}`;
        //                         }
        //                     }
        //                 }
        //             }
        //         }
        //     // }
        // }
        let sendingMessage = message;
        // let sendingMessage = `mac_id:${device.mqttMacId},receipe_id:${message.receipeId},N:${message.logCount},Data:${messageBe}`;
        console.log('Topic='+' Relay/Control'+' sendingMessage= '+sendingMessage);

        this.client.publish("Relay/Control", sendingMessage);
        return true;
    }

	onClose() {
        this.client.end();
		console.log(`MQTT connection was closed ${this.url}`);
	}

	onReconnect() {
        this.client.end();
        this.client = mqtt.connect(this.url, this.options);
		console.log(`MQTT reconnected on ${this.url}`);
	}

    onError() {
        this.client.end();
		console.log(`MQTT error occurred ${this.url}`);
	}
}

module.exports = MQTTConnector;