const dotenv = require('dotenv');
require('dotenv').config(); // load .env file
const Util = require('../helper/util');
const workerHelper = require("../helper/mainWorkerHelper");
let collectionName = "MQTTLogger"

const getDeviceLogger = async (tData, userInfo = {}) => {
    let tCheck = await Util.checkQueryParams(tData, {
        skip: "numeric",
        limit: "numeric",
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

        if( tData && tData.device_name ) {
            filter.device_name = tData.device_name;
        }

        if( tData && tData.log_type ) {
            filter.log_type = tData.log_type;
        }

        if( tData && tData.log_desc ) {
            filter.log_desc = tData.log_desc;
        }

        if( tData && tData.log_line_count ) {
            filter.log_line_count = tData.log_line_count;
        }

        if( tData && tData.battery_level ) {
            filter.battery_level = tData.battery_level;
        }

        if( tData && tData.mac_id ) {
            filter.mac_id = tData.mac_id;
        }
        
        let sort = {
            log_line_count: 1,
            modified_time: 1,
        }
        let result = await Util.mongo.findPaginateAndSort(
            collectionName,
            filter,
            {},
            tData.skip,
            tData.limit,
            sort
        );
        let snatizedData = await Util.snatizeFromMongo(result);
        if (snatizedData) {
            return {
                statusCode: 200,
                success: true,
                msg: "MQTT getDeviceLogger " + +" get Successfull",
                status: snatizedData[0].totalData,
                totalSize: snatizedData[0].totalSize,
            };
        } else {
            return {
                statusCode: 404,
                success: false,
                msg: "MQTT getDeviceLogger " + +" get Failed",
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

const getProcessLogger = async (tData, userInfo = {}) => {
    let tCheck = await Util.checkQueryParams(tData, {
        skip: "numeric",
        limit: "numeric",
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
        let result = await Util.mongo.findAndPaginate(
            collectionName,
            {},
            {},
            tData.skip,
            tData.limit
        );
        let snatizedData = await Util.snatizeFromMongo(result);

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

const downloadLogger = async (tData, userInfo = {}) => {
    let finalURL = "";

    let coloum = [ "timestamp", "device_id", "device_name", "mac_id", "log_type", "log_desc", "log_line_count", "battery_level"];
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

        if( tData && tData.device_name ) {
            filter.device_name = tData.device_name;
        }

        if( tData && tData.log_type ) {
            filter.log_type = tData.log_type;
        }

        if( tData && tData.log_desc ) {
            filter.log_desc = tData.log_desc;
        }

        if( tData && tData.log_line_count ) {
            filter.log_line_count = tData.log_line_count;
        }

        if( tData && tData.battery_level ) {
            filter.battery_level = tData.battery_level;
        }

        if( tData && tData.mac_id ) {
            filter.mac_id = tData.mac_id;
        }

        let sort = {
            log_line_count: 1,
            modified_time: 1,
        }

        let finalJson = await Util.mongo.findAllSort(
            collectionName,
            filter,
            {},
            sort
        );

        if( finalJson && finalJson.length > 0 ) {
            const workerData = {
                tData: finalJson,
                column: coloum,
                fileName: "ActivityLogReport",
            };
    
            const dataFromWorker = await workerHelper.mainWorkerThreadCall(
                workerData,
                tData.type || "csv"
            );
            if (dataFromWorker.statusCode === 200) {
                finalURL = dataFromWorker.status;
            }
        } else {
            return {
                success: false,
                statusCode: 404,
                message: "No data found to generate report.",
            };
        }
    } catch (e) {
        console.log("error", e);
    }

    return {
        success: true,
        statusCode: 200,
        download: `${process.env.HOSTNAME}${finalURL}`,
    };
};

const getAuditLog = async (tData, userInfo = {}) => {
    let tCheck = await Util.checkQueryParams(tData, {
        skip: "numeric",
        limit: "numeric",
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
        let filter = {};

        if ( tData && tData.moduleName ) {
            filter.moduleName = tData.moduleName
        }
        let result = await Util.mongo.findAndPaginate(
            "MQTTAuditLog",
            filter,
            {},
            tData.skip,
            tData.limit
        );
        let snatizedData = await Util.snatizeFromMongo(result);
        if (snatizedData) {
            return {
                statusCode: 200,
                success: true,
                msg: "MQTT Audit Logs " + +" get Successfull",
                status: snatizedData[0].totalData,
                totalSize: snatizedData[0].totalSize,
            };
        } else {
            return {
                statusCode: 404,
                success: false,
                msg: "MQTT Audit Logs " + +" get Failed",
                status: [],
            };
        }
    } catch (error) {
        return {
            statusCode: 500,
            success: false,
            msg: "MQTT Error",
            status: [],
            err: error,
        };
    }
};

module.exports = {
    getDeviceLogger,
    getProcessLogger,
    downloadLogger,
    getAuditLog
};