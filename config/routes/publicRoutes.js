const { MQTTPublic } = require("./mqtt.routes");
const { MQTTDevicePublic } = require("./mqttdevice.routes");
const { UserPublic } = require("./user.routes");
const { MqttLoggerTypePublic } = require("./mqttloggertype.routes");

const publicRoutes = {
	...MQTTPublic,
	...MQTTDevicePublic,
	...UserPublic,
	...MqttLoggerTypePublic
};

module.exports = publicRoutes;
