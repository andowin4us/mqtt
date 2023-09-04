const Util = require("../helper/util");
const deviceMongoCollection = "MQTTDeviceConfig";
const dotenv = require("dotenv");
const moment = require("moment");
const MQTT = require('../helper/mqtt');
let MAX_LOG_COUNT = 40;

const duplicate = async (logCount, deviceId) => {
    const query = { logCount: logCount, deviceId: deviceId };
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
        if (configDetails && configDetails.deviceId) {
            let result = await Util.mongo.remove(deviceMongoCollection, {
                _id: tData.id,
            });
            if (result) {
                await Util.addAuditLogs(
                    deviceMongoCollection,
                    userInfo,
                    JSON.stringify(result)
                );
                return {
                    statusCode: 200,
                    success: true,
                    msg: "MQTT device Config Deleted Successfull",
                    status: result,
                };
            } else {
                return {
                    statusCode: 404,
                    success: false,
                    msg: "MQTT device Config Deleted Failed",
                    status: [],
                };
            }
        } else {
            return {
                statusCode: 404,
                success: false,
                msg: "MQTT device Config Deleted Failed",
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
        timeInput: "required|string",
        temperature: "required|string",
        humidity: "required|string",
        logCount: "required|string",
        sendingTopic: "required|string",
        deviceId: "required|string"
    });

    if (tCheck && tCheck.error && tCheck.error == "PARAMETER_ISSUE") {
        return {
            statusCode: 404,
            success: false,
            msg: "PARAMETER_ISSUE",
            err: tCheck,
        };
    }

    let updateObj = {
        $set: {
            _id: tData.id,
            deviceId: tData.deviceId,
            timeInput: tData.timeInput,
            temperature: tData.temperature,
            humidity: tData.humidity,
            logCount: tData.logCount,
            sendingTopic: tData.sendingTopic,
            modified_time: moment().format("YYYY-MM-DD HH:mm:ss")
        },
    };
    try {
        const resultDevice = await Util.mongo.findOne("MQTTDevice", {deviceId: tData.deviceId});

        console.log("resultDevice", resultDevice);
        if(resultDevice && resultDevice._id) {
            let result = await Util.mongo.updateOne(
                deviceMongoCollection,
                { _id: tData.id },
                updateObj
            );
            if (result) {
                let MQTT_URL = `mqtt://${resultDevice.mqttIP}:${resultDevice.mqttPort}`;
                let createObj = {
                    _id: tData.id,
                    deviceId: tData.deviceId,
                    timeInput: tData.timeInput,
                    temperature: tData.temperature,
                    humidity: tData.humidity,
                    logCount: tData.logCount,
                    sendingTopic: tData.sendingTopic,
                    modified_time: moment().format("YYYY-MM-DD HH:mm:ss")
                };
                new MQTT(MQTT_URL, resultDevice.mqttUserName, resultDevice.mqttPassword, resultDevice.mqttTopic, false, resultDevice, createObj);
                
                await Util.addAuditLogs(
                    deviceMongoCollection,
                    userInfo,
                    JSON.stringify(result)
                );

                return {
                    statusCode: 200,
                    success: true,
                    msg: "MQTT device Config Update Success",
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
        } else {
            return {
                statusCode: 404,
                success: false,
                msg: "MQTT device Config Create Failed",
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
        timeInput: "required|string",
        temperature: "required|string",
        humidity: "required|string",
        logCount: "required|string",
        sendingTopic: "required|string",
        deviceId: "required|string"
    });

    if (tCheck && tCheck.error && tCheck.error == "PARAMETER_ISSUE") {
        return {
            statusCode: 404,
            success: false,
            msg: "PARAMETER_ISSUE",
            err: tCheck,
        };
    }

    if(parseInt(tData.logCount) > parseInt(MAX_LOG_COUNT)) {
        return {
            statusCode: 404,
            success: false,
            msg: "PARAMETER_ISSUE",
            err: "N Log Count exceeded which is 40.",
        };
    }
    try {
        const resultDevice = await Util.mongo.findOne("MQTTDevice", {deviceId: tData.deviceId});

        console.log("resultDevice", resultDevice);
        if(resultDevice && resultDevice._id) {
            let createObj = {
                _id: tData.id,
                deviceId: tData.deviceId,
                timeInput: tData.timeInput,
                temperature: tData.temperature,
                humidity: tData.humidity,
                logCount: tData.logCount,
                sendingTopic: tData.sendingTopic,
                modified_time: moment().format("YYYY-MM-DD HH:mm:ss")
            };
            let result = await Util.mongo.insertOne(
                deviceMongoCollection,
                createObj
            );
            if (result) {
                let MQTT_URL = `mqtt://${resultDevice.mqttIP}:${resultDevice.mqttPort}`;

                new MQTT(MQTT_URL, resultDevice.mqttUserName, resultDevice.mqttPassword, resultDevice.mqttTopic, false, resultDevice, createObj);
                await Util.addAuditLogs(
                    deviceMongoCollection,
                    userInfo,
                    JSON.stringify(result)
                );
                return {
                    statusCode: 200,
                    success: true,
                    msg: "MQTT device Config Created Successfull",
                    status: result,
                };
            } else {
                return {
                    statusCode: 404,
                    success: false,
                    msg: "MQTT device Config Create Failed",
                    status: [],
                };
            }
        } else {
            return {
                statusCode: 404,
                success: false,
                msg: "MQTT device Config Create Failed",
                status: [],
            };
        }
    } catch (error) {
        return {
            statusCode: 500,
            success: false,
            msg: "MQTT device Config Create Error",
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

        filter.deviceId = tData.deviceId;

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
                msg: "MQTT device Config get Successfull",
                status: snatizedData[0].totalData,
                totalSize: snatizedData[0].totalSize,
            };
        } else {
            return {
                statusCode: 404,
                success: false,
                msg: "MQTT device Config Not Found.",
                status: [],
            };
        }
    } catch (error) {
        return {
            statusCode: 500,
            success: false,
            msg: "MQTT device Config get Error",
            status: [],
            err: error,
        };
    }
};

module.exports = {
    deleteData,
    updateData,
    createData,
    getData
};