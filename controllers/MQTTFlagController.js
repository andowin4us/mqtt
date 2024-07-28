const MQTTFlag = require('../models/MQTTFlag');

const MQTTFlagController = () => {
    const updateFlag = async (req, res) => {
        console.log('updateFlag', req.body, req.user);
        const result = await MQTTFlag.updateFlag(req.body, req.user);
        return res.status(result.statusCode).json(result);
    };

    return {
        updateFlag
    };
};

module.exports = MQTTFlagController;