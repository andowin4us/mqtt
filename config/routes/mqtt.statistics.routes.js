const MQTTStatisticsPrivate = {
    "POST /getDeviceLogCount"   : "MQTTStatisticsController.getDeviceLogCount",
    "POST /getDeviceData": "MQTTStatisticsController.getDeviceData",
    "POST /getDeviceReceipeCount": "MQTTStatisticsController.getDeviceReceipeCount",
    "POST /getDashboardDetails": "MQTTStatisticsController.getDashboardDetails",
    "POST /getDashboardBatteryDetails": "MQTTStatisticsController.getDashboardBatteryDetails",
};
const MQTTStatisticsPublic = MQTTStatisticsPrivate;

module.exports = {
    MQTTStatisticsPublic,
    MQTTStatisticsPrivate,
};