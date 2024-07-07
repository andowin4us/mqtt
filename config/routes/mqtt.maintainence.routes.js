const MQTTMaintainencePrivate = {
    'POST /downloadMaintainenceRequest': 'MQTTMaintainenceController.downloadMaintainenceRequest',
    'POST /submitMaintainenceRequest': 'MQTTMaintainenceController.submitMaintainenceRequest',
    'POST /createMaintainenceRequest': 'MQTTMaintainenceController.createMaintainenceRequest',
    'POST /getMaintainenceRequest': 'MQTTMaintainenceController.getMaintainenceRequest'
};
const MQTTMaintainencePublic = MQTTMaintainencePrivate;

module.exports = {
    MQTTMaintainencePublic,
    MQTTMaintainencePrivate,
};