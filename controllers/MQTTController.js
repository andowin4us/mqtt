const MQTT = require('../models/MQTTLogger');

const MQTTController = () => {
    const getDeviceLogger = async (req, res) => {
        console.log('getDeviceLogger logs ', req.body, req.user);
        const result = await MQTT.getDeviceLogger(req.body, req.user);
        return res.status(result.statusCode).json(result);
    };
    const getStateLogger = async (req, res) => {
        console.log('getStateLogger logs ', req.body, req.user);
        const result = await MQTT.getStateLogger(req.body, req.user);
        return res.status(result.statusCode).json(result);
    };
    const downloadLogger = async (req, res) => {
        console.log('download activity logs ', req.body, req.user);
        const result = await MQTT.downloadLogger(req.body, req.user);
        return res.status(result.statusCode).json(result);
    };
    const downloadStateLogger = async (req, res) => {
        console.log('downloadStateLogger activity logs ', req.body, req.user);
        const result = await MQTT.downloadStateLogger(req.body, req.user);
        return res.status(result.statusCode).json(result);
    };
    const getAuditLog = async (req, res) => {
        console.log('getAuditLog logs ', req.body, req.user);
        const result = await MQTT.getAuditLog(req.body, req.user);
        return res.status(result.statusCode).json(result);
    };
    const downloadAuditLog = async (req, res) => {
        console.log('downloadAuditLog', req.body, req.user);
        const result = await MQTT.downloadAuditLog(req.body, req.user);
        return res.status(result.statusCode).json(result);
    }
    return {
        getDeviceLogger,
        getStateLogger,
        downloadLogger,
        downloadStateLogger,
        getAuditLog,
        downloadAuditLog
    };
}

module.exports = MQTTController;