const MQTTLoggerType = require('../models/MQTTLoggerType');

const MQTTLoggerTypeController = () => {
    const updateMQTTLoggerType = async (req, res) => {
        console.log('updateMQTTLoggerType', req.body, req.user);
        const result = await MQTTLoggerType.updateData(req.body, req.user);
        return res.status(result.statusCode).json(result);
    }
    const createMQTTLoggerType = async (req, res) => {
        console.log('createMQTTLoggerType', req.body, req.user);
        const result = await MQTTLoggerType.createData(req.body, req.user);
        return res.status(result.statusCode).json(result);
    }
    const getMQTTLoggerType = async (req, res) => {
        console.log('getMQTTLoggerType', req.body, req.user);
        const result = await MQTTLoggerType.getData(req.body, req.user);
        return res.status(result.statusCode).json(result);
    }
    const deleteMQTTLoggerType = async (req, res) => {
        console.log('deleteMQTTLoggerType', req.body, req.user);
        const result = await MQTTLoggerType.deleteData(req.body, req.user);
        return res.status(result.statusCode).json(result);
    }

    return {
        updateMQTTLoggerType,
        createMQTTLoggerType,
        getMQTTLoggerType,
        deleteMQTTLoggerType
    };
};

module.exports = MQTTLoggerTypeController;