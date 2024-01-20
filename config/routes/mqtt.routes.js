const MQTTPrivate = {
    'POST /getDeviceLogger': 'MQTTController.getDeviceLogger',
    'POST /downloadLogger': 'MQTTController.downloadLogger',
    'POST /getAuditLog': 'MQTTController.getAuditLog'
};
const MQTTPublic = MQTTPrivate;

module.exports = {
    MQTTPublic,
    MQTTPrivate,
};