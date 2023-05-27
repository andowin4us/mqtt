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

    return {
        updateMQTTDeviceConfig,
        createMQTTDeviceConfig,
        getMQTTDeviceConfig,
        deleteMQTTDeviceConfig,
    };
};

module.exports = MQTTDeviceConfigs;