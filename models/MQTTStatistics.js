const moment = require('moment');
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
            const resultDevice = await Util.mongo.find("MQTTDevice", {userName: userInfo.userName});
            for (let device of resultDevice) {
                taggedDevices.push(device.deviceId);
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
                    log_desc: { $in: ["OPENED", "CLOSED"] }
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
                            $cond: [{ $eq: ["$_id", "OPENED"] }, "$count", 0] // Count OPEN logs
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
                    status: { $in: ["Pending", "Approved", "Rejected", "Auto_Rejected"] }
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
                            $cond: [{ $in: ["$status", ["Rejected", "Auto_Rejected"]] }, 1, 0]
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
        let taggedDevices = [];

        if (userInfo.accesslevel === 3) {
            const resultDevice = await Util.mongo.find("MQTTDevice", {userName: userInfo.userName});
            if (resultDevice.length > 0) {
                for (let device of resultDevice) {
                    taggedDevices.push(device.deviceId);
                }
            }
        }

        const loggerFilter = userInfo.accesslevel < 3 ? {} : { device_id: { $in: taggedDevices } }; // Use assigned devices if access level is 3
        const allDays = [
            { day: 1, name: "Sunday" },
            { day: 2, name: "Monday" },
            { day: 3, name: "Tuesday" },
            { day: 4, name: "Wednesday" },
            { day: 5, name: "Thursday" },
            { day: 6, name: "Friday" },
            { day: 7, name: "Saturday" }
        ];        

        const today = new Date();
        const dayOfWeek = today.getDay();
        const startOfWeek = new Date(today.setDate(today.getDate() - dayOfWeek));
        const endOfWeek = new Date(today.setDate(startOfWeek.getDate() + 7));
        
        const startOfWeekStr = startOfWeek.toISOString().slice(0, 10); // Get YYYY-MM-DD format
        const endOfWeekStr = endOfWeek.toISOString().slice(0, 10); // Get YYYY-MM-DD format

        const loggerAggregation = [
            { $match: loggerFilter },
            {
                $match: {
                    timestamp: {
                        $gte: startOfWeekStr.trim(), // Start of the week
                        $lte: endOfWeekStr.trim() // End of the week
                    }
                }
            },
            {
                $project: {
                    day: { $dayOfWeek: { $dateFromString: { dateString: "$timestamp" } } },
                    battery_level: {
                        $toDouble: {
                            $trim: {
                                input: { $replaceOne: { input: "$battery_level", find: "%", replacement: "" } }
                            }
                        }
                    }
                }
            },
            {
                $group: {
                    _id: "$day",
                    average_battery: { $avg: "$battery_level" }
                }
            },
            {
                $sort: { _id: 1 } // Sort by day of the week
            }
        ];

        const resultLogger = await Util.mongo.aggregateData("MQTTLogger", loggerAggregation);
        const finalResults = allDays.map(day => {
            const result = resultLogger.find(r => r._id === day.day);
            return {
                day: day.name,
                average_battery: result ? result.average_battery : 0 // Default to 0 if not found
            };
        });

        return {
            statusCode: 200,
            success: true,
            msg: 'MQTT Dashboard Battery retrieved successfully',
            data: finalResults, // Return all counts in a single object
            err: {},
        };

    } catch (error) {
        return {
            statusCode: 500,
            success: false,
            msg: 'MQTT Dashboard Battery Error',
            err: error.message,
        };
    }
};

const getDashboardStateDetails = async (tData, userInfo = {}) => {
    try {
        let taggedDevices = [];
        let resultDevice = [];

        if (userInfo.accesslevel === 3) {
            const resultDevice = await Util.mongo.find("MQTTDevice", {userName: userInfo.userName});
            if (resultDevice.length > 0) {
                for (let device of resultDevice) {
                    taggedDevices.push(device.deviceId);
                }
            }
        } else {
            resultDevice = await Util.mongo.find("MQTTDevice", {});
        }

        const loggerFilter = userInfo.accesslevel < 3 ? {} : { device_id: { $in: taggedDevices } }; // Use assigned devices if access level is 3
        const targetDateStr = moment().format('YYYY-MM-DD'); // Desired date in YYYY-MM-DD format
        const startOfDayStr = `${targetDateStr} 00:00:00`; // Start of the day
        const endOfDayStr = `${targetDateStr} 23:59:59`; // End of the day
        
        const loggerAggregation = [
            { $match: loggerFilter },
            {
                $match: {
                    timestamp: {
                        $gte: startOfDayStr,
                        $lte: endOfDayStr
                    },
                    log_type: "STATE",
                    log_desc: { $in: ["IDLE", "RUNNING"] }
                }
            },
            {
                $sort: { timestamp: 1 } // Sort by timestamp
            },
            {
                $group: {
                    _id: "$device_id",
                    states: { $push: { log_desc: "$log_desc", timestamp: { $dateFromString: { dateString: "$timestamp" } } } }
                }
            },
            {
                $project: {
                    device_id: "$_id",
                    total_idle_time: {
                        $sum: {
                            $cond: [
                                { $eq: [{ $arrayElemAt: ["$states.log_desc", 0] }, "IDLE"] },
                                { $subtract: [
                                    { $arrayElemAt: ["$states.timestamp", 1] },
                                    { $arrayElemAt: ["$states.timestamp", 0] }
                                ]},
                                0
                            ]
                        }
                    },
                    total_running_time: {
                        $sum: {
                            $cond: [
                                { $eq: [{ $arrayElemAt: ["$states.log_desc", 0] }, "RUNNING"] },
                                { $subtract: [
                                    { $arrayElemAt: ["$states.timestamp", 1] },
                                    { $arrayElemAt: ["$states.timestamp", 0] }
                                ]},
                                0
                            ]
                        }
                    }
                }
            },
            {
                $project: {
                    _id: 0,
                    device_id: 1,
                    total_idle_time: { $ifNull: [{ $divide: ["$total_idle_time", 1000] }, 0] },
                    total_running_time: { $ifNull: [{ $divide: ["$total_running_time", 1000] }, 0] }
                }
            }
        ];

        const resultLogger = await Util.mongo.aggregateData("MQTTLogger", loggerAggregation);

        return {
            statusCode: 200,
            success: true,
            msg: 'MQTT Dashboard State retrieved successfully',
            data: resultLogger,
            err: {},
        };

    } catch (error) {
        return {
            statusCode: 500,
            success: false,
            msg: 'MQTT Dashboard State Error',
            err: error.message,
        };
    }
};

const getDashboardGraphDetails = async (tData, userInfo = {}) => {
    try {
        let taggedDevices = [];

        if (userInfo.accesslevel === 3) {
            const resultDevice = await Util.mongo.find("MQTTDevice", {userName: userInfo.userName});
            if (resultDevice.length > 0) {
                for (let device of resultDevice) {
                    taggedDevices.push(device.deviceId);
                }
            }
        }

        const loggerFilter = userInfo.accesslevel < 3 ? {} : { device_id: { $in: taggedDevices } }; // Use assigned devices if access level is 3
        const today = new Date();
        const dayOfWeek = today.getDay();
        const startOfWeek = new Date(today.setDate(today.getDate() - dayOfWeek));
        const endOfWeek = new Date(today.setDate(startOfWeek.getDate() + 7));  
        const startOfWeekStr = startOfWeek.toISOString().slice(0, 10); // Get YYYY-MM-DD format
        const endOfWeekStr = endOfWeek.toISOString().slice(0, 10); // Get YYYY-MM-DD format
        
        const daysOfWeek = [
            { day: 1, name: "Sunday" },
            { day: 2, name: "Monday" },
            { day: 3, name: "Tuesday" },
            { day: 4, name: "Wednesday" },
            { day: 5, name: "Thursday" },
            { day: 6, name: "Friday" },
            { day: 7, name: "Saturday" }
        ];

        const results = await Util.mongo.aggregateData("MQTTLogger", [
            { $match: loggerFilter },
            {
                $match: {
                    timestamp: {
                        $gte: startOfWeekStr.trim(), // Start of the week
                        $lte: endOfWeekStr.trim() // End of the week
                    }
                }
            },
            {
                $group: {
                    _id: {
                        log_type: "$log_type",
                        day: { $dayOfWeek: { $dateFromString: { dateString: "$timestamp" } } },
                    },
                    count: { $sum: 1 },
                    entries: { $push: "$$ROOT" } // Optional: Include the entire data in the output
                }
            },
            {
                $group: {
                    _id: "$_id.day", // Group by day of the week
                    log_types: {
                        $push: {
                            log_type: "$_id.log_type",
                            count: "$count"
                        }
                    }
                }
            },
            {
                $sort: { "_id": 1 } // Sort by day of the week
            },
            {
                $project: {
                    day: "$_id", // Keep the day
                    log_types: { $ifNull: ["$log_types", []] } // Ensure log_types is an array
                }
            },
            {
                $group: {
                    _id: null,
                    daysData: { $push: { day: "$day", log_types: "$log_types" } }
                }
            },
            {
                $project: {
                    data: {
                        $map: {
                            input: daysOfWeek,
                            as: "day",
                            in: {
                                day: "$$day.name",
                                log_types: {
                                    $let: {
                                        vars: {
                                            found: {
                                                $arrayElemAt: [
                                                    {
                                                        $filter: {
                                                            input: "$daysData",
                                                            as: "d",
                                                            cond: { $eq: ["$$d.day", "$$day.day"] }
                                                        }
                                                    },
                                                    0
                                                ]
                                            }
                                        },
                                        in: {
                                            $cond: {
                                                if: { $ifNull: ["$$found", false] },
                                                then: "$$found.log_types",
                                                else: [{ log_type: "Unknown", count: 0 }]
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        ]);


        return {
            statusCode: 200,
            success: true,
            msg: 'MQTT Graph data retrieved successfully',
            data: results[0].data,
            err: {},
        };

    } catch (error) {
        return {
            statusCode: 500,
            success: false,
            msg: 'MQTT Graph data Error',
            err: error.message,
        };
    }
};

module.exports = {
    getDeviceLogCount,
    getDeviceData,
    getDeviceReceipeCount,
    getDashboardDetails,
    getDashboardBatteryDetails,
    getDashboardStateDetails,
    getDashboardGraphDetails,
};