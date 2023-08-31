const MQTTPrivate = {
    'POST /getDeviceLogger': 'MQTTController.getDeviceLogger',
    'POST /getProcessLogger': 'MQTTController.getProcessLogger',
    'POST /downloadLogger': 'MQTTController.downloadLogger'
};
const MQTTPublic = MQTTPrivate;

module.exports = {
    MQTTPublic,
    MQTTPrivate,
};