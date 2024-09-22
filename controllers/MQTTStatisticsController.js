const MQTT = require('../models/MQTTStatistics');

const MQTTStatisticsController = () => {
    const getDeviceLogCount = async (req, res) => {
        console.log('getDeviceLogCount logs ', req.body, req.user);
        const result = await MQTT.getDeviceLogCount(req.body, req.user);
        return res.status(result.statusCode).json(result);
    };
    const getDeviceData = async (req, res) => {
        console.log('getDeviceData logs ', req.body, req.user);
        const result = await MQTT.getDeviceData(req.body, req.user);
        return res.status(result.statusCode).json(result);
    };
    const getDeviceReceipeCount = async (req, res) => {
        console.log('getDeviceReceipeCount logs ', req.body, req.user);
        const result = await MQTT.getDeviceReceipeCount(req.body, req.user);
        return res.status(result.statusCode).json(result);
    };
    const getDashboardDetails = async (req, res) => {
        console.log('getDashboardDetails ', req.body, req.user);
        const result = await MQTT.getDashboardDetails(req.body, req.user);
        return res.status(result.statusCode).json(result);
    };
    const getDashboardBatteryDetails = async (req, res) => {
        console.log('getDashboardBatteryDetails ', req.body, req.user);
        const result = await MQTT.getDashboardBatteryDetails(req.body, req.user);
        return res.status(result.statusCode).json(result);
    };
    return {
        getDeviceLogCount,
        getDeviceData,
        getDeviceReceipeCount,
        getDashboardDetails,
        getDashboardBatteryDetails
    };
}

module.exports = MQTTStatisticsController;