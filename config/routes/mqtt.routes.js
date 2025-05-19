const express = require('express');
const router = express.Router();
const MQTTController = require('../../controllers/MQTTController')();

router.post('/getDeviceLogger', MQTTController.getDeviceLogger);
router.post('/downloadLogger', MQTTController.downloadLogger);
router.post('/getStateLogger', MQTTController.getStateLogger);
router.post('/downloadStateLogger', MQTTController.downloadStateLogger);
router.post('/getAuditLog', MQTTController.getAuditLog);
router.post('/downloadAuditLog', MQTTController.downloadAuditLog);
router.post('/getEnergyConsumption', MQTTController.getEnergyConsumption);
router.post('/downloadEnergyConsumption', MQTTController.downloadEnergyConsumption);

module.exports = router;
