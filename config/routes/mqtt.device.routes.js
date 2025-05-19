const express = require('express');
const router = express.Router();
const MQTTDeviceController = require('../../controllers/MQTTDeviceController')();

router.post('/updateMQTTDevice', MQTTDeviceController.updateMQTTDevice);
router.post('/createMQTTDevice', MQTTDeviceController.createMQTTDevice);
router.post('/getMQTTDevice', MQTTDeviceController.getMQTTDevice);
router.post('/deleteMQTTDevice', MQTTDeviceController.deleteMQTTDevice);
router.post('/assignMQTTDevice', MQTTDeviceController.assignMQTTDevice);
router.post('/relayTriggerOnOrOffMQTTDevice', MQTTDeviceController.relayTriggerOnOrOffMQTTDevice);
router.post('/relayTriggerOnMQTTDevice', MQTTDeviceController.relayTriggerOnMQTTDevice);

module.exports = router;
