const MQTTLocationPrivate = {
    "POST /updateMQTTLocation": "MQTTLocationController.updateMQTTLocation",
    "POST /createMQTTLocation": "MQTTLocationController.createMQTTLocation",
    "POST /getMQTTLocation": "MQTTLocationController.getMQTTLocation",
    "POST /deleteMQTTLocation": "MQTTLocationController.deleteMQTTLocation"
};
let MQTTLocationPublic = MQTTLocationPrivate;

module.exports = {
    MQTTLocationPublic,
    MQTTLocationPrivate,
};