const ActivityLoggerPrivate = {
    'GET /activityLogger': 'ActivityLoggerController.activityLogs',
    'POST /downloadactivity': 'ActivityLoggerController.downloadActivity'
};
const ActivityLoggerPublic = ActivityLoggerPrivate;

module.exports = {
    ActivityLoggerPrivate,
    ActivityLoggerPublic,
};