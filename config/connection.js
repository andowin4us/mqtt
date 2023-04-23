require('dotenv').config(); // load .env file

const mongo = {
	url: process.env.MONGOURI,
	database: process.env.MONGO_DATABASE,
};

const mqtt = {
	url: process.env.MQTT_URL,
};

module.exports = {
	mongo,
	mqtt
};
