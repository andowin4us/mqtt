const MQTTDeviceConfig = require('../models/MQTTDeviceConfig');

const MQTTDeviceConfigs = () => {
    const updateMQTTDeviceConfig = async (req, res) => {
        console.log('updateMQTTDeviceConfig', req.body, req.user);
        const result = await MQTTDeviceConfig.updateData(req.body, req.user);
        return res.status(result.statusCode).json(result);
    }
    const createMQTTDeviceConfig = async (req, res) => {
        console.log('createMQTTDeviceConfig', req.body, req.user);
        const result = await MQTTDeviceConfig.createData(req.body, req.user);
        return res.status(result.statusCode).json(result);
    }
    const getMQTTDeviceConfig = async (req, res) => {
        console.log('getMQTTDeviceConfig', req.body, req.user);
        const result = await MQTTDeviceConfig.getData(req.body, req.user);
        return res.status(result.statusCode).json(result);
    }
    const deleteMQTTDeviceConfig = async (req, res) => {
        console.log('deleteMQTTDeviceConfig', req.body, req.user);
        const result = await MQTTDeviceConfig.deleteData(req.body, req.user);
        return res.status(result.statusCode).json(result);
    }
    const createReceipeData = async (req, res) => {
        console.log('createReceipeData', req.body, req.user);
        const result = await MQTTDeviceConfig.createReceipeData(req.body, req.user);
        return res.status(result.statusCode).json(result);
    }
    const updateReceipeData = async (req, res) => {
        console.log('updateReceipeData', req.body, req.user);
        const result = await MQTTDeviceConfig.updateReceipeData(req.body, req.user);
        return res.status(result.statusCode).json(result);
    }
    const getReceipeData = async (req, res) => {
        console.log('getReceipeData', req.body, req.user);
        const result = await MQTTDeviceConfig.getReceipeData(req.body, req.user);
        return res.status(result.statusCode).json(result);
    }
    return {
        updateMQTTDeviceConfig,
        createMQTTDeviceConfig,
        getMQTTDeviceConfig,
        deleteMQTTDeviceConfig,
        createReceipeData,
        updateReceipeData,
        getReceipeData
    };
};

module.exports = MQTTDeviceConfigs;