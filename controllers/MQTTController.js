const MQTT = require('../models/MQTTLogger');

const MQTTController = () => {
    const getLogger = async (req, res) => {
        console.log('getLogger logs ', req.body, req.user);
        const result = await MQTT.getLogger(req.body, req.user);
        return res.status(result.statusCode).json(result);
    };
    const downloadLogger = async (req, res) => {
        console.log('download activity logs ', req.body, req.user);
        const result = await MQTT.downloadLogger(req.body, req.user);
        return res.status(result.statusCode).json(result);
    }
    const getAuditLog = async (req, res) => {
        console.log('getAuditLog logs ', req.body, req.user);
        const result = await MQTT.getAuditLog(req.body, req.user);
        return res.status(result.statusCode).json(result);
    };
    return {
        getLogger,
        downloadLogger,
        getAuditLog
    };
}

module.exports = MQTTController;