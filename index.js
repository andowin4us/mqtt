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

const os = require('os');
const { exec } = require('child_process');

// Initialize Express app
const app = express();
const server = http.Server(app);

// Middleware setup
app.use(cors());
app.use(helmet({
    dnsPrefetchControl: false,
    frameguard: false,
    ieNoOpen: false,
}));
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

// Resource monitoring setup
const CPU_THRESHOLD = 80; // CPU usage percentage
const MEMORY_THRESHOLD = 80; // Memory usage percentage
const CHECK_INTERVAL = 1000 * 5 * 60; // Check every 60 seconds

// Function to check system resource usage
function checkResourceUsage() {
    const cpuUsage = getCPUUsage();
    const memoryUsage = getMemoryUsage();

    console.log(`Current CPU Usage: ${cpuUsage}%`);
    console.log(`Current Memory Usage: ${memoryUsage}%`);

    if (cpuUsage > CPU_THRESHOLD) {
        console.warn('CPU usage is high! Taking action...');
        restartApplication();
    }

    if (memoryUsage > MEMORY_THRESHOLD) {
        console.warn('Memory usage is high! Taking action...');
        clearMemoryCache();
    }
}

// Function to get CPU usage
function getCPUUsage() {
    const cpus = os.cpus();
    const totalIdle = cpus.reduce((acc, cpu) => acc + cpu.times.idle, 0);
    const totalTick = cpus.reduce((acc, cpu) => acc + Object.values(cpu.times).reduce((a, b) => a + b, 0), 0);
    return ((1 - totalIdle / totalTick) * 100).toFixed(2);
}

// Function to get memory usage
function getMemoryUsage() {
    const { freemem, totalmem } = os;
    return ((1 - freemem() / totalmem()) * 100).toFixed(2);
}

// Function to restart the application (customize this for your environment)
function restartApplication() {
    // Example using PM2
    exec('pm2 restart logsense-backend', (error, stdout, stderr) => {
        if (error) {
            console.error(`Error restarting app: ${error}`);
            return;
        }
        console.log(`App restarted: ${stdout}`);
    });
}

// Function to clear memory cache (customize this as necessary)
function clearMemoryCache() {
    if (global.gc) {
        console.log('Clearing memory...');
        global.gc();
    } else {
        console.warn('Garbage collection is not exposed. Run the app with --expose-gc');
    }
}

// Start monitoring
setInterval(checkResourceUsage, CHECK_INTERVAL);

// Start server
const startServer = async () => {
    try {
        if (!['production', 'development', 'testing'].includes(process.env.NODE_ENV)) {
            console.error(`Invalid NODE_ENV: ${process.env.NODE_ENV}. Valid values are 'production', 'development', or 'testing'.`);
            process.exit(1);
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