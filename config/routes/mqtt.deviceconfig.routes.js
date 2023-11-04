const MqttDeviceConfigPrivate = {
    "POST /updateMQTTDeviceConfig"   : "MQTTDeviceConfig.updateMQTTDeviceConfig",
    "POST /createMQTTDeviceConfig": "MQTTDeviceConfig.createMQTTDeviceConfig",
    "POST /getMQTTDeviceConfig": "MQTTDeviceConfig.getMQTTDeviceConfig",
    "POST /deleteMQTTDeviceConfig": "MQTTDeviceConfig.deleteMQTTDeviceConfig",
    "POST /createReceipeData"   : "MQTTDeviceConfig.createReceipeData",
    "POST /updateReceipeData": "MQTTDeviceConfig.updateReceipeData",
    "POST /getReceipeData": "MQTTDeviceConfig.getReceipeData",
};
const MqttDeviceConfigPublic = MqttDeviceConfigPrivate;

module.exports = {
    MqttDeviceConfigPublic,
    MqttDeviceConfigPrivate,
};