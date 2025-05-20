require('dotenv').config();
const { invokeInitialization, scheduleDeviceStatusHandler } = require('./config/mqtt');
const { checkResourceUsage } = require('./helper/resourceMonitor');

const CHECK_INTERVAL = 1000 * 10 * 60; // Check every 10 minutes

// Set app name for resource monitoring
process.env.APP_NAME = 'mqtt-processor';

const startMQTTProcessor = async () => {
    try {
        if (!['production', 'development', 'testing'].includes(process.env.NODE_ENV)) {
            throw new Error(`Invalid NODE_ENV: ${process.env.NODE_ENV}. Valid values are 'production', 'development', or 'testing'.`);
        }

        console.log('Starting MQTT processor...');
        
        // Initialize MQTT
        await invokeInitialization();
        await scheduleDeviceStatusHandler();

        // Start monitoring
        setInterval(checkResourceUsage, CHECK_INTERVAL);

        // Handle graceful shutdown
        const gracefulShutdown = () => {
            console.log('MQTT processor received shutdown signal');
            process.exit(0);
        };

        process.on('SIGTERM', gracefulShutdown);
        process.on('SIGINT', gracefulShutdown);

    } catch (error) {
        console.error('Error in MQTT processor:', error);
        process.exit(1);
    }
};

// Start the MQTT processor
startMQTTProcessor(); 