require('dotenv').config(); // load .env file
const express = require('express');
const http = require('http');
const path = require('path');
const compression = require('compression');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const auth = require('./policies/auth.policy');
const { configureRoutes } = require('./config/routes/routes.config');
const { invokeInitialization, scheduleDeviceStatusHandler } = require('./config/mqtt');
const { checkResourceUsage } = require('./helper/resourceMonitor');
const CHECK_INTERVAL = 1000 * 10 * 60; // Check every 5 minutes

const app = express();
const server = http.Server(app);
const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 1000, // limit each IP to 1000 requests/minute
});

// Middleware setup
app.use(cors());
app.use(helmet({ dnsPrefetchControl: false, frameguard: false, ieNoOpen: false }));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(compression());
app.use(limiter);

app.use('/static', express.static(path.join(__dirname, 'private')));

// Auth and default user info middleware
app.all('/private/*wildcard', auth);
app.all('/api/*wildcard', (req, res, next) => {
    req.user = { id: 1, accesslevel: 1, userName: "SuperUser" };
    next();
});

// Configure all routes (both public and private)
configureRoutes(app);

// Default route
app.get('/', (req, res) => {
    res.status(200).json({ success: true, statusCode: 200, msg: 'MQTT Home Called.' });
});

// Start monitoring
setInterval(checkResourceUsage, CHECK_INTERVAL);

// Start server
const startServer = async () => {
    try {
        if (!['production', 'development', 'testing'].includes(process.env.NODE_ENV)) {
            throw new Error(`Invalid NODE_ENV: ${process.env.NODE_ENV}. Valid values are 'production', 'development', or 'testing'.`);
        }

        await invokeInitialization();
        await scheduleDeviceStatusHandler();
        server.listen(process.env.PORT, () => {
            console.log(`MQTT server is running on port ${process.env.PORT}`);
        });
    } catch (error) {
        console.error('Error starting server:', error);
        process.exit(1);
    }
};

// Run the script in Node.js with: node --expose-gc your-script.js
startServer();