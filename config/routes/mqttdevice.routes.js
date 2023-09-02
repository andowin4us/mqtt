const mqttDevicePrivate = {
    "POST /updateMQTTDevice"   : "MQTTDeviceController.updateMQTTDevice",
    "POST /createMQTTDevice": "MQTTDeviceController.createMQTTDevice",
    "POST /getMQTTDevice": "MQTTDeviceController.getMQTTDevice",
    "POST /deleteMQTTDevice": "MQTTDeviceController.deleteMQTTDevice",
    "POST /assignMQTTDevice": "MQTTDeviceController.assignMQTTDevice",
};
let mqttDevicePublic = mqttDevicePrivate;

module.exports = {
    mqttDevicePublic,
    mqttDevicePrivate,
};