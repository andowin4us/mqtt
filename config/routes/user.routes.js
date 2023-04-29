const userPrivate = {
    "POST /updateUser": "UserController.updateUser",
    "POST /createUser": "UserController.createUser",
    "POST /getUser": "UserController.getUser",
    "POST /deleteUser": "UserController.deleteUser"
};
const userPublic = userPrivate;

module.exports = {
    userPublic,
    userPrivate,
};