const MQTTLocation = require('../models/MQTTLocation');

const MQTTLocationController = () => {
    const updateMQTTLocation = async (req, res) => {
        console.log('updateMQTTLocation', req.body, req.user);
        const result = await MQTTLocation.updateData(req.body, req.user);
        return res.status(result.statusCode).json(result);
    }
    const createMQTTLocation = async (req, res) => {
        console.log('createMQTTLocation', req.body, req.user);
        const result = await MQTTLocation.createData(req.body, req.user);
        return res.status(result.statusCode).json(result);
    }
    const getMQTTLocation = async (req, res) => {
        console.log('getMQTTLocation', req.body, req.user);
        const result = await MQTTLocation.getData(req.body, req.user);
        return res.status(result.statusCode).json(result);
    }
    const deleteMQTTLocation = async (req, res) => {
        console.log('deleteMQTTLocation', req.body, req.user);
        const result = await MQTTLocation.deleteData(req.body, req.user);
        return res.status(result.statusCode).json(result);
    }

    return {
        updateMQTTLocation,
        createMQTTLocation,
        getMQTTLocation,
        deleteMQTTLocation
    };
};

module.exports = MQTTLocationController;