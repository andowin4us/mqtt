const dotenv = require('dotenv');
const Util = require('../helper/util');
const workerHelper = require("../helper/mainWorkerHelper");
const moment = require('moment');
const MODULE_NAME = "REPORTS";

dotenv.config(); // Load .env file only once

const collectionName = "MQTTLogger";

// Helper function to create standard responses
const createResponse = (statusCode, success, msg, status = [], err = "") => ({
    statusCode,
    success,
    msg,
    status,
    err
});

// Helper function to build filter from query parameters
const buildFilter = async (tData, userInfo) => {
    let filter = {};
    let deviceIdList = [];

    if (userInfo && userInfo.accesslevel === 3) {
        let devicesAssignedToSupervisor = await Util.mongo.findAll("MQTTDevice", {userId: userInfo.id}, {});
        for (device of devicesAssignedToSupervisor) {
            deviceIdList.push(device.deviceId);
        }

        filter.device_id = { $in: deviceIdList }
    }

    if (tData) {
        const { device_id, device_name, log_type, log_desc, log_line_count, 
            battery_level, mac_id, state, startDate, endDate } = tData;

        if (device_id) {
            deviceIdList.push(device_id);
            filter.device_id = { $in: deviceIdList }
        };
        if (device_name) filter.device_name = device_name;
        if (log_type) filter.log_type = log_type.toUpperCase();
        if (log_desc) filter.log_desc = log_desc;
        if (log_line_count) filter.log_line_count = log_line_count;
        if (battery_level) filter.battery_level = battery_level;
        if (mac_id) filter.mac_id = mac_id;
        if (state) filter.state = state;
        if (startDate || endDate) { 
            filter.timestamp = startDate && endDate ? { 
                $gte: moment.utc(startDate).startOf('day').format('YYYY-MM-DD HH:mm:ss'), 
                $lte: moment.utc(endDate).endOf('day').format('YYYY-MM-DD HH:mm:ss')
            } 
            : startDate ? { 
                $gte: moment.utc(startDate).startOf('day').format('YYYY-MM-DD HH:mm:ss') 
            } 
            : { 
                $lte: moment.utc(endDate).endOf('day').format('YYYY-MM-DD HH:mm:ss') 
            };
        }
    }

    console.log("filter", filter);
    return filter;
};

// Generalized method to handle fetching logs
const fetchLogs = async (tData, userInfo, filter, collection) => {
    try {
        const tCheck = await Util.checkQueryParams(tData, {
            skip: "numeric",
            limit: "numeric",
        });

        if (tCheck?.error === "PARAMETER_ISSUE") {
            return createResponse(404, false, "PARAMETER_ISSUE", [], tCheck);
        }

        const sort = {
            timestamp: -1
        };

        const result = await Util.mongo.findPaginateAndSort(
            collection,
            filter,
            {},
            tData.skip,
            tData.limit,
            sort
        );

        const sanitizedData = await Util.snatizeFromMongo(result);

        if (sanitizedData) {
            return createResponse(200, true, "Fetch successful", sanitizedData[0].totalData, sanitizedData[0].totalSize);
        } else {
            return createResponse(404, false, "Fetch failed", []);
        }
    } catch (error) {
        return createResponse(500, false, "Error", [], error);
    }
};

// Fetch Device Logger
const getDeviceLogger = async (tData, userInfo) => {
    const filter = await buildFilter(tData, userInfo);
    return fetchLogs(tData, userInfo, filter, collectionName);
};

// Fetch State Logger
const getStateLogger = async (tData, userInfo) => {
    const filter = await buildFilter(tData, userInfo);
    filter.$or = [{ log_type: "STATE" }, { log_type: "Status" }];
    return fetchLogs(tData, userInfo, filter, collectionName);
};

// Generalized method to handle downloading logs
const downloadLogs = async (tData, userInfo, filter, columns, fileName, collectionName) => {
    let finalURL = "";

    try {
        const sort = {
            timestamp: -1,
            modified_time: -1
        };

        const finalJson = await Util.mongo.findAllSort(collectionName, filter, {}, sort);

        if (finalJson?.length > 0) {
            const workerData = {
                tData: finalJson,
                column: columns,
                fileName,
            };

            const dataFromWorker = await workerHelper.mainWorkerThreadCall(workerData, tData.type || "csv");
            if (dataFromWorker.statusCode === 200) {
                finalURL = dataFromWorker.status;
            } else {
                return createResponse(404, false, "No data found to generate report.");
            }
        } else {
            return createResponse(404, false, "No data found to generate report.");
        }
    } catch (e) {
        console.error("Error", e);
    }

    return {success: true, statusCode: 200, download: `${process.env.HOSTNAME}${finalURL}`, message: "Report Download Successfull."};
};

// Download Logger
const downloadLogger = async (tData, userInfo) => {
    try {
        const filter = await buildFilter(tData, userInfo);
        const columns = ["timestamp", "device_id", "device_name", "log_type", "log_desc", "log_line_count", "battery_level"];
        await Util.addAuditLogs(MODULE_NAME, userInfo, "download", `${userInfo.userName} has downloaded logger report.`, "success", JSON.stringify({}));
        return downloadLogs(tData, userInfo, filter, columns, "ActivityLogReport", collectionName);
    }  catch (e) {
        await Util.addAuditLogs(MODULE_NAME, userInfo, "download", `${userInfo.userName} has downloaded logger report.`, "failure", JSON.stringify({}));
        return createResponse(404, false, "No data found to generate report.");
    }
};

// Download State Logger
const downloadStateLogger = async (tData, userInfo) => {
    try {
        const filter = await buildFilter(tData, userInfo);
        const columns = ["timestamp", "device_id", "device_name", "log_type", "log_desc", "battery_level"];
        await Util.addAuditLogs(MODULE_NAME, userInfo, "download", `${userInfo.userName} has downloaded state report.`, "success", JSON.stringify({}));
        return downloadLogs(tData, userInfo, filter, columns, "StateLogReport", collectionName);
    } catch (e) {
        await Util.addAuditLogs(MODULE_NAME, userInfo, "download", `${userInfo.userName} has downloaded state report.`, "failure", JSON.stringify({}));
        return createResponse(404, false, "No data found to generate report.");
    }
};

// Fetch Audit Log
const getAuditLog = async (tData, userInfo) => {
    const tCheck = await Util.checkQueryParams(tData, {
        skip: "numeric",
        limit: "numeric",
    });

    if (tCheck?.error === "PARAMETER_ISSUE") {
        return createResponse(404, false, "PARAMETER_ISSUE", [], tCheck);
    }

    try {
        const filter = {
            ...((tData.startDate || tData.endDate) && { modified_time : tData.startDate && tData.endDate ? { $gte: tData.startDate, $lte: tData.endDate } : tData.startDate ? { $gte: tData.startDate} : { $lte: tData.endDate }}),
            ...(tData.userName && { modified_user_name: tData.userName }),
            ...(tData.moduleName && { moduleName: tData.moduleName }),
            ...(tData.operation && { operation: tData.operation }),
            ...(tData.status && { status: tData.status })
        };
        const result = await Util.mongo.findAndPaginate("MQTTAuditLog", filter, {}, tData.skip, tData.limit);
        const sanitizedData = await Util.snatizeFromMongo(result);

        if (sanitizedData) {
            return createResponse(200, true, "MQTT Audit Logs get Successful", sanitizedData[0].totalData, sanitizedData[0].totalSize);
        } else {
            return createResponse(404, false, "MQTT Audit Logs get Failed", []);
        }
    } catch (error) {
        return createResponse(500, false, "MQTT Error", [], error);
    }
};

// Download Audit Log
const downloadAuditLog = async (tData, userInfo) => {
    try {
        const filter = {
            ...((tData.startDate || tData.endDate) && { modified_time : tData.startDate && tData.endDate ? { $gte: tData.startDate, $lte: tData.endDate } : tData.startDate ? { $gte: tData.startDate} : { $lte: tData.endDate }}),
            ...(tData.userName && { modified_user_name: tData.userName }),
            ...(tData.moduleName && { moduleName: tData.moduleName }),
            ...(tData.operation && { operation: tData.operation }),
            ...(tData.status && { status: tData.status })
        };

        const columns = ["modified_time", "modified_user_name", "role", "moduleName", "operation", "status", "message"];
        await Util.addAuditLogs(MODULE_NAME, userInfo, "download", `${userInfo.userName} has downloaded audit log report.`, "success", JSON.stringify({}));
        return downloadLogs(tData, userInfo, filter, columns, "AuditLogReport", "MQTTAuditLog");
    } catch (e) {
        await Util.addAuditLogs(MODULE_NAME, userInfo, "download", `${userInfo.userName} has downloaded audit log report.`, "failure", JSON.stringify({}));
        return createResponse(404, false, "No data found to generate report.");
    }
};

module.exports = {
    getDeviceLogger,
    getStateLogger,
    downloadLogger,
    downloadStateLogger,
    getAuditLog,
    downloadAuditLog
};