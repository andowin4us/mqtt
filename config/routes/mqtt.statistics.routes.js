const MQTTStatisticsPrivate = {
    "POST /getDeviceLogCount"   : "MQTTStatisticsController.getDeviceLogCount",
    "POST /getDeviceData": "MQTTStatisticsController.getDeviceData",
    "POST /getDeviceReceipeCount": "MQTTStatisticsController.getDeviceReceipeCount",
};
const MQTTStatisticsPublic = MQTTStatisticsPrivate;

module.exports = {
    MQTTStatisticsPublic,
    MQTTStatisticsPrivate,
};