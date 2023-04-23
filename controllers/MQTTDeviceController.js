/* eslint-disable no-console */
const MQTTDevice = require('../models/MQTTDevice');

// eslint-disable-next-line no-unused-vars

const MQTTDeviceController = () => {
    //Sender SMTP
    const updateMQTTDevice = async (req, res) => {
        console.log('updateMQTTDevice', req.body, req.user);
        const result = await MQTTDevice.updateData(req.body, req.user);
        return res.status(result.statusCode).json(result);
    }
    const createMQTTDevice = async (req, res) => {
        console.log('createMQTTDevice', req.body, req.user);
        const result = await MQTTDevice.createData(req.body, req.user);
        return res.status(result.statusCode).json(result);
    }
    const getMQTTDevice = async (req, res) => {
        console.log('getMQTTDevice', req.body, req.user);
        const result = await MQTTDevice.getData(req.body, req.user);
        return res.status(result.statusCode).json(result);
    }
    const deleteMQTTDevice = async (req, res) => {
        console.log('deleteMQTTDevice', req.body, req.user);
        const result = await MQTTDevice.deleteData(req.body, req.user);
        return res.status(result.statusCode).json(result);
    }

    return {
        updateMQTTDevice,
        createMQTTDevice,
        getMQTTDevice,
        deleteMQTTDevice
    };
};

module.exports = MQTTDeviceController;