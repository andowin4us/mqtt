const express = require('express');
const router = express.Router();
const MQTTLocationController = require('../../controllers/MQTTLocationController')();

router.post('/updateMQTTLocation', MQTTLocationController.updateMQTTLocation);
router.post('/createMQTTLocation', MQTTLocationController.createMQTTLocation);
router.post('/getMQTTLocation', MQTTLocationController.getMQTTLocation);
router.post('/deleteMQTTLocation', MQTTLocationController.deleteMQTTLocation);

module.exports = router;
