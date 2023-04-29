/* eslint-disable no-console */
const User = require('../models/User');

const UserController = () => {
    //Sender SMTP
    const updateUser = async (req, res) => {
        console.log('updateUser', req.body, req.User);
        const result = await User.updateData(req.body, req.User);
        return res.status(result.statusCode).json(result);
    }
    const createUser = async (req, res) => {
        console.log('createUser', req.body, req.User);
        const result = await User.createData(req.body, req.User);
        return res.status(result.statusCode).json(result);
    }
    const getUser = async (req, res) => {
        console.log('getUser', req.body, req.User);
        const result = await User.getData(req.body, req.User);
        return res.status(result.statusCode).json(result);
    }
    const deleteUser = async (req, res) => {
        console.log('deleteUser', req.body, req.User);
        const result = await User.deleteData(req.body, req.User);
        return res.status(result.statusCode).json(result);
    }
    const login = async (req, res) => {
        console.log('login', req.body, req.User);
        const result = await User.login(req.body, req.User);
        return res.status(result.statusCode).json(result);
    }

    return {
        updateUser,
        createUser,
        getUser,
        deleteUser,
        login
    };
};

module.exports = UserController;