const MQTTStatisticsPrivate = {
    "POST /getDeviceLogCount"   : "MQTTStatisticsController.getDeviceLogCount",
    "POST /getDeviceData": "MQTTStatisticsController.getDeviceData",
    "POST /getDeviceReceipeCount": "MQTTStatisticsController.getDeviceReceipeCount",
    "POST /getDashboardDetails": "MQTTStatisticsController.getDashboardDetails",
    "POST /getDashboardBatteryDetails": "MQTTStatisticsController.getDashboardBatteryDetails",
    "POST /getDashboardStateDetails": "MQTTStatisticsController.getDashboardStateDetails",
};
const MQTTStatisticsPublic = MQTTStatisticsPrivate;

module.exports = {
    MQTTStatisticsPublic,
    MQTTStatisticsPrivate,
};