const MQTTFlag = require('../models/MQTTFlag');

const MQTTFlagController = () => {
    const updateFlag = async (req, res) => {
        console.log('updateFlag', req.body, req.user);
        const result = await MQTTFlag.updateFlag(req.body, req.user);
        return res.status(result.statusCode).json(result);
    };
    const getFlag = async (req, res) => {
        console.log('getFlag', req.body, req.user);
        const result = await MQTTFlag.getData(req.body, req.user);
        return res.status(result.statusCode).json(result);
    };

    return {
        updateFlag,
        getFlag
    };
};

module.exports = MQTTFlagController;