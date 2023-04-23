const Logger = require('../models/ActivityLogger');

const ActivityLoggerController = () => {
    const activityLogs = async (req, res) => {
        const result = await Logger.activityLogs(req.body, req.user);
        return res.status(result.statusCode).json(result);
    };
    const downloadActivity = async (req, res) => {
        console.log('download activity logs -->>', req.body, req.user);
        const result = await Logger.ExportReport(req.body, req.user);
        return res.status(result.statusCode).json(result);
    }
    return {
        activityLogs,
        downloadActivity
    };
}
module.exports = ActivityLoggerController;