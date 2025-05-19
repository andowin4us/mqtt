const express = require('express');
const router = express.Router();
const MQTTFlagController = require('../../controllers/MQTTFlagController')();

router.post('/updateFlag', MQTTFlagController.updateFlag);
router.post('/getFlag', MQTTFlagController.getFlag);

module.exports = router;
