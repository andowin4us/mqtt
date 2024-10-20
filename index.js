const express = require('express');
const http = require('http');
const path = require('path');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const mapRoutes = require('express-routes-mapper');
const config = require('./config/config');
const auth = require('./policies/auth.policy');
const { invokeInitialization, scheduleDeviceStatusHandler } = require('./config/mqtt');
const { checkResourceUsage } = require('./helper/resourceMonitor');
const CHECK_INTERVAL = 1000 * 10 * 60; // Check every 5 minutes

const app = express();
const server = http.Server(app);

// Middleware setup
app.use(cors());
app.use(helmet({ dnsPrefetchControl: false, frameguard: false, ieNoOpen: false }));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json({ limit: '5mb' }));
app.use(cookieParser());
app.use('/static', express.static(path.join(__dirname, 'private')));

// Route handlers
const mappedOpenRoutes = mapRoutes(config.publicRoutes, 'controllers/');
const mappedAuthRoutes = mapRoutes(config.privateRoutes, 'controllers/');

// Auth and default user info middleware
app.all('/private/*', auth);
app.all('/api/*', (req, res, next) => {
    req.user = { id: 1, accesslevel: 1, userName: "SuperUser" };
    next();
});

// Register routes
app.use('/api', mappedOpenRoutes);
app.use('/private', mappedAuthRoutes);

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
        server.listen(config.port, () => {
            console.log(`MQTT server is running on port ${config.port}`);
        });
    } catch (error) {
        console.error('Error starting server:', error);
        process.exit(1);
    }
};

// Run the script in Node.js with: node --expose-gc your-script.js
startServer();