const { MQTTPublic } = require("./mqtt.routes");
const { MQTTDevicePublic } = require("./mqttdevice.routes");
const { MqttUserPublic } = require("./mqttuser.routes");
const { MQTTStatisticsPublic } = require("./mqtt.statistics.routes");
const { MQTTMaintainencePublic } = require("./mqtt.maintainence.routes");
const { MqttFlagPublic } = require("./mqtt.flag.routes");
const { MQTTLocationPublic } = require("./mqttlocation.routes");

const privateRoutes = {
	...MQTTPublic,
	...MQTTDevicePublic,
	...MqttUserPublic,
	...MQTTStatisticsPublic,
	...MQTTMaintainencePublic,
	...MqttFlagPublic,
	...MQTTLocationPublic
};

module.exports = privateRoutes;
