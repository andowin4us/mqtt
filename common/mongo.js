/* eslint-disable no-console */
const dotenv = require('dotenv');
const { MongoClient } = require('mongodb');

dotenv.config({ path: process.env.ENV_PATH || '.env' });

const RECONNECTION_TIMEOUT = 2000;

class MongoConnector {
	static instance = null;

	constructor(url, database) {
		if (MongoConnector.instance) {
			return MongoConnector.instance;
		}

		MongoConnector.instance = this;

		this.url = url;
		this.database = database;
		this.isConnected = false;
		this.db = null;

		this.startMongoDB();
	}

	async startMongoDB() {
		try {
			const client = await MongoClient.connect(this.url, {
				useNewUrlParser: true,
				useUnifiedTopology: true,
			});

			console.log(`MongoDB Connected To ${this.url}/${this.database}`);

			this.isConnected = true;
			this.db = client.db(this.database);
			this.db.on('close', this.onClose);
			this.db.on('reconnect', this.onReconnect);

		} catch (err) {
			console.error("MongoDB Connection Error", err);
			this.isConnected = false;
			this.db = null;
			setTimeout(() => this.startMongoDB(), RECONNECTION_TIMEOUT);
		}
	}

	onClose = () => {
		console.log(`MongoDB connection was closed ${this.url}`);
	}

	onReconnect = () => {
		console.log(`MongoDB reconnected ${this.url}`);
	}
}

module.exports = MongoConnector;
