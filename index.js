require('dotenv').config(); // load .env file
const express = require('express');
const http = require('http');
const { configureServer } = require('./config/server.config');
const { configureRoutes } = require('./config/routes/routes.config');
const { setupCluster } = require('./config/cluster.config');
const auth = require('./policies/auth.policy');

const initializeApp = () => {
    const app = express();
    const server = http.Server(app);

    // Configure server middleware
    configureServer(app);

    // Auth middleware
    app.all('/private/*wildcard', auth);
    app.all('/api/*wildcard', (req, res, next) => {
        req.user = { id: 1, accesslevel: 1, userName: "SuperUser" };
        next();
    });

    // Configure routes
    configureRoutes(app);

    // Default route
    app.get('/', (req, res) => {
        res.status(200).json({ 
            success: true, 
            statusCode: 200, 
            msg: 'MQTT Home Called.',
            worker: process.pid
        });
    });

    return server;
};

const startServer = async () => {
    try {
        if (!['production', 'development', 'testing'].includes(process.env.NODE_ENV)) {
            throw new Error(`Invalid NODE_ENV: ${process.env.NODE_ENV}. Valid values are 'production', 'development', or 'testing'.`);
        }

        const server = initializeApp();

        server.listen(process.env.PORT, () => {
            console.log(`HTTP server worker ${process.pid} is running on port ${process.env.PORT}`);
        });

        // Graceful shutdown
        const gracefulShutdown = () => {
            console.log('Received kill signal, shutting down gracefully');
            server.close(() => {
                console.log('Closed out remaining connections');
                process.exit(0);
            });

            setTimeout(() => {
                console.error('Could not close connections in time, forcefully shutting down');
                process.exit(1);
            }, 10000);
        };

        // Listen for shutdown signals
        process.on('SIGTERM', gracefulShutdown);
        process.on('SIGINT', gracefulShutdown);

    } catch (error) {
        console.error('Error starting server:', error);
        process.exit(1);
    }
};

// Start the application with clustering
setupCluster(startServer);