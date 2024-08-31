const Util = require("../helper/util");
const deviceMongoCollection = "MQTTLoggerType";
const dotenv = require("dotenv");
const moment = require("moment");

// Helper function to check permissions
const hasPermission = (userInfo) => {
    return userInfo && userInfo.accesslevel && userInfo.accesslevel <= 2;
};

// Helper function to validate parameters
const validateParams = async (tData, requiredParams) => {
    let validation = await Util.checkQueryParams(tData, requiredParams);
    if (validation && validation.error && validation.error === "PARAMETER_ISSUE") {
        return {
            statusCode: 404,
            success: false,
            msg: "PARAMETER_ISSUE",
            err: validation,
        };
    }
    return null;
};

// Helper function to handle duplicates
const isDuplicate = async (logType, deviceId) => {
    const query = { logType, deviceId };
    const result = await Util.mongo.findOne(deviceMongoCollection, query);
    return !!result;
};

// Helper function to handle audit logs
const handleAuditLogs = async (userInfo, result, operation, message) => {
    await Util.addAuditLogs(deviceMongoCollection, userInfo, operation, message, JSON.stringify(result));
};

// Main CRUD functions
const deleteData = async (tData, userInfo = {}) => {
    let validationError = await validateParams(tData, { id: "required|string" });
    if (validationError) return validationError;

    if (!hasPermission(userInfo)) {
        return {
            statusCode: 404,
            success: false,
            msg: "NOT ENOUGH PERMISSIONS TO PERFORM THIS OPERATION.",
            err: "",
        };
    }

    try {
        const configDetails = await Util.mongo.findOne(deviceMongoCollection, { _id: tData.id });
        if (configDetails && configDetails.logType) {
            const result = await Util.mongo.remove(deviceMongoCollection, { _id: tData.id });
            if (result) {
                await handleAuditLogs(userInfo, result, "delete", `${userInfo.userName} deleted log type ${configDetails.logType}.`);
                return {
                    statusCode: 200,
                    success: true,
                    msg: "MQTTLoggerType device Deleted Successfully",
                    status: result,
                };
            }
        }
        return {
            statusCode: 404,
            success: false,
            msg: "MQTTLoggerType device Deletion Failed",
            status: [],
        };
    } catch (error) {
        return {
            statusCode: 500,
            success: false,
            msg: "MQTTLoggerType device Deletion Error",
            status: [],
            err: error,
        };
    }
};

const updateData = async (tData, userInfo = {}) => {
    let validationError = await validateParams(tData, { id: "required|string", logType: "required|string" });
    if (validationError) return validationError;

    if (!hasPermission(userInfo)) {
        return {
            statusCode: 404,
            success: false,
            msg: "NOT ENOUGH PERMISSIONS TO PERFORM THIS OPERATION.",
            err: "",
        };
    }

    try {
        if (await isDuplicate(tData.logType, tData.id)) {
            return {
                statusCode: 404,
                success: false,
                msg: "DUPLICATE LOG TYPE",
                err: "",
            };
        }

        const updateObj = {
            $set: {
                _id: tData.id,
                logType: tData.logType,
                modified_time: moment().format("YYYY-MM-DD HH:mm:ss"),
            },
        };

        const result = await Util.mongo.updateOne(deviceMongoCollection, { _id: tData.id }, updateObj);
        if (result) {
            await handleAuditLogs(userInfo, result);
            return {
                statusCode: 200,
                success: true,
                msg: "MQTTLoggerType Config Updated Successfully",
                status: result,
            };
        }
        return {
            statusCode: 404,
            success: false,
            msg: "MQTTLoggerType Config Update Error",
            status: [],
        };
    } catch (error) {
        return {
            statusCode: 500,
            success: false,
            msg: "MQTTLoggerType Config Update Error",
            status: [],
            err: error,
        };
    }
};

const createData = async (tData, userInfo = {}) => {
    let validationError = await validateParams(tData, { id: "required|string", deviceId: "required|string", logType: "required|string" });
    if (validationError) return validationError;

    if (!hasPermission(userInfo)) {
        return {
            statusCode: 404,
            success: false,
            msg: "NOT ENOUGH PERMISSIONS TO PERFORM THIS OPERATION.",
            err: "",
        };
    }

    try {
        if (await isDuplicate(tData.logType, tData.deviceId)) {
            return {
                statusCode: 404,
                success: false,
                msg: "DUPLICATE LOG TYPE",
                err: "",
            };
        }

        const createObj = {
            _id: tData.id,
            deviceId: tData.deviceId,
            logType: tData.logType,
            created_time: moment().format("YYYY-MM-DD HH:mm:ss"),
            modified_time: moment().format("YYYY-MM-DD HH:mm:ss"),
        };

        const result = await Util.mongo.insertOne(deviceMongoCollection, createObj);
        if (result) {
            await handleAuditLogs(userInfo, result);
            return {
                statusCode: 200,
                success: true,
                msg: "MQTTLoggerType Created Successfully",
                status: result,
            };
        }
        return {
            statusCode: 404,
            success: false,
            msg: "MQTTLoggerType Creation Failed",
            status: [],
        };
    } catch (error) {
        return {
            statusCode: 500,
            success: false,
            msg: "MQTTLoggerType Creation Error",
            status: [],
            err: error,
        };
    }
};

const getData = async (tData) => {
    let validationError = await validateParams(tData, { skip: "numeric", limit: "numeric" });
    if (validationError) return validationError;

    try {
        const filter = {};
        if (tData.deviceId) filter.deviceId = tData.deviceId;
        if (tData.logType) filter.logType = tData.logType;

        const result = await Util.mongo.findAndPaginate(deviceMongoCollection, filter, {}, tData.skip, tData.limit);
        const sanitizedData = await Util.snatizeFromMongo(result);

        if (sanitizedData) {
            return {
                statusCode: 200,
                success: true,
                msg: "MQTTLoggerType Data Retrieved Successfully",
                status: sanitizedData[0].totalData,
                totalSize: sanitizedData[0].totalSize,
            };
        }
        return {
            statusCode: 404,
            success: false,
            msg: "MQTTLoggerType Data Retrieval Failed",
            status: [],
        };
    } catch (error) {
        return {
            statusCode: 500,
            success: false,
            msg: "MQTTLoggerType Data Retrieval Error",
            status: [],
            err: error,
        };
    }
};

module.exports = {
    deleteData,
    updateData,
    createData,
    getData,
};