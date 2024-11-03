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
        this.queue.on('completed', (job, result) => {
            console.log(`Job ${job.id} completed with result:`, result);
        });
        this.queue.on('failed', (job, err) => {
            console.error(`Job ${job.id} failed with error:`, err);
        });
    }

    async close() {
        await this.queue.close();
        console.log(`Queue ${this.queue.name} has been closed.`);
    }

    async clear() {
        await this.queue.empty();
        console.log(`Queue ${this.queue.name} has been cleared.`);
    }
}

module.exports = BullQueueWrapper;
