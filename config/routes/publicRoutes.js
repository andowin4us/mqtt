const { MQTTPublic } = require("./mqtt.routes");
const { MQTTDevicePublic } = require("./mqttdevice.routes");
const { MqttUserPublic } = require("./mqttuser.routes");
const { MqttLoggerTypePublic } = require("./mqttloggertype.routes");
const { MqttDeviceConfigPublic } = require("./mqtt.deviceconfig.routes");

const publicRoutes = {
	...MQTTPublic,
	...MQTTDevicePublic,
	...MqttUserPublic,
	...MqttLoggerTypePublic,
	...MqttDeviceConfigPublic
};

module.exports = publicRoutes;
