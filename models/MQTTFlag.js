const Util = require("../helper/util");
const moment = require("moment");

const deviceMongoCollection = "MQTTFlag";

// Helper function for standard responses
const createResponse = (statusCode, success, msg, status = [], err = "") => ({
    statusCode,
    success,
    msg,
    status,
    err
});

// Helper function for permission checking
const checkPermissions = (userInfo) => {
    if (userInfo && userInfo.accesslevel && userInfo.accesslevel > 1) {
        return createResponse(403, false, "NOT ENOUGH PERMISSIONS TO PERFORM THIS OPERATION.");
    }
    return null;
};

// Update Flag
const updateFlag = async (tData, userInfo = {}) => {
    const permissionError = checkPermissions(userInfo);
    if (permissionError) return permissionError;

    try {
        const result = await Util.mongo.findOne(deviceMongoCollection, {});
        
        if (result) {
            const updateObj = {
                ...result,
                created_time: moment().format("YYYY-MM-DD HH:mm:ss"),
                modified_time: moment().format("YYYY-MM-DD HH:mm:ss"),
                ...tData
            };

            const updateResult = await Util.mongo.updateOne(
                deviceMongoCollection,
                { _id: result._id },
                { $set: updateObj }
            );

            if (updateResult) {
                await Util.addAuditLogs(deviceMongoCollection, userInfo, "update", `${userInfo.userName} updated flags.`, JSON.stringify(updateResult));
                return createResponse(200, true, "MQTT Flag Success", updateResult);
            }
        }

        return createResponse(404, false, "MQTT Flag Error");
    } catch (error) {
        return createResponse(500, false, "MQTT Flag Error", [], error);
    }
};

// Get Data
const getData = async (tData, userInfo) => {
    try {
        const filter = {}; // Assuming filter might be added later
        const result = await Util.mongo.findAll(deviceMongoCollection, filter);

        if (result) {
            return createResponse(200, true, "MQTT Flags get Successful", result, { totalSize: result.length });
        } else {
            return createResponse(404, false, "MQTT Flags get Failed");
        }
    } catch (error) {
        return createResponse(500, false, "MQTT Flags get Error", [], error);
    }
};

module.exports = {
    updateFlag,
    getData
};