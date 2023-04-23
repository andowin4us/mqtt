const MQTTPrivate = {
    'POST /getLogger': 'MQTTController.getLogger',
    'POST /downloadLogger': 'MQTTController.downloadLogger'
};
const MQTTPublic = MQTTPrivate;

module.exports = {
    MQTTPublic,
    MQTTPrivate,
};