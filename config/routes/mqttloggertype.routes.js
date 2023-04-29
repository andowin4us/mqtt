const MqttLoggerTypePrivate = {
    "POST /updateMQTTLoggerType": "MQTTLoggerTypeController.updateMQTTLoggerType",
    "POST /createMQTTLoggerType": "MQTTLoggerTypeController.createMQTTLoggerType",
    "POST /getMQTTLoggerType": "MQTTLoggerTypeController.getMQTTLoggerType",
    "POST /deleteMQTTLoggerType": "MQTTLoggerTypeController.deleteMQTTLoggerType"
};
const MqttLoggerTypePublic = MqttLoggerTypePrivate;

module.exports = {
    MqttLoggerTypePublic,
    MqttLoggerTypePrivate,
};