const express = require('express');
const router = express.Router();
const MQTTMaintainenceController = require('../../controllers/MQTTMaintainenceController')();

router.post('/downloadMaintainenceRequest', MQTTMaintainenceController.downloadMaintainenceRequest);
router.post('/submitMaintainenceRequest', MQTTMaintainenceController.submitMaintainenceRequest);
router.post('/cancelMaintenanceRequest', MQTTMaintainenceController.cancelMaintenanceRequest);
router.post('/createMaintainenceRequest', MQTTMaintainenceController.createMaintainenceRequest);
router.post('/getMaintainenceRequest', MQTTMaintainenceController.getMaintainenceRequest);
router.post('/updateMaintainenceRequest', MQTTMaintainenceController.updateMaintainenceRequest);

module.exports = router;
