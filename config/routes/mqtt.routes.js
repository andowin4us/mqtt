const MQTTPrivate = {
    'POST /getDeviceLogger': 'MQTTController.getDeviceLogger',
    'POST /downloadLogger': 'MQTTController.downloadLogger',
    'POST /getStateLogger': 'MQTTController.getStateLogger',
    'POST /downloadStateLogger': 'MQTTController.downloadStateLogger',
    'POST /getAuditLog': 'MQTTController.getAuditLog',
    'POST /downloadAuditLog': 'MQTTController.downloadAuditLog',
    'POST /getEnergyConsumption': 'MQTTController.getEnergyConsumption',
    'POST /downloadEnergyConsumption': 'MQTTController.downloadEnergyConsumption',
};
const MQTTPublic = MQTTPrivate;

module.exports = {
    MQTTPublic,
    MQTTPrivate,
};