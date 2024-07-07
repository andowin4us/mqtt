const { MQTTPublic } = require("./mqtt.routes");
const { mqttDevicePublic } = require("./mqttdevice.routes");
const { MqttUserPublic } = require("./mqttuser.routes");
const { MqttLoggerTypePublic } = require("./mqttloggertype.routes");
const { MqttDeviceConfigPublic } = require("./mqtt.deviceconfig.routes");
const { MQTTStatisticsPublic } = require("./mqtt.statistics.routes");
const { MQTTMaintainencePublic } = require("./mqtt.maintainence.routes");

const publicRoutes = {
	...MQTTPublic,
	...mqttDevicePublic,
	...MqttUserPublic,
	...MqttLoggerTypePublic,
	...MqttDeviceConfigPublic,
	...MQTTStatisticsPublic,
	...MQTTMaintainencePublic
};

module.exports = publicRoutes;
