/* eslint-disable no-console */
const dotenv = require('dotenv');
dotenv.config({ path: process.env.ENV_PATH || '.env' });
const mqtt = require('mqtt')
const reconnectionTimeout = 2 * 1000;
const clientId = `mqtt_${Math.random().toString(16).slice(3)}`;
const { utilizeMqtt } = require("../common/mqttCommon");
const Mongo = require('../common/mongo');
const connection = require('../config/connection');

class MQTTConnector {
	constructor(url, userName, password, topic) {
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

		this.startMQTT();
	}

	startMQTT() {
		let _this = this;

        this.client.on('connect', (packet) => {
            console.log("\n\npacket incoming received type ", packet.cmd);
            
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
                this.client.on('message', _this.onMessage.bind(_this));
                this.client.on('reconnect', _this.onReconnect.bind(_this));
                this.client.on('close', _this.onClose.bind(_this));
                this.client.on('error', _this.onError.bind(_this));
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
        console.log('Topic=' + topic + ' Message=' + message, 'packet='+ packet);
        // this.client.publish(this.topic, 'Hello mqtt')
        // this.sendMessage(topic, message)
        // setTimeout(async () => {
            let processMessage = await utilizeMqtt( message );
    
            if( processMessage === true ) {
                console.log("Message Process Success.");
    
                return processMessage;
            } else {
                console.log("Message Process Failed.");
    
                return processMessage;
            }
        // }, 10000);
    }

    sendMessage(topic, message, packet) {
        console.log('Topic=' + topic + ' Message=' + typeof message, 'packet='+ packet);
        this.client.publish(this.topic, 'Hello mqtt')
    }

	onClose() {
		console.log(`MQTT connection was closed ${this.url}`);
	}

	onReconnect() {
		console.log(`MQTT reconnected on ${this.url}`);
	}

    onError() {
		console.log(`MQTT error occurred ${this.url}`);
	}
}

module.exports = MQTTConnector;