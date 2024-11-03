const BullQueueWrapper = require('../common/BullQueueWrapper');
const dotenv = require('dotenv');
dotenv.config({ path: process.env.ENV_PATH || '.env' });

const queueNameRemote = 'remoteMongo';
const queueNameEmail = 'email';
const redisUrl = `redis://${process.env.REDIS_HOST}:6379`;

const bullQueueInstanceRemote = new BullQueueWrapper(queueNameRemote, redisUrl);
const bullQueueInstanceEmail = new BullQueueWrapper(queueNameEmail, redisUrl);

module.exports = {
    bullQueueInstanceRemote,
    bullQueueInstanceEmail
};
