const MqttFlagPrivate = {
    "POST /updateFlag": 'MQTTFlagController.updateFlag',
    "POST /getFlag": 'MQTTFlagController.getFlag',
};
const MqttFlagPublic = MqttFlagPrivate;

module.exports = {
    MqttFlagPublic,
    MqttFlagPrivate,
};