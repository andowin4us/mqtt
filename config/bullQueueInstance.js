const BullQueueWrapper = require('../common/BullQueueWrapper');
const dotenv = require('dotenv');

const queueName = 'remoteMongo';
const redisUrl = `redis://${process.env.REDIS_HOST}:6379`;

const bullQueueInstance = new BullQueueWrapper(queueName, redisUrl);

module.exports = bullQueueInstance;
