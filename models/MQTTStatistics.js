const Util = require('../helper/util');
const collectionName = "MQTTLogger";
const recipeCollectionName = "MQTTDeviceReceipe";

// Helper function to build the filter based on user info and data
const buildFilter = (tData, userInfo, isRecipeCount = false) => {
    let filter = {};
    
    if (userInfo?.accesslevel === 3) {
        filter.user_id = userInfo.id;
    }
    
    if (tData?.device_id) {
        filter.device_id = tData.device_id;
    }
    
    if (isRecipeCount) {
        filter = [
            {
                '$group': {
                    '_id': '$receipeStatus',
                    'count': { '$sum': 1 }
                }
            },
            {
                '$group': {
                    '_id': '$log_type',
                    'total': { '$sum': '$count' },
                    'data': { '$push': '$$ROOT' }
                }
            },
            {
                '$unwind': '$data'
            },
            {
                '$project': {
                    '_id': '$data._id',
                    'count': '$data.count',
                    'percentage': {
                        '$multiply': [100, { '$divide': ['$data.count', '$total'] }]
                    }
                }
            }
        ];
    } else {
        filter = [
            {
                '$group': {
                    '_id': '$log_type',
                    'count': { '$sum': 1 }
                }
            },
            {
                '$group': {
                    '_id': '$log_type',
                    'total': { '$sum': '$count' },
                    'data': { '$push': '$$ROOT' }
                }
            },
            {
                '$unwind': '$data'
            },
            {
                '$project': {
                    '_id': '$data._id',
                    'count': '$data.count',
                    'percentage': {
                        '$multiply': [100, { '$divide': ['$data.count', '$total'] }]
                    }
                }
            }
        ];
    }
    
    return filter;
};

// Helper function to execute aggregation and sanitize results
const executeAggregation = async (collection, filter) => {
    try {
        const result = await Util.mongo.aggregateData(collection, filter);
        return await Util.snatizeFromMongo(result);
    } catch (error) {
        throw new Error('Aggregation Error: ' + error.message);
    }
};

// General response builder
const buildResponse = (data, successMessage, failureMessage) => {
    if (data) {
        return {
            statusCode: 200,
            success: true,
            msg: `${successMessage} ${data.length} get Successful`,
            status: data,
            totalSize: data.length || 0,
        };
    } else {
        return {
            statusCode: 404,
            success: false,
            msg: failureMessage,
            status: [],
        };
    }
};

// Main function to get device log count
const getDeviceLogCount = async (tData, userInfo = {}) => {
    const filter = buildFilter(tData, userInfo);
    try {
        const snatizedData = await executeAggregation(collectionName, filter);
        return buildResponse(snatizedData, 'MQTT getDeviceLogCount', 'MQTT getDeviceLogCount Failed');
    } catch (error) {
        return {
            statusCode: 500,
            success: false,
            msg: 'MQTT Error',
            status: [],
            err: error.message,
        };
    }
};

// Main function to get device data
const getDeviceData = async (tData, userInfo = {}) => {
    let filter = [];
    try {
        if (tData?.groupBy) {
            if (tData.groupBy === 'date' || tData.groupBy === 'month') {
                filter = [
                    {
                        "$group": {
                            "_id": { 'logType': "$log_type", 'date': { $substr: ["$modified_time", 0, tData.groupBy === 'date' ? 10 : 7] } },
                            "count": { "$sum": 1 }
                        }
                    },
                    {
                        "$project": {
                            "_id": 0,
                            "date": "$_id",
                            "count": "$count"
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            total: { $sum: "$count" },
                            docs: { $push: "$$ROOT" }
                        }
                    },
                    {
                        $project: {
                            docs: {
                                $map: {
                                    input: "$docs",
                                    in: {
                                        date: "$$this.date.date",
                                        logType: "$$this.date.logType",
                                        count: "$$this.count",
                                        percentage: { $concat: [{ $toString: { $round: { $multiply: [{ $divide: ["$$this.count", "$total"] }, 100] } } }, '%'] }
                                    }
                                }
                            }
                        }
                    },
                    { $unwind: "$docs" },
                    { $replaceRoot: { newRoot: "$docs" } }
                ];
            } else {
                // Default case (group by year)
                filter = [
                    {
                        "$group": {
                            "_id": { 'logType': "$log_type", 'date': { $substr: ["$modified_time", 0, 4] } },
                            "count": { "$sum": 1 }
                        }
                    },
                    {
                        "$project": {
                            "_id": 0,
                            "date": "$_id",
                            "count": "$count"
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            total: { $sum: "$count" },
                            docs: { $push: "$$ROOT" }
                        }
                    },
                    {
                        $project: {
                            docs: {
                                $map: {
                                    input: "$docs",
                                    in: {
                                        date: "$$this.date.date",
                                        logType: "$$this.date.logType",
                                        count: "$$this.count",
                                        percentage: { $concat: [{ $toString: { $round: { $multiply: [{ $divide: ["$$this.count", "$total"] }, 100] } } }, '%'] }
                                    }
                                }
                            }
                        }
                    },
                    { $unwind: "$docs" },
                    { $replaceRoot: { newRoot: "$docs" } }
                ];
            }
        } else {
            // Default case (group by year if no groupBy specified)
            filter = buildFilter(tData, userInfo);
        }

        const snatizedData = await executeAggregation(collectionName, filter);
        return buildResponse(snatizedData, 'MQTT getDeviceData', 'MQTT getDeviceData Failed');
    } catch (error) {
        return {
            statusCode: 500,
            success: false,
            msg: 'MQTT Error',
            status: [],
            err: error.message,
        };
    }
};

// Main function to get device recipe count
const getDeviceReceipeCount = async (tData, userInfo = {}) => {
    const filter = buildFilter(tData, userInfo, true);
    try {
        const snatizedData = await executeAggregation(recipeCollectionName, filter);
        return buildResponse(snatizedData, 'MQTT getDeviceReceipeCount', 'MQTT getDeviceReceipeCount Failed');
    } catch (error) {
        return {
            statusCode: 500,
            success: false,
            msg: 'MQTT Error',
            status: [],
            err: error.message,
        };
    }
};

const getDashboardDetails = async (tData, userInfo = {}) => {
    try {
        let responseData = {
            deviceCounts: {},
            loggerDoorCounts: {},
            loggerStateCounts: {},
            maintenanceCounts: {}
        };

        let taggedDevices = [];

        if (userInfo.accesslevel === 3) {
            const resultDevice = await Util.mongo.find("MQTTDevice", {userId: userInfo.id});
            if (resultDevice.length > 0) {
                for (let device of resultDevice) {
                    taggedDevices.push(device.deviceId);
                }
            }
        }

        const deviceFilter = userInfo.accesslevel < 3 ? {} : { deviceId: { $in: taggedDevices } }; // Use assigned devices if access level is 3
        const loggerFilter = userInfo.accesslevel < 3 ? {} : { device_id: { $in: taggedDevices } }; // Use assigned devices if access level is 3
        const maintainenceFilter = userInfo.accesslevel < 3 ? {} : { devices: { $in: taggedDevices } }; // Use assigned devices if access level is 3

        // Device count aggregation
        const deviceAggregation = [
            { $match: deviceFilter },
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 }
                }
            },
            {
                $group: {
                    _id: null,
                    activeCount: {
                        $sum: { $cond: [{ $eq: ["$_id", "Active"] }, "$count", 0] }
                    },
                    inactiveCount: {
                        $sum: { $cond: [{ $eq: ["$_id", "InActive"] }, "$count", 0] }
                    },
                    totalCount: { $sum: "$count" }
                }
            },
            {
                $project: {
                    _id: 0,
                    activeCount: 1,
                    inactiveCount: 1,
                    totalCount: 1
                }
            }
        ];

        const resultDevice = await Util.mongo.aggregateData("MQTTDevice", deviceAggregation);
        responseData.deviceCounts = resultDevice[0] || {
            activeCount: 0,
            inactiveCount: 0,
            totalCount: 0
        };

        // Logger count aggregation
        const loggerDoorAggregation = [
            { $match: loggerFilter },
            {
                $match: {
                    log_type: "DOOR",
                    log_desc: { $in: ["OPEN", "CLOSED"] }
                }
            },
            {
                $group: {
                    _id: "$log_desc", // Grouping by log_desc
                    count: { $sum: 1 } // Count each matching document
                }
            },
            {
                $group: {
                    _id: null, // Grouping all together
                    openCount: {
                        $sum: {
                            $cond: [{ $eq: ["$_id", "OPEN"] }, "$count", 0] // Count OPEN logs
                        }
                    },
                    closedCount: {
                        $sum: {
                            $cond: [{ $eq: ["$_id", "CLOSED"] }, "$count", 0] // Count CLOSED logs
                        }
                    },
                    totalCount: { $sum: "$count" // Total count
                    }
                }
            },
            {
                $project: {
                    _id: 0, // Exclude the _id field from the output
                    openCount: 1,
                    closedCount: 1,
                    totalCount: 1
                }
            }
        ];
        const resultDoorLogger = await Util.mongo.aggregateData("MQTTLogger", loggerDoorAggregation);
        responseData.loggerDoorCounts = resultDoorLogger[0] || {
            openCount: 0,
            closedCount: 0,
            totalCount: 0
        };

        const loggerStateAggregation = [
            { $match: loggerFilter },
            {
                $match: {
                    log_type: "STATE",
                    log_desc: { $in: ["IDLE", "RUNNING"] }
                }
            },
            {
                $group: {
                    _id: "$log_desc", // Grouping by log_desc
                    count: { $sum: 1 } // Count each matching document
                }
            },
            {
                $group: {
                    _id: null, // Grouping all together
                    idleCount: {
                        $sum: {
                            $cond: [{ $eq: ["$_id", "IDLE"] }, "$count", 0] // Count OPEN logs
                        }
                    },
                    runningCount: {
                        $sum: {
                            $cond: [{ $eq: ["$_id", "RUNNING"] }, "$count", 0] // Count CLOSED logs
                        }
                    },
                    totalCount: { $sum: "$count" // Total count
                    }
                }
            },
            {
                $project: {
                    _id: 0, // Exclude the _id field from the output
                    idleCount: 1,
                    runningCount: 1,
                    totalCount: 1
                }
            }
        ];
        const resultStateLogger = await Util.mongo.aggregateData("MQTTLogger", loggerStateAggregation);
        responseData.loggerStateCounts = resultStateLogger[0] || {
            idleCount: 0,
            runningCount: 0,
            totalCount: 0
        };

        // Maintenance count aggregation
        const maintenanceAggregation = [
            { $match: maintainenceFilter },
            {
                $match: {
                    status: { $in: ["Pending", "Approved", "Rejected"] }
                }
            },
            {
                $group: {
                    _id: null,
                    pendingCount: {
                        $sum: {
                            $cond: [{ $eq: ["$status", "Pending"] }, 1, 0]
                        }
                    },
                    approvedCount: {
                        $sum: {
                            $cond: [{ $eq: ["$status", "Approved"] }, 1, 0]
                        }
                    },
                    rejectedCount: {
                        $sum: {
                            $cond: [{ $eq: ["$status", "Rejected"] }, 1, 0]
                        }
                    },
                    totalCount: { $sum: 1 } // Total count of all matched documents
                }
            },
            {
                $project: {
                    _id: 0, // Exclude _id from the output
                    pendingCount: 1,
                    approvedCount: 1,
                    rejectedCount: 1,
                    totalCount: 1
                }
            }
        ];
        const resultMaintenance = await Util.mongo.aggregateData("MQTTMaintainence", maintenanceAggregation);
        responseData.maintenanceCounts = resultMaintenance[0] || {
            pendingCount: 0,
            approvedCount: 0,
            rejectedCount: 0,
            totalCount: 0
        };

        return {
            statusCode: 200,
            success: true,
            msg: 'MQTT Dashboard retrieved successfully',
            data: responseData, // Return all counts in a single object
            err: {},
        };

    } catch (error) {
        return {
            statusCode: 500,
            success: false,
            msg: 'MQTT Error',
            err: error.message,
        };
    }
};

const getDashboardBatteryDetails = async (tData, userInfo = {}) => {
    try {
        let responseData = {
            deviceBatteryData: {}
        };

        let taggedDevices = [];

        if (userInfo.accesslevel === 3) {
            const resultDevice = await Util.mongo.find("MQTTDevice", {userId: userInfo.id});
            if (resultDevice.length > 0) {
                for (let device of resultDevice) {
                    taggedDevices.push(device.deviceId);
                }
            }
        }

        const loggerFilter = userInfo.accesslevel < 3 ? {} : { device_id: { $in: taggedDevices } }; // Use assigned devices if access level is 3

        const loggerAggregation = [
            { $match: loggerFilter },
            {
                $match: {
                    timestamp: {
                        $gte: new Date(new Date().setDate(new Date().getDate() - new Date().getDay())), // Start of the week
                        $lt: new Date(new Date().setDate(new Date().getDate() + (7 - new Date().getDay()))) // End of the week
                    }
                }
            },
            {
                $project: {
                    day: { $dayOfWeek: { $dateFromString: { dateString: "$timestamp" } } }, // Get the day of the week
                    battery_level: { $toInt: { $substr: ["$battery_level", 0, -1] } } // Convert battery level to integer
                }
            },
            {
                $group: {
                    _id: "$day", // Group by day of the week
                    average_battery: { $avg: "$battery_level" } // Calculate average battery level
                }
            },
            {
                $sort: { _id: 1 } // Sort by day of the week (1 = Sunday, 2 = Monday, etc.)
            },
            {
                $project: {
                    _id: 0,
                    day: "$_id",
                    average_battery: 1
                }
            }
        ];

        const resultLogger = await Util.mongo.aggregateData("MQTTMaintainence", loggerAggregation);
        responseData.deviceBatteryData = resultLogger[0];

        return {
            statusCode: 200,
            success: true,
            msg: 'MQTT Dashboard Battery retrieved successfully',
            data: responseData, // Return all counts in a single object
            err: {},
        };

    } catch (error) {
        return {
            statusCode: 500,
            success: false,
            msg: 'MQTT Error',
            err: error.message,
        };
    }
};


module.exports = {
    getDeviceLogCount,
    getDeviceData,
    getDeviceReceipeCount,
    getDashboardDetails,
    getDashboardBatteryDetails
};