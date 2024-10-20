const BullQueue = require('bull');

class BullQueueWrapper {
    constructor(queueName, redisUrl) {
        this.queue = new BullQueue(queueName, redisUrl);
    }

    addJob(data) {
        return this.queue.add(data);
    }

    processJobs(processFunction) {
        this.queue.process(processFunction);
    }

    async close() {
        await this.queue.close();
        this.isConnected = false;
        console.log(`Queue ${this.queue.name} has been closed.`);
    }

    async clear() {
        await this.queue.empty();
        console.log(`Queue ${this.queue.name} has been cleared.`);
    }
}

module.exports = BullQueueWrapper;
