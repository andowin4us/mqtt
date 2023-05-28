const MqttUserPrivate = {
    "POST /updateUser": "MQTTUserController.updateUser",
    "POST /createUser": "MQTTUserController.createUser",
    "POST /getUser": "MQTTUserController.getUser",
    "POST /deleteUser": "MQTTUserController.deleteUser",
    "POST /login": "MQTTUserController.login",
    "POST /resetPassword": "MQTTUserController.resetPassword",
    "POST /logout": "MQTTUserController.logout"
};
const MqttUserPublic = MqttUserPrivate;

module.exports = {
    MqttUserPublic,
    MqttUserPrivate,
};