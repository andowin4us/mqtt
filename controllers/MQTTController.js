const MQTT = require('../models/MQTTLogger');

const MQTTController = () => {
    const getDeviceLogger = async (req, res) => {
        console.log('getDeviceLogger logs ', req.body, req.user);
        const result = await MQTT.getDeviceLogger(req.body, req.user);
        return res.status(result.statusCode).json(result);
    };
    const getProcessLogger = async (req, res) => {
        console.log('getProcessLogger logs ', req.body, req.user);
        const result = await MQTT.getProcessLogger(req.body, req.user);
        return res.status(result.statusCode).json(result);
    };
    const downloadLogger = async (req, res) => {
        const result = await MQTT.downloadLogger(req.body, req.user);
        return res.status(result.statusCode).json(result);
    }
    const getAuditLog = async (req, res) => {
        const result = await MQTT.getAuditLog(req.body, req.user);
        return res.status(result.statusCode).json(result);
    };
    return {
        getDeviceLogger,
        getProcessLogger,
        downloadLogger,
        getAuditLog
    };
}

module.exports = MQTTController;