const mqttFlagRoutes = require('./mqtt.flag.routes');
const mqttMaintainenceRoutes = require('./mqtt.maintainence.routes');
const mqttRoutes = require('./mqtt.routes');
const mqttStatisticsRoutes = require('./mqtt.statistics.routes');
const mqttDeviceRoutes = require('./mqtt.device.routes');
const mqttLocationRoutes = require('./mqtt.location.routes');
const mqttUserRoutes = require('./mqtt.user.routes');

/**
 * Route configurations for both public and private prefixes
 */
const routes = [
	mqttFlagRoutes,
	mqttMaintainenceRoutes,
	mqttRoutes,
	mqttStatisticsRoutes,
	mqttDeviceRoutes,
	mqttLocationRoutes,
	mqttUserRoutes
];

/**
 * Configure application routes
 * @param {Express} app - Express application instance
 */
const configureRoutes = (app) => {
	['api', 'private'].forEach(prefix => {
		routes.forEach(route => {
			app.use(`/${prefix}`, route);
		});
	});
};

module.exports = {
  configureRoutes
};