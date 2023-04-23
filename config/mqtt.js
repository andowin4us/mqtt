const MQTT = require('../helper/mqtt');
const connection = require('./connection');

module.exports = new MQTT(connection.mqtt.url);
