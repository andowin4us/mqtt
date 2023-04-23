const { ActivityLoggerPublic } = require("./activityLogger.routes");
const { MQTTPublic } = require("./mqtt.routes");
const { MQTTDevicePublic } = require("./mqttdevice.routes");

const publicRoutes = {
	...ActivityLoggerPublic,
	...MQTTPublic,
	...MQTTDevicePublic,
};

module.exports = publicRoutes;
