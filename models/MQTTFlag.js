const Util = require("../helper/util");
const moment = require("moment");
const MODULE_NAME = "DEVICE_CONFIG";
const deviceMongoCollection = "MQTTFlag";
const { MongoClient } = require('mongodb');

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

            if (result && result.useRemoteMongo === true) {
                if (result.REMOTE_MONGO_HOST) {
                    const remoteMongoUrl = `mongodb+srv://${result.REMOTE_MONGO_USERNAME}:${result.REMOTE_MONGO_PASSWORD}@${result.REMOTE_MONGO_HOST}/?retryWrites=true&w=majority`;
                    let serverStatus = await checkMongoConnection(remoteMongoUrl)

                    if (serverStatus === true) {
                        await Util.addAuditLogs(MODULE_NAME, userInfo, "update", `Remote mongo connect success.`, "success", JSON.stringify(updateResult));
                    } else {
                        await Util.addAuditLogs(MODULE_NAME, userInfo, "update", `Remote mongo connect failed.`, "failure", JSON.stringify(updateResult));
                    }
                }
            }

            if (updateResult) {
                await Util.addAuditLogs(MODULE_NAME, userInfo, "update", `${userInfo.userName} updated the Device Congfigurations.`, "success", JSON.stringify(updateResult));
                return createResponse(200, true, "MQTT Flag Success", updateResult);
            }
        }

        return createResponse(404, false, "MQTT Flag Error");
    } catch (error) {
        await Util.addAuditLogs(MODULE_NAME, userInfo, "update", `${userInfo.userName} updated the Device Congfigurations.`, "failure", {});
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

async function checkMongoConnection(connectionUrl) {
    const client = new MongoClient(connectionUrl);
    let serverStatus = false;
    try {
        await client.connect();
        const adminDb = client.db().admin();
        serverStatus = await adminDb.ping();

        if (serverStatus && serverStatus.ok === 1) {
            serverStatus = true;
        }
    } catch (error) {
        serverStatus = false;
    } finally {
        await client.close();
    }

    return serverStatus;
}

module.exports = {
    updateFlag,
    getData
};