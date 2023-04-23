const { ActivityLoggerPublic } = require("./activityLogger.routes");

const publicRoutes = {
	...ActivityLoggerPublic
};

module.exports = publicRoutes;
