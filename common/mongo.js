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
			const client = await MongoClient.connect(this.url, {});

			console.log(`MongoDB Connected To ${this.url}/${this.database}`);

			this.isConnected = true;
			this.db = client.db(this.database);

		} catch (err) {
			console.error("MongoDB Connection Error", err);
			this.isConnected = false;
			this.db = null;
			setTimeout(() => this.startMongoDB(), RECONNECTION_TIMEOUT);
		}
	}
}

module.exports = MongoConnector;
