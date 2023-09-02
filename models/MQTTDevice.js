const Util = require("../helper/util");
const deviceMongoCollection = "MQTTDevice";
const dotenv = require("dotenv");
const MQTT = require('../helper/mqtt');
const moment = require("moment");

const duplicate = async (deviceName, id) => {
    const query = { deviceName: deviceName, _id: { $ne: id } };
    const result = await Util.mongo.findOne(deviceMongoCollection, query);

    if (result) {
        return true;
    }
    return false;
};

const deleteData = async (tData, userInfo = {}) => {
    let tCheck = await Util.checkQueryParams(tData, {
        id: "required|string",
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
        let configDetails = await Util.mongo.findOne(deviceMongoCollection, {
            _id: tData.id,
        });
        if (configDetails && configDetails.deviceName) {
            let result = await Util.mongo.remove(deviceMongoCollection, {
                _id: tData.id,
            });
            if (result) {
                await Util.addAuditLogs(
                    userInfo,
                    `MQTT device : ${configDetails.deviceName.toLowerCase() || 0
                    } Deleted successfully`,
                    JSON.stringify(result)
                );
                return {
                    statusCode: 200,
                    success: true,
                    msg: "MQTT device Deleted Successfull",
                    status: result,
                };
            } else {
                return {
                    statusCode: 404,
                    success: false,
                    msg: "MQTT device Deleted Failed",
                    status: [],
                };
            }
        } else {
            return {
                statusCode: 404,
                success: false,
                msg: "MQTT device Deleted Failed",
                status: [],
            };
        }
    } catch (error) {
        return {
            statusCode: 500,
            success: false,
            msg: "MQTT device Deleted Error",
            status: [],
            err: error,
        };
    }
};

const updateData = async (tData, userInfo = {}) => {
    // Required and sanity checks
    let tCheck = await Util.checkQueryParams(tData, {
        id: "required|string",
        deviceId: "required|string",
        deviceName: "required|string",
        mqttIP: "required|string",
        mqttTopic: "required|string",
        mqttPort: "required|string",
        mqttMacId: "required|string",
        status: "required|string",
    });

    if (tCheck && tCheck.error && tCheck.error == "PARAMETER_ISSUE") {
        return {
            statusCode: 404,
            success: false,
            msg: "PARAMETER_ISSUE",
            err: tCheck,
        };
    }

    let MQTT_URL = `mqtt://${tData.mqttIP}:${tData.mqttPort}`;
    let updateObj = {
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
            modified_time: moment().format("YYYY-MM-DD HH:mm:ss")
        }
    };
    try {
        let result = await Util.mongo.updateOne(
            deviceMongoCollection,
            { _id: tData.id },
            updateObj
        );
        if (result) {
            new MQTT(MQTT_URL, tData.mqttUserName, tData.mqttPassword, tData.mqttTopic);
            await Util.addAuditLogs(
                userInfo,
                `MQTT device: ${userInfo.id || 0} Updated successfully`,
                JSON.stringify(result)
            );

            return {
                statusCode: 200,
                success: true,
                msg: "MQTT device Config Success",
                status: result,
            };
        } else {
            return {
                statusCode: 404,
                success: false,
                msg: "MQTT device Config Error",
                status: [],
            };
        }
    } catch (error) {
        return {
            statusCode: 500,
            success: false,
            msg: "MQTT device Config Error",
            status: [],
            err: error,
        };
    }
};

const createData = async (tData, userInfo = {}) => {
    let tCheck = await Util.checkQueryParams(tData, {
        id: "required|string",
        deviceId: "required|string",
        deviceName: "required|string",
        mqttIP: "required|string",
        mqttTopic: "required|string",
        mqttPort: "required|string",
        mqttMacId: "required|string"
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
        const isDublicate = await duplicate(tData.deviceName, tData.id);

        if (isDublicate) {
            return {
                statusCode: 404,
                success: false,
                msg: "DUPLICATE NAME",
                err: "",
            };
        }

        let MQTT_URL = `mqtt://${tData.mqttIP}:${tData.mqttPort}`;

        let createObj = {
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
            modified_time: moment().format("YYYY-MM-DD HH:mm:ss")
        };
        let result = await Util.mongo.insertOne(
            deviceMongoCollection,
            createObj
        );
        if (result) {
            console.log("Device created, now Initializing for events..");
            new MQTT(MQTT_URL, tData.mqttUserName, tData.mqttPassword, tData.mqttTopic);
            await Util.addAuditLogs(
                deviceMongoCollection,
                userInfo,
                `MQTT device : ${userInfo.id || 0} Created successfully`,
                JSON.stringify(result)
            );
            return {
                statusCode: 200,
                success: true,
                msg: "MQTT device Created Successfull",
                status: result,
            };
        } else {
            return {
                statusCode: 404,
                success: false,
                msg: "MQTT device Create Failed",
                status: [],
            };
        }
    } catch (error) {
        console.log("error", error);
        return {
            statusCode: 500,
            success: false,
            msg: "MQTT device Create Error",
            status: [],
            err: error,
        };
    }
};

const getData = async (tData, userInfo = {}) => {
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

        if( tData && tData.device_id ) {
            filter.device_id = tData.device_id;
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

        if( tData && tData.device_id ) {
            filter.log_line_count = tData.log_line_count;
        }

        if( tData && tData.battery_level ) {
            filter.battery_level = tData.battery_level;
        }

        if( tData && tData.mac_id ) {
            filter.mac_id = tData.mac_id;
        }

        let result = await Util.mongo.findAndPaginate(
            deviceMongoCollection,
            filter,
            {},
            tData.skip,
            tData.limit
        );
        let snatizedData = await Util.snatizeFromMongo(result);
        console.log("snatizedData", snatizedData);
        if (snatizedData) {
            return {
                statusCode: 200,
                success: true,
                msg: "MQTT device get Successfull",
                status: snatizedData[0].totalData,
                totalSize: snatizedData[0].totalSize,
            };
        } else {
            return {
                statusCode: 404,
                success: false,
                msg: "MQTT device get Failed",
                status: [],
            };
        }
    } catch (error) {
        return {
            statusCode: 500,
            success: false,
            msg: "MQTT device get Error",
            status: [],
            err: error,
        };
    }
};

const assignMQTTDevice = async (tData, userInfo = {}) => {
    let tCheck = await Util.checkQueryParams(tData, {
        userId: "required|string",
        deviceId: "required|string",
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
        let createObj = {
            _id: tData.id,
            userId: userInfo.userId,
            deviceId: tData.deviceId,
        };

        let result = await Util.mongo.insertOne(
            "MQTTDeviceMapping",
            createObj
        );
        if (result) {
            await Util.addAuditLogs(
                deviceMongoCollection,
                userInfo,
                `MQTT device : ${userInfo.id || 0} Assigned successfully`,
                JSON.stringify(result)
            );
            return {
                statusCode: 200,
                success: true,
                msg: "MQTT device Assigned Successfull",
                status: result,
            };
        } else {
            return {
                statusCode: 404,
                success: false,
                msg: "MQTT device Assigned Failed",
                status: [],
            };
        }
    } catch (error) {
        return {
            statusCode: 500,
            success: false,
            msg: "MQTT device Assigned Error",
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
    assignMQTTDevice
};