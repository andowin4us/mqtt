const Util = require("../helper/util");
const deviceMongoCollection = "MQTTLocation";
const MODULE_NAME = "LOCATION";
const moment = require("moment");
const dotenv = require('dotenv');
dotenv.config({ path: process.env.ENV_PATH || '.env' });

const handleParameterIssue = (error) => ({
    statusCode: 400,
    success: false,
    msg: "PARAMETER_ISSUE",
    err: error,
});

const handlePermissionIssue = () => ({
    statusCode: 403,
    success: false,
    msg: "NOT ENOUGH PERMISSIONS TO PERFORM THIS OPERATION.",
    err: "",
});

const handleError = (msg, error) => ({
    statusCode: 500,
    success: false,
    msg,
    status: [],
    err: error,
});

const handleSuccess = (msg, result) => ({
    statusCode: 200,
    success: true,
    msg,
    status: result,
});

const duplicate = async (locationName) => {
    const result = await Util.mongo.findOne(deviceMongoCollection, { locationName: locationName });
    return Boolean(result);
};

const deleteData = async (tData, userInfo = {}) => {
    const validation = await Util.checkQueryParams(tData, { id: "required|string" });
    if (validation?.error === "PARAMETER_ISSUE") return handleParameterIssue(validation);

    if (userInfo.accesslevel > 1) return handlePermissionIssue();

    try {
        const configDetails = await Util.mongo.findOne(deviceMongoCollection, { _id: tData.id });
        const configDetailsFlag = await Util.mongo.findOne("MQTTFlag", { });
        
        if (configDetailsFlag && configDetailsFlag.location === configDetails.locationName) {
            return handleError("MQTT location Deletion Failed. Location is in use.");
        }
        const result = await Util.mongo.remove(deviceMongoCollection, { _id: tData.id });
        if (!result) return handleError("MQTT location Deletion Failed");

        await Util.addAuditLogs(MODULE_NAME, userInfo, "delete", `${userInfo.userName} deleted location ${configDetails.locationName}.`, "success", JSON.stringify(result));
        return handleSuccess("MQTT location Deleted Successfully", result);
    } catch (error) {
        await Util.addAuditLogs(MODULE_NAME, userInfo, "delete", `${userInfo.userName} deleted location.`, "failure", {});
        return handleError("MQTT location Deletion Error", error);
    }
};

const updateData = async (tData, userInfo = {}) => {
    const validation = await Util.checkQueryParams(tData, {
        id: "required|string",
        locationName: "required|string"
    });

    if (validation?.error === "PARAMETER_ISSUE") return handleParameterIssue(validation);
    if (userInfo.accesslevel > 1) return handlePermissionIssue();

    const updateObj = {
        $set: {
            _id: tData.id,
            locationName: tData.locationName,
            consumptionSlab: tData.consumptionSlab,
            modified_time: moment().tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss")
        }
    };

    try {
        const result = await Util.mongo.updateOne(deviceMongoCollection, { _id: tData.id }, updateObj);
        if (!result) return handleError("MQTT location Config Error");

        await Util.addAuditLogs(MODULE_NAME, userInfo, "update", `${userInfo.userName} updated location ${tData.deviceName}.`, "success", JSON.stringify(result));
        return handleSuccess("MQTT location Update Successfull", result);
    } catch (error) {
        await Util.addAuditLogs(MODULE_NAME, userInfo, "update", `${userInfo.userName} updated location ${tData.deviceName}.`, "failure", {});
        return handleError("MQTT location Update Error", error);
    }
};

const createData = async (tData, userInfo = {}) => {
    const validation = await Util.checkQueryParams(tData, {
        id: "required|string",
        locationName: "required|string"
    });

    if (validation?.error === "PARAMETER_ISSUE") return handleParameterIssue(validation);
    if (userInfo.accesslevel > 1) return handlePermissionIssue();

    try {
        if (await duplicate(tData.locationName)) {
            return {
                statusCode: 400,
                success: false,
                msg: "DUPLICATE LOCATION NAME",
                err: "",
            };
        }

        const createObj = {
            _id: tData.id,
            locationName: tData.locationName,
            consumptionSlab: tData.consumptionSlab,
            created_time: moment().tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss"),
            modified_time: moment().tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss")
        };

        const result = await Util.mongo.insertOne(deviceMongoCollection, createObj);
        if (!result) return handleError("MQTT location Creation Failed");

        await Util.addAuditLogs(MODULE_NAME, userInfo, "create", `${userInfo.userName} has created a location ${tData.locationName}.`, "success", JSON.stringify(result));
        return handleSuccess("MQTT location Created Successfully", result);
    } catch (error) {
        await Util.addAuditLogs(MODULE_NAME, userInfo, "create", `${userInfo.userName} has created a location ${tData.locationName}.`, "failure", {});
        return handleError("MQTT location Creation Error", error);
    }
};

const getData = async (tData, userInfo = {}) => {
    const validation = await Util.checkQueryParams(tData, {
        skip: "numeric",
        limit: "numeric",
    });

    if (validation?.error === "PARAMETER_ISSUE") return handleParameterIssue(validation);

    try {
        let filter = {};

        if (tData && tData.locationName) {
            filter.locationName = tData.locationName;
        }

        const result = await Util.mongo.findAndPaginate(deviceMongoCollection, filter, {}, tData.skip, tData.limit);
        const sanitizedData = await Util.snatizeFromMongo(result);

        if (!sanitizedData) return handleError("MQTT location Retrieval Failed");

        return handleSuccess("MQTT location Retrieval Successful", sanitizedData[0].totalData);
    } catch (error) {
        return handleError("MQTT location Retrieval Error", error);
    }
};

module.exports = {
    deleteData,
    updateData,
    createData,
    getData
};