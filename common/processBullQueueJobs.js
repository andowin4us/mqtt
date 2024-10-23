const bullQueueInstance = require('../config/bullQueueInstance');

bullQueueInstance.processJobs(async (job) => {
    try {
        // Clear the queue before processing the job
        await bullQueueInstance.clear();
        
        console.log(`Processing job ${job.id}`, job.data);
        // Simulate job processing (replace with your actual logic)
        return Promise.resolve();
    } catch (error) {
        console.error(`Failed to process job ${job.id}:`, error);
        throw error; // Throw the error to let Bull know the job failed
    }
});