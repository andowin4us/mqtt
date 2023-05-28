const MQTTUser = require('../models/MQTTUser');

const MQTTUserController = () => {
    const updateUser = async (req, res) => {
        console.log('updateUser', req.body, req.User);
        const result = await MQTTUser.updateData(req.body, req.User);
        return res.status(result.statusCode).json(result);
    }
    const createUser = async (req, res) => {
        console.log('createUser', req.body, req.User);
        const result = await MQTTUser.createData(req.body, req.User);
        return res.status(result.statusCode).json(result);
    }
    const getUser = async (req, res) => {
        console.log('getUser', req.body, req.User);
        const result = await MQTTUser.getData(req.body, req.User);
        return res.status(result.statusCode).json(result);
    }
    const deleteUser = async (req, res) => {
        console.log('deleteUser', req.body, req.User);
        const result = await MQTTUser.deleteData(req.body, req.User);
        return res.status(result.statusCode).json(result);
    }
    const login = async (req, res) => {
        console.log('login', req.body, req.User);
        const result = await MQTTUser.login(req.body, req.User);
        return res.status(result.statusCode).json(result);
    }
    const resetPassword = async (req, res) => {
        console.log('resetPassword', req.body, req.User);
        const result = await MQTTUser.resetPassword(req.body, req.User);
        return res.status(result.statusCode).json(result);
    }
    const logout = async (req, res) => {
        console.log('logout', req.body, req.User);
        const result = await MQTTUser.logout(req.body, req.User);
        return res.status(result.statusCode).json(result);
    }

    return {
        updateUser,
        createUser,
        getUser,
        deleteUser,
        login,
        resetPassword,
        logout
    };
};

module.exports = MQTTUserController;