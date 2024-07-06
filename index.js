const bodyParser = require('body-parser');
const express = require('express');
const helmet = require('helmet');
const http = require('http');
const mapRoutes = require('express-routes-mapper');
const path = require('path');
var cookieParser = require("cookie-parser");
const cors = require('cors');
const config = require('./config/config');
const auth = require('./policies/auth.policy');
const { invokeInialization, invokeDeviceStatusHandler } = require('./config/mqtt');
const environment = process.env.NODE_ENV;
const app = express();
const server = http.Server(app);
const mappedOpenRoutes = mapRoutes(config.publicRoutes, 'controllers/');
const mappedAuthRoutes = mapRoutes(config.privateRoutes, 'controllers/');
app.use(cors());

// secure express app
app.use(helmet({
    dnsPrefetchControl: false,
    frameguard: false,
    ieNoOpen: false,
}));

// parsing the request bodys
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json({ limit: '5mb' }));
app.use(cookieParser());

app.use('/static', express.static(path.join('./private')));

// secure your private routes with jwt authentication middleware
app.all('/private/*', (req, res, next) => auth(req, res, next));
app.all('/api/*', (req, res, next) => defaultUserInfo(req, res, next));

// fill routes for express application
app.use('/api', mappedOpenRoutes);
app.use('/private', mappedAuthRoutes);

function defaultUserInfo(req, res, next) {
    req.user = {
        "id": 1,
        "accesslevel": 1
    };
    return next();
}

app.get('/', (req, res) => {
    console.log("MQTT Home called.");
    res.status(200).json({success: true, statusCode: 200, msg: "MQTT Home Called."});
});

server.listen(config.port, () => {
    if (environment !== 'production' &&
        environment !== 'development' &&
        environment !== 'testing'
    ) {
        // eslint-disable-next-line no-console
        console.error(`NODE_ENV is set to ${environment}, but only production and development are valid.`);
        process.exit(1);
    }

    invokeInialization();
    invokeDeviceStatusHandler();
    console.log(`MQTT server is running on ${config.port}`);
});
