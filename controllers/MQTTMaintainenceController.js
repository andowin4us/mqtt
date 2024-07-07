const MQTTMaintainence = require('../models/MQTTMaintainence');

const MQTTMaintainenceController = () => {
    const getMaintainenceRequest = async (req, res) => {
        console.log('getMaintainenceRequest logs ', req.body, req.user);
        const result = await MQTTMaintainence.getMaintainenceRequest(req.body, req.user);
        return res.status(result.statusCode).json(result);
    };
    const createMaintainenceRequest = async (req, res) => {
        console.log('createMaintainenceRequest logs ', req.body, req.user);
        const result = await MQTTMaintainence.createMaintainenceRequest(req.body, req.user);
        return res.status(result.statusCode).json(result);
    };
    const downloadMaintainenceRequest = async (req, res) => {
        console.log('downloadMaintainenceRequest logs ', req.body, req.user);
        const result = await MQTTMaintainence.downloadMaintainenceRequest(req.body, req.user);
        return res.status(result.statusCode).json(result);
    };
    const submitMaintainenceRequest = async (req, res) => {
        console.log('submitMaintainenceRequest logs ', req.body, req.user);
        const result = await MQTTMaintainence.submitMaintainenceRequest(req.body, req.user);
        return res.status(result.statusCode).json(result);
    };
    
    return {
        getMaintainenceRequest,
        createMaintainenceRequest,
        downloadMaintainenceRequest,
        submitMaintainenceRequest
    };
}

module.exports = MQTTMaintainenceController;