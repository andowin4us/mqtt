const express = require('express');
const router = express.Router();
const MQTTUserController = require('../../controllers/MQTTUserController')();

router.post('/updateUser', MQTTUserController.updateUser);
router.post('/createUser', MQTTUserController.createUser);
router.post('/getUser', MQTTUserController.getUser);
router.post('/deleteUser', MQTTUserController.deleteUser);
router.post('/login', MQTTUserController.login);
router.post('/resetPassword', MQTTUserController.resetPassword);
router.post('/logout', MQTTUserController.logout);
router.post('/getUserAsRole', MQTTUserController.getUserAsRole);

module.exports = router;
