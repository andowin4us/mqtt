const { MQTTPublic } = require("./mqtt.routes");
const { mqttDevicePublic } = require("./mqttdevice.routes");
const { MqttUserPublic } = require("./mqttuser.routes");
const { MqttLoggerTypePublic } = require("./mqttloggertype.routes");
const { MqttDeviceConfigPublic } = require("./mqtt.deviceconfig.routes");

const publicRoutes = {
	...MQTTPublic,
	...mqttDevicePublic,
	...MqttUserPublic,
	...MqttLoggerTypePublic,
	...MqttDeviceConfigPublic
};

module.exports = publicRoutes;
