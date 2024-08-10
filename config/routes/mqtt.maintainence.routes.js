const MQTTMaintainencePrivate = {
    'POST /downloadMaintainenceRequest': 'MQTTMaintainenceController.downloadMaintainenceRequest',
    'POST /submitMaintainenceRequest': 'MQTTMaintainenceController.submitMaintainenceRequest',
    'POST /createMaintainenceRequest': 'MQTTMaintainenceController.createMaintainenceRequest',
    'POST /getMaintainenceRequest': 'MQTTMaintainenceController.getMaintainenceRequest',
    'POST /updateMaintainenceRequest': 'MQTTMaintainenceController.updateMaintainenceRequest'
};
const MQTTMaintainencePublic = MQTTMaintainencePrivate;

module.exports = {
    MQTTMaintainencePublic,
    MQTTMaintainencePrivate,
};