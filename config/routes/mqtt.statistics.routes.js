const express = require('express');
const router = express.Router();
const MQTTStatisticsController = require('../../controllers/MQTTStatisticsController')();

router.post('/getDeviceLogCount', MQTTStatisticsController.getDeviceLogCount);
router.post('/getDeviceData', MQTTStatisticsController.getDeviceData);
router.post('/getDeviceReceipeCount', MQTTStatisticsController.getDeviceReceipeCount);
router.post('/getDashboardDetails', MQTTStatisticsController.getDashboardDetails);
router.post('/getDashboardBatteryDetails', MQTTStatisticsController.getDashboardBatteryDetails);
router.post('/getDashboardStateDetails', MQTTStatisticsController.getDashboardStateDetails);
router.post('/getDashboardGraphDetails', MQTTStatisticsController.getDashboardGraphDetails);

module.exports = router;
