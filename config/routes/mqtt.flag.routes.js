const MqttFlagPrivate = {
    "POST /updateFlag"   : "MQTTFlag.updateFlag",
    "POST /getFlag"   : "MQTTFlag.getData"
};
const MqttFlagPublic = MqttFlagPrivate;

module.exports = {
    MqttFlagPublic,
    MqttFlagPrivate,
};