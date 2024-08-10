/* eslint-disable no-console */
const dotenv = require('dotenv');

dotenv.config({ path: process.env.ENV_PATH || '.env' });

const { MongoClient } = require('mongodb');

let instance = null;
const reconnectionTimeout = 2 * 1000;
class MongoConnector {
	constructor(url, database) {
		if (instance) {
			return instance;
		}
		instance = this;

		this.url = url;
		this.database = database;
		this.isConnected = false;
		this.db = null;
		this.startMongoDB();
	}

	startMongoDB() {
		const _this = this;
		MongoClient.connect(this.url, {
			// reconnectInterval: 10 * 1000,
			// reconnectTries: Number.MAX_VALUE,
			// autoReconnect: true,
			useNewUrlParser: true,
			useUnifiedTopology: true,
		}, (err, client) => {
			if (err) {
				console.log("Mongo Connected Error", err);
				_this.db = null;
				_this.isConnected = false;
				setTimeout(() => {
					_this.startMongoDB();
				}, reconnectionTimeout);
			} else {
				console.log(`Mongo Connected To ${_this.url}/${_this.database}`);
				_this.isConnected = true;
				_this.db = client.db(_this.database);
				_this.db.on('close', _this.onClose.bind(_this));
				_this.db.on('reconnect', _this.onReconnect.bind(_this));
			}
		});
	}

	onClose() {
		console.log(`MongoDB connection was closed ${this.url}`);
	}

	onReconnect() {
		console.log(`MongoDB reconnected ${this.url}`);
	}
}

module.exports = MongoConnector;
