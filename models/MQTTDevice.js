const Util = require("../helper/util");
const deviceMongoCollection = "MQTTDevice";
const dotenv = require("dotenv");
const MQTT = require('../helper/mqtt');
const moment = require("moment");
const { sendEmail } = require("../common/mqttMail");
const { publishMessage } = require("../common/mqttCommon");

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

const duplicate = async (deviceName, id) => {
    const query = { deviceName, _id: { $ne: id } };
    const result = await Util.mongo.findOne(deviceMongoCollection, query);
    return Boolean(result);
};

const deleteData = async (tData, userInfo = {}) => {
    const validation = await Util.checkQueryParams(tData, { id: "required|string" });
    if (validation?.error === "PARAMETER_ISSUE") return handleParameterIssue(validation);

    if (userInfo.accesslevel > 1) return handlePermissionIssue();

    try {
        const configDetails = await Util.mongo.findOne(deviceMongoCollection, { _id: tData.id });
        if (!configDetails?.deviceName) return handleError("MQTT device Deletion Failed");

        const result = await Util.mongo.remove(deviceMongoCollection, { _id: tData.id });
        if (!result) return handleError("MQTT device Deletion Failed");

        const configDetailsCheckExisting = await Util.mongo.findOne(deviceMongoCollection, { mqttIP: configDetails.mqttIP });

        if (!configDetailsCheckExisting) {
            new MQTT(MQTT_URL, configDetails.mqttUserName, configDetails.mqttPassword, configDetails.mqttTopic, true);
        }

        await Util.addAuditLogs(deviceMongoCollection, userInfo, JSON.stringify(result));
        return handleSuccess("MQTT device Deleted Successfully", result);
    } catch (error) {
        return handleError("MQTT device Deletion Error", error);
    }
};

const updateData = async (tData, userInfo = {}) => {
    const validation = await Util.checkQueryParams(tData, {
        id: "required|string",
        deviceId: "required|string",
        deviceName: "required|string",
        mqttIP: "required|string",
        mqttTopic: "required|array",
        mqttPort: "required|string",
        mqttMacId: "required|string",
        status: "required|string",
    });

    if (validation?.error === "PARAMETER_ISSUE") return handleParameterIssue(validation);

    if (userInfo.accesslevel > 1) return handlePermissionIssue();

    const MQTT_URL = `mqtt://${tData.mqttIP}:${tData.mqttPort}`;
    const updateObj = {
        $set: {
            _id: tData.id,
            deviceId: tData.deviceId,
            deviceName: tData.deviceName,
            mqttIP: tData.mqttIP,
            mqttUserName: tData.mqttUserName,
            mqttPassword: tData.mqttPassword,
            mqttTopic: tData.mqttTopic,
            mqttUrl: MQTT_URL,
            mqttMacId: tData.mqttMacId,
            status: tData.status,
            mqttPort: tData.mqttPort,
            mqttExtraReceipe: tData.mqttExtraReceipe || {},
            modified_time: moment().format("YYYY-MM-DD HH:mm:ss"),
        }
    };

    try {
        const result = await Util.mongo.updateOne(deviceMongoCollection, { _id: tData.id }, updateObj);
        if (!result) return handleError("MQTT device Config Error");

        await Util.addAuditLogs(deviceMongoCollection, userInfo, JSON.stringify(result));
        return handleSuccess("MQTT device Config Successful", result);
    } catch (error) {
        return handleError("MQTT device Config Error", error);
    }
};

const createData = async (tData, userInfo = {}) => {
    const validation = await Util.checkQueryParams(tData, {
        id: "required|string",
        deviceId: "required|string",
        deviceName: "required|string",
        mqttIP: "required|string",
        mqttTopic: "required|array",
        mqttPort: "required|string",
        mqttMacId: "required|string"
    });

    if (validation?.error === "PARAMETER_ISSUE") return handleParameterIssue(validation);

    if (userInfo.accesslevel > 1) return handlePermissionIssue();

    try {
        if (await duplicate(tData.deviceName, tData.id)) {
            return {
                statusCode: 400,
                success: false,
                msg: "DUPLICATE NAME",
                err: "",
            };
        }

        const MQTT_URL = `mqtt://${tData.mqttIP}:${tData.mqttPort}`;
        const createObj = {
            _id: tData.id,
            deviceId: tData.deviceId,
            deviceName: tData.deviceName,
            mqttIP: tData.mqttIP,
            mqttUserName: tData.mqttUserName,
            mqttPassword: tData.mqttPassword,
            mqttTopic: tData.mqttTopic,
            mqttUrl: MQTT_URL,
            mqttMacId: tData.mqttMacId,
            status: "Active",
            mqttPort: tData.mqttPort,
            mqttExtraReceipe: tData.mqttExtraReceipe || {},
            mqttStatusDetails: { mqttRelayState: false },
            created_time: moment().format("YYYY-MM-DD HH:mm:ss"),
            modified_time: moment().format("YYYY-MM-DD HH:mm:ss"),
        };

        const result = await Util.mongo.insertOne(deviceMongoCollection, createObj);
        if (!result) return handleError("MQTT device Creation Failed");

        const configDetailsCheckExisting = await Util.mongo.findOne(deviceMongoCollection, { mqttIP: tData.mqttIP });

        if (!configDetailsCheckExisting) {
            new MQTT(MQTT_URL, tData.mqttUserName, tData.mqttPassword, tData.mqttTopic, false);
        }
        await Util.addAuditLogs(deviceMongoCollection, userInfo, JSON.stringify(result));
        return handleSuccess("MQTT device Created Successfully", result);
    } catch (error) {
        console.error("Error:", error);
        return handleError("MQTT device Creation Error", error);
    }
};

const getData = async (tData, userInfo = {}) => {
    const validation = await Util.checkQueryParams(tData, {
        skip: "numeric",
        limit: "numeric",
    });

    if (validation?.error === "PARAMETER_ISSUE") return handleParameterIssue(validation);

    try {
        if( userInfo && userInfo.accesslevel && userInfo.accesslevel === 3 ) {
            filter.userId = userInfo.userId;
            if (tData && tData.deviceId) {
                filter.deviceId = tData.deviceId;
            }
        } else {
            if (tData && tData.deviceId) {
                filter.deviceId = tData.deviceId;
            }
        }
        if (tData && tData.deviceName) {
            filter.deviceName = tData.deviceName;
        }

        if (tData && tData.status) {
            filter.status = tData.status;
        }

        const result = await Util.mongo.findAndPaginate(deviceMongoCollection, filter, {}, tData.skip, tData.limit);
        const sanitizedData = await Util.snatizeFromMongo(result);

        if (!sanitizedData) return handleError("MQTT device Retrieval Failed");

        return handleSuccess("MQTT device Retrieval Successful", {
            totalData: sanitizedData[0].totalData,
            totalSize: sanitizedData[0].totalSize,
        });
    } catch (error) {
        return handleError("MQTT device Retrieval Error", error);
    }
};

const assignMQTTDevice = async (tData, userInfo = {}) => {
    const validation = await Util.checkQueryParams(tData, {
        id: "required|string",
        userId: "required|string",
        deviceId: "required|string",
    });

    if (validation?.error === "PARAMETER_ISSUE") return handleParameterIssue(validation);

    if (userInfo.accesslevel > 2) return handlePermissionIssue();

    try {
        const updateObj = {
            $set: {
                userId: tData.userId,
                modified_time: moment().format("YYYY-MM-DD HH:mm:ss"),
            }
        };

        const result = await Util.mongo.updateOne(deviceMongoCollection, { deviceId: tData.deviceId }, updateObj);
        if (!result) return handleError("MQTT device Assignment Failed");

        await Util.addAuditLogs(deviceMongoCollection, userInfo, JSON.stringify(result));
        return handleSuccess("MQTT device Assigned Successfully", result);
    } catch (error) {
        return handleError("MQTT device Assignment Error", error);
    }
};

const relayTriggerOnOrOffMQTTDevice = async (tData, userInfo = {}) => {
    const validation = await Util.checkQueryParams(tData, {
        id: "required|string"
    });

    if (validation?.error === "PARAMETER_ISSUE") return handleParameterIssue(validation);
    if (userInfo.accesslevel > 1) return handlePermissionIssue();
    try {
        const device = await Util.mongo.findOne(deviceMongoCollection, { _id: tData.id });
        if (!device) return handleError("MQTT device Not Found");

        const MQTT_URL = `mqtt://${device.mqttIP}:${device.mqttPort}`;

        if (tData && Boolean(tData.mqttRelayState) === true) {
            let messageSend = "ON,"+device.deviceId;
            await publishMessage(MQTT_URL, device.mqttUserName, device.mqttPassword, messageSend);
            await sendEmailToUsers({...device, message: "ON"});
        } else {
            let messageSend = "OFF,"+device.deviceId;
            await publishMessage(MQTT_URL, device.mqttUserName, device.mqttPassword, messageSend);
            await sendEmailToUsers({...device, message: "OFF"});
        }
        await Util.mongo.updateOne(deviceMongoCollection, { _id: tData.id }, { $set: { "mqttStatusDetails.mqttRelayState": tData.relayState, 
            status: Boolean(tData.mqttRelayState) === true ? "InActive" : "Active" } });

        return handleSuccess("MQTT device Relay Triggered Successfully", {});
    } catch (error) {
        return handleError("MQTT device Relay Trigger Error", error);
    }
};

const pingMQTTDevice = async (tData, userInfo = {}) => {
    const validation = await Util.checkQueryParams(tData, { id: "required|string" });
    if (validation?.error === "PARAMETER_ISSUE") return handleParameterIssue(validation);

    if (userInfo.accesslevel > 1) return handlePermissionIssue();

    try {
        const device = await Util.mongo.findOne(deviceMongoCollection, { _id: tData.id });
        if (!device) return handleError("MQTT device Not Found");

        const MQTT_URL = `mqtt://${device.mqttIP}:${device.mqttPort}`;
        const mqtt = new MQTT(MQTT_URL, device.mqttUserName, device.mqttPassword, device.mqttTopic, false);

        mqtt.mqttClient.pingreq();
        return handleSuccess("MQTT device Pinged Successfully", {});
    } catch (error) {
        return handleError("MQTT device Ping Error", error);
    }
};

const sendEmailToUsers = async (tData) => {
    try {
        const getFlagData = await Util.mongo.findOne("MQTTFlag", {});

        await sendEmail(getFlagData.superUserMails, { DeviceName: tData.deviceName, 
            DeviceId: tData.deviceId, 
            Action: `Relay triggered ${tData.message} for device ${tData.deviceName}`, 
            MacId: tData.mqttMacId, 
            TimeofActivity: moment().format("YYYY-MM-DD HH:mm:ss")
        }, getFlagData);

        return handleSuccess("Email Sent Successfully", {});
    } catch (error) {
        return handleError("Email Sending Error", error);
    }
};

module.exports = {
    deleteData,
    updateData,
    createData,
    getData,
    assignMQTTDevice,
    relayTriggerOnOrOffMQTTDevice,
    pingMQTTDevice,
    sendEmailToUsers
};