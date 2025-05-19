const mqttFlagRoutes = require('./mqtt.flag.routes');
const mqttMaintainenceRoutes = require('./mqtt.maintainence.routes');
const mqttRoutes = require('./mqtt.routes');
const mqttStatisticsRoutes = require('./mqtt.statistics.routes');
const mqttDeviceRoutes = require('./mqtt.device.routes');
const mqttLocationRoutes = require('./mqtt.location.routes');
const mqttUserRoutes = require('./mqtt.user.routes');

/**
 * Configure application routes
 * @param {Express} app - Express application instance
 */
const configureRoutes = (app) => {
	// Public routes (API routes) - no authentication required
	app.use('/api/flag', mqttFlagRoutes);
	app.use('/api/maintainence', mqttMaintainenceRoutes);
	app.use('/api/mqtt', mqttRoutes);
	app.use('/api/statistics', mqttStatisticsRoutes);
	app.use('/api/device', mqttDeviceRoutes);
	app.use('/api/location', mqttLocationRoutes);
	app.use('/api/user', mqttUserRoutes);
	
	// Private routes - authentication required
	app.use('/private/flag', mqttFlagRoutes);
	app.use('/private/maintainence', mqttMaintainenceRoutes);
	app.use('/private/mqtt', mqttRoutes);
	app.use('/private/statistics', mqttStatisticsRoutes);
	app.use('/private/device', mqttDeviceRoutes);
	app.use('/private/location', mqttLocationRoutes);
	app.use('/private/user', mqttUserRoutes);
};

module.exports = {
  configureRoutes
};