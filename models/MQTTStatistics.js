const Util = require('../helper/util');
let collectionName = "MQTTLogger"

const getDeviceLogCount = async (tData, userInfo = {}) => {
    try {
        let filter = {};
        
        if( userInfo && userInfo.accesslevel && userInfo.accesslevel === 3 ) {
            filter.user_id = userInfo.id;
            if( tData && tData.device_id ) {
                filter.device_id = tData.device_id;
            }
        } else {
            if( tData && tData.device_id ) {
                filter.device_id = tData.device_id;
            }
        }

        filter = [
            {
                '$group': {
                    '_id': '$log_type',
                    'count': {
                        '$sum': 1
                    }
                }
            }, {
                '$group': {
                    '_id': '$log_type',
                    'total': {
                        '$sum': '$count'
                    },
                    'data': {
                        '$push': '$$ROOT'
                    }
                }
            }, {
                '$unwind': {
                    'path': '$data'
                }
            }, {
                '$project': {
                    '_id': '$data._id',
                    'count': '$data.count',
                    'percentage': {
                        '$multiply': [
                            100, {
                                '$divide': [
                                    '$data.count', '$total'
                                ]
                            }
                        ]
                    }
                }
            }
        ];

        let result = await Util.mongo.aggregateData(
            collectionName,
            filter,
            {}
        );
        let snatizedData = await Util.snatizeFromMongo(result);

        if (snatizedData) {
            return {
                statusCode: 200,
                success: true,
                msg: "MQTT getDeviceLogCount get Successfull",
                status: snatizedData,
                totalSize: snatizedData.length > 0 ? snatizedData.length : 0,
            };
        } else {
            return {
                statusCode: 404,
                success: false,
                msg: "MQTT getDeviceLogCount get Failed",
                status: [],
            };
        }
    } catch (error) {
        return {
            statusCode: 500,
            success: false,
            msg: "MQTT  Error",
            status: [],
            err: error,
        };
    }
};

const getDeviceData = async (tData, userInfo = {}) => {
    let filter = [];
    try {
        if(tData && tData.groupBy && tData.groupBy === "date") {
            filter = [
                {
                   "$group" : { 
                       "_id": { 'logType': "$log_type", 'date': {$substr: ["$modified_time", 0, 10] }},
                       "count" : {
                           "$sum" : 1
                       } 
                   }
                },
                {
                    "$project" : {
                        "_id" : 0,
                        "date" : "$_id",
                        "count" : "$count" 
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
                                    percentage: { $concat: [ { $toString: { $round: { $multiply: [  { $divide: [ "$$this.count", "$total" ] }, 100 ] } } }, '%' ] }
                                }
                            }
                        }
                    }
                },
                {
                    $unwind: "$docs"
                },
                {
                    $replaceRoot: { newRoot: "$docs" }
                }
            ];
        }
        else if(tData && tData.groupBy && tData.groupBy === "month") {
            filter = [
                {
                   "$group" : { 
                       "_id": { 'logType': "$log_type", 'date': {$substr: ["$modified_time", 0, 10] }},
                       "count" : {
                           "$sum" : 1
                       } 
                   }
                },
                {
                    "$project" : {
                        "_id" : 0,
                        "date" : "$_id",
                        "count" : "$count" 
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
                                    percentage: { $concat: [ { $toString: { $round: { $multiply: [  { $divide: [ "$$this.count", "$total" ] }, 100 ] } } }, '%' ] }
                                }
                            }
                        }
                    }
                },
                {
                    $unwind: "$docs"
                },
                {
                    $replaceRoot: { newRoot: "$docs" }
                }
            ];   
        } else {
            filter = [
                {
                   "$group" : { 
                       "_id": { 'logType': "$log_type", 'date': {$substr: ["$modified_time", 0, 4] } },
                       "count" : {
                           "$sum" : 1
                       } 
                   }
                },
                {
                    "$project" : {
                        "_id" : 0,
                        "date" : "$_id",
                        "count" : "$count" 
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
                                    percentage: { $concat: [ { $toString: { $round: { $multiply: [  { $divide: [ "$$this.count", "$total" ] }, 100 ] } } }, '%' ] }
                                }
                            }
                        }
                    }
                },
                {
                    $unwind: "$docs"
                },
                {
                    $replaceRoot: { newRoot: "$docs" }
                }
            ]
        }
        let result = await Util.mongo.aggregateData(
            collectionName,
            filter,
        );
        let snatizedData = await Util.snatizeFromMongo(result);

        if (snatizedData) {
            return {
                statusCode: 200,
                success: true,
                msg: "MQTT getDeviceLogCount " +snatizedData.length +" get Successfull",
                status: snatizedData,
                totalSize: snatizedData.length > 0 ? snatizedData.length : 0,
            };
        } else {
            return {
                statusCode: 404,
                success: false,
                msg: "MQTT getDeviceData " + +" get Failed",
                status: [],
            };
        }
    } catch (error) {
        return {
            statusCode: 500,
            success: false,
            msg: "MQTT  Error",
            status: [],
            err: error,
        };
    }
};

const getDeviceReceipeCount = async (tData, userInfo = {}) => {
    try {
        let filter = {};
        
        if( userInfo && userInfo.accesslevel && userInfo.accesslevel === 3 ) {
            filter.user_id = userInfo.id;
            if( tData && tData.device_id ) {
                filter.device_id = tData.device_id;
            }
        } else {
            if( tData && tData.device_id ) {
                filter.device_id = tData.device_id;
            }
        }

        filter = [
            {
                '$group': {
                    '_id': '$receipeStatus',
                    'count': {
                        '$sum': 1
                    }
                }
            }, {
                '$group': {
                    '_id': '$log_type',
                    'total': {
                        '$sum': '$count'
                    },
                    'data': {
                        '$push': '$$ROOT'
                    }
                }
            }, {
                '$unwind': {
                    'path': '$data'
                }
            }, {
                '$project': {
                    '_id': '$data._id',
                    'count': '$data.count',
                    'percentage': {
                        '$multiply': [
                            100, {
                                '$divide': [
                                    '$data.count', '$total'
                                ]
                            }
                        ]
                    }
                }
            }
        ];

        let result = await Util.mongo.aggregateData(
            "MQTTDeviceReceipe",
            filter,
            {}
        );
        let snatizedData = await Util.snatizeFromMongo(result);
        if (snatizedData) {
            return {
                statusCode: 200,
                success: true,
                msg: "MQTT getDeviceLogCount " +snatizedData.length +" get Successfull",
                status: snatizedData,
                totalSize: snatizedData.length > 0 ? snatizedData.length : 0,
            };
        } else {
            return {
                statusCode: 404,
                success: false,
                msg: "MQTT getDeviceLogCount " + +" get Failed",
                status: [],
            };
        }
    } catch (error) {
        return {
            statusCode: 500,
            success: false,
            msg: "MQTT  Error",
            status: [],
            err: error,
        };
    }
};

module.exports = {
    getDeviceLogCount,
    getDeviceData,
    getDeviceReceipeCount
};