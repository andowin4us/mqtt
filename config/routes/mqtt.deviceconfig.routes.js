const MqttDeviceConfigPrivate = {
    "POST /updateMQTTDeviceConfig"   : "MQTTDeviceConfig.updateMQTTDeviceConfig",
    "POST /createMQTTDeviceConfig": "MQTTDeviceConfig.createMQTTDeviceConfig",
    "POST /getMQTTDeviceConfig": "MQTTDeviceConfig.getMQTTDeviceConfig",
    "POST /deleteMQTTDeviceConfig": "MQTTDeviceConfig.deleteMQTTDeviceConfig"
};
const MqttDeviceConfigPublic = MqttDeviceConfigPrivate;

module.exports = {
    MqttDeviceConfigPublic,
    MqttDeviceConfigPrivate,
};