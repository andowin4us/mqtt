const cluster = require('cluster');
const os = require('os');

const setupCluster = (callback) => {
    if (cluster.isMaster) {
        console.log(`Master process ${process.pid} is running`);

        // Get the number of CPU cores
        const numCPUs = os.cpus().length;

        // Fork workers based on CPU cores
        for (let i = 0; i < numCPUs; i++) {
            cluster.fork();
        }

        cluster.on('exit', (worker, code, signal) => {
            console.log(`Worker ${worker.process.pid} died. Restarting...`);
            cluster.fork();
        });

        // Handle graceful shutdown
        process.on('SIGTERM', () => {
            console.log('Master received SIGTERM. Shutting down gracefully...');
            Object.values(cluster.workers).forEach(worker => {
                worker.send('shutdown');
            });
        });

    } else {
        console.log(`Worker ${process.pid} started`);
        callback();

        // Handle worker shutdown
        process.on('message', msg => {
            if (msg === 'shutdown') {
                console.log(`Worker ${process.pid} shutting down...`);
                process.exit(0);
            }
        });
    }
};

module.exports = { setupCluster }; 