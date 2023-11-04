const MQTTPrivate = {
    'POST /getDeviceLogger': 'MQTTController.getDeviceLogger',
    'POST /downloadLogger': 'MQTTController.downloadLogger'
};
const MQTTPublic = MQTTPrivate;

module.exports = {
    MQTTPublic,
    MQTTPrivate,
};