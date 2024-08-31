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

module.exports = {
    getDeviceLogCount,
    getDeviceData,
    getDeviceReceipeCount
};