const Util = require("../helper/util");
const deviceMongoCollection = "MQTTDevice";
const MODULE_NAME = "DEVICE";
const MQTT = require('../helper/mqtt');
const moment = require("moment");
const { publishMessage } = require("../common/mqttCommon");
const dotenv = require('dotenv');
dotenv.config({ path: process.env.ENV_PATH || '.env' });
const BullQueueService = require('../common/BullQueueService');
const redisUrl = `redis://${process.env.REDIS_HOST}:6379`;
const emailQueueService = new BullQueueService('email', redisUrl);

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

const duplicate = async (deviceName, deviceId, mqttMacId) => {
    const query = {
        $or: [
            { deviceId: deviceId },
            { deviceName: deviceName },
            { mqttMacId: mqttMacId }
        ]
    };
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
            MQTT.initialize(MQTT_URL, configDetails.mqttUserName, configDetails.mqttPassword, configDetails.mqttTopic, true);
        }

        await Util.addAuditLogs(MODULE_NAME, userInfo, "delete", `${userInfo.userName} deleted device ${configDetails.deviceName}.`, "success", JSON.stringify(result));
        return handleSuccess("MQTT device Deleted Successfully", result);
    } catch (error) {
        await Util.addAuditLogs(MODULE_NAME, userInfo, "delete", `${userInfo.userName} deleted device.`, "failure", {});
        return handleError("MQTT device Deletion Error", error);
    }
};

const updateData = async (tData, userInfo = {}) => {
    const validation = await Util.checkQueryParams(tData, {
        id: "required|string",
        deviceId: "required|string",
        deviceName: "required|string",
        mqttIP: "required|string",
        mqttPort: "required|string",
        mqttMacId: "required|string"
    });

    if (validation?.error === "PARAMETER_ISSUE") return handleParameterIssue(validation);

    if (userInfo.accesslevel > 1) return handlePermissionIssue();
    let topicsBe = "WIFI,STATE,Heartbeat,RELAY,POWER,Power,MQTT,Power/State,Logs,DOOR,Energy,Weight,process_status,super_access,status,Relay/State,State";

    const MQTT_URL = `mqtt://${tData.mqttIP}:${tData.mqttPort}`;

    const updateObj = {
        $set: {
            _id: tData.id,
            deviceId: tData.deviceId,
            deviceName: tData.deviceName,
            mqttIP: tData.mqttIP,
            mqttUserName: tData.mqttUserName,
            mqttPassword: tData.mqttPassword,
            mqttTopic: topicsBe.split(','),
            mqttUrl: MQTT_URL,
            mqttMacId: tData.mqttMacId,
            mqttPort: tData.mqttPort,
            mqttAliasName: tData.mqttAliasName ? tData.mqttAliasName : "",
            modified_time: moment().format("YYYY-MM-DD HH:mm:ss")
        }
    };

    try {
        const result = await Util.mongo.updateOne(deviceMongoCollection, { _id: tData.id }, updateObj);
        if (!result) return handleError("MQTT device Config Error");

        MQTT.initialize(MQTT_URL, tData.mqttUserName, tData.mqttPassword, tData.mqttTopic, false);
        await Util.addAuditLogs(MODULE_NAME, userInfo, "update", `${userInfo.userName} updated device ${tData.deviceName}.`, "success", JSON.stringify(result));
        return handleSuccess("MQTT device Config Successful", result);
    } catch (error) {
        await Util.addAuditLogs(MODULE_NAME, userInfo, "update", `${userInfo.userName} updated device ${tData.deviceName}.`, "failure", {});
        return handleError("MQTT device Config Error", error);
    }
};

const createData = async (tData, userInfo = {}) => {
    const validation = await Util.checkQueryParams(tData, {
        id: "required|string",
        deviceId: "required|string",
        deviceName: "required|string",
        mqttIP: "required|string",
        mqttPort: "required|string",
        mqttMacId: "required|string"
    });

    if (validation?.error === "PARAMETER_ISSUE") return handleParameterIssue(validation);

    if (userInfo.accesslevel > 1) return handlePermissionIssue();

    try {
        if (await duplicate(tData.deviceName, tData.deviceId, tData.mqttMacId)) {
            return {
                statusCode: 400,
                success: false,
                msg: "DUPLICATE DEVICE NAME, MAC OR ID",
                err: "",
            };
        }

        let topicsBe = "WIFI,STATE,Heartbeat,RELAY,POWER,Power,MQTT,Power/State,Logs,DOOR,Energy,Weight,process_status,super_access,status,Relay/State,State";

        const MQTT_URL = `mqtt://${tData.mqttIP}:${tData.mqttPort}`;
        const createObj = {
            _id: tData.id,
            deviceId: tData.deviceId,
            deviceName: tData.deviceName,
            mqttIP: tData.mqttIP,
            mqttUserName: tData.mqttUserName,
            mqttPassword: tData.mqttPassword,
            mqttTopic: topicsBe.split(','),
            mqttUrl: MQTT_URL,
            mqttMacId: tData.mqttMacId,
            status: "Active",
            mqttPort: tData.mqttPort,
            mqttStatusDetails: { mqttRelayState: false },
            mqttAliasName: tData.mqttAliasName ? tData.mqttAliasName : "",
            created_time: moment().format("YYYY-MM-DD HH:mm:ss"),
            modified_time: moment().format("YYYY-MM-DD HH:mm:ss"),
        };

        const result = await Util.mongo.insertOne(deviceMongoCollection, createObj);
        if (!result) return handleError("MQTT device Creation Failed");

        const configDetailsCheckExisting = await Util.mongo.findOne(deviceMongoCollection, { mqttIP: tData.mqttIP });

        if (!configDetailsCheckExisting) {
            MQTT.initialize(MQTT_URL, tData.mqttUserName, tData.mqttPassword, tData.mqttTopic, false);
        }
        await Util.addAuditLogs(MODULE_NAME, userInfo, "create", `${userInfo.userName} has created a device ${tData.deviceName}.`, "success", JSON.stringify(result));
        return handleSuccess("MQTT device Created Successfully", result);
    } catch (error) {
        await Util.addAuditLogs(MODULE_NAME, userInfo, "create", `${userInfo.userName} has created a device ${tData.deviceName}.`, "failure", {});
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
        let filter = {};
        if( userInfo && userInfo.accesslevel && userInfo.accesslevel === 3 ) {
            filter.userName = userInfo.userName;
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

        if (tData && tData.mqttMacId) {
            filter.mqttMacId = tData.mqttMacId;
        }

        if (tData && tData.mqttAliasName) {
            filter.mqttAliasName = tData.mqttAliasName;
        }

        if (tData && tData.state) {
            filter.mqttStatusDetails.STATE = tData.state;
        }

        const result = await Util.mongo.findAndPaginate(deviceMongoCollection, filter, {}, tData.skip, tData.limit);
        const sanitizedData = await Util.snatizeFromMongo(result);

        if (!sanitizedData) return handleError("MQTT device Retrieval Failed");

        return handleSuccess("MQTT device Retrieval Successful", sanitizedData[0].totalData);
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
        const userDetails = await Util.mongo.findOne("MQTTUser", { _id: tData.userId });
        const updateObj = {
            $set: {
                userName: userDetails.userName
            }
        };

        const result = await Util.mongo.updateOne(deviceMongoCollection, { _id: tData.deviceId }, updateObj);
        if (!result) return handleError("MQTT device Assignment Failed");

        await Util.addAuditLogs(MODULE_NAME, userInfo, "mapping", `${userInfo.userName} mapped device to Supervisor User.`, "success", JSON.stringify(result));
        return handleSuccess("MQTT device Assigned Successfully", result);
    } catch (error) {
        await Util.addAuditLogs(MODULE_NAME, userInfo, "mapping", `${userInfo.userName} mapped device to Supervisor User.`, "failure", JSON.stringify(result));
        return handleError("MQTT device Assignment Error", error);
    }
};

const relayTriggerOnOrOffMQTTDevice = async (tData, userInfo = {}) => {
    const validation = await Util.checkQueryParams(tData, {
        deviceId: "required|string"
    });

    if (validation?.error === "PARAMETER_ISSUE") return handleParameterIssue(validation);
    if (userInfo.accesslevel > 1) return handlePermissionIssue();
    try {
        const device = await Util.mongo.findOne(deviceMongoCollection, { deviceId: tData.deviceId });
        if (!device) return handleError("MQTT device Not Found");

        const MQTT_URL = `mqtt://${device.mqttIP}:${device.mqttPort}`;
        const messageSend = `${tData.mqttRelayState ? "ON" : "OFF"},${device.deviceId}`;
        await publishMessage(MQTT_URL, device.mqttUserName, device.mqttPassword, messageSend);

        // Add email sending to the Bull queue
        await emailQueueService.addJob({ device, message: `Relay triggered ${tData.mqttRelayState ? "ON" : "OFF"} for device ${device.deviceName}.` });

        let result = await Util.mongo.updateOne(deviceMongoCollection, { deviceId: tData.deviceId }, {
            $set: {
                "mqttStatusDetails.mqttRelayState": tData.mqttRelayState,
                status: tData.mqttRelayState ? "InActive" : "Active",
                modified_time: moment().format("YYYY-MM-DD HH:mm:ss")
            }
        });

        if (!tData.mqttRelayState) {
            await Util.mongo.updateMany("MQTTLogger", { device_id: tData.deviceId, visibleTo: 1 }, {
                $set: {
                    visibleTo: 2
                }
            });
        }

        await Util.addAuditLogs(MODULE_NAME, userInfo, `Relay ${tData.mqttRelayState ? "ON" : "OFF"}`, 
            `${userInfo.userName} has triggered the relay ${tData.mqttRelayState ? "ON" : "OFF"} via the Toggle Button.`, 
            "success", JSON.stringify(result));
        
        return handleSuccess("MQTT device Relay Triggered Successfully", {});
    } catch (error) {
        await Util.addAuditLogs(MODULE_NAME, userInfo, `Relay ${tData.mqttRelayState ? "ON" : "OFF"}`, 
            `${userInfo.userName} has triggered the relay ${tData.mqttRelayState ? "ON" : "OFF"} via the Toggle Button.`, 
            "failure", {});
        
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
        const mqtt = MQTT.initialize(MQTT_URL, device.mqttUserName, device.mqttPassword, device.mqttTopic, false);

        mqtt.mqttClient.pingreq();
        return handleSuccess("MQTT device Pinged Successfully", {});
    } catch (error) {
        return handleError("MQTT device Ping Error", error);
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
};