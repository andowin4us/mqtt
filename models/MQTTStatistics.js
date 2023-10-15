const Util = require('../helper/util');
const workerHelper = require("../helper/mainWorkerHelper");
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
        console.log("snatizedData", snatizedData);
        if (snatizedData) {
            return {
                statusCode: 200,
                success: true,
                msg: "MQTT getDeviceLogCount " + +" get Successfull",
                status: snatizedData[0].totalData,
                totalSize: snatizedData[0].totalSize,
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

const getDeviceData = async (tData, userInfo = {}) => {
    let tCheck = await Util.checkQueryParams(tData, {
        logType: "required|array",
    });

    if (tCheck && tCheck.error && tCheck.error == "PARAMETER_ISSUE") {
        return {
            statusCode: 404,
            success: false,
            msg: "PARAMETER_ISSUE",
            err: tCheck,
        };
    }
    try {
        let filter = {
            $and: [{
                'log_type': {
                    $in: logType
                }
            }]
        }
        let result = await Util.mongo.findAll(
            collectionName,
            filter,
            {}
        );
        let snatizedData = await Util.snatizeFromMongo(result);
        console.log("snatizedData", snatizedData);
        if (snatizedData) {
            return {
                statusCode: 200,
                success: true,
                msg: "MQTT getProcessLogger " + +" get Successfull",
                status: snatizedData[0].totalData,
                totalSize: snatizedData[0].totalSize,
            };
        } else {
            return {
                statusCode: 404,
                success: false,
                msg: "MQTT getProcessLogger " + +" get Failed",
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
    getDeviceData
};