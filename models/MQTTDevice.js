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

    if(userInfo && userInfo.accesslevel && userInfo.accesslevel > 1) {
        return {
            statusCode: 404,
            success: false,
            msg: "NOT ENOUGH PERMISSIONS TO PERFORM THIS OPERATION.",
            err: "",
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
                let MQTT_URL = `mqtt://${configDetails.mqttIP}:${configDetails.mqttPort}`;
                new MQTT(MQTT_URL, configDetails.mqttUserName, configDetails.mqttPassword, configDetails.mqttTopic, true);

                await Util.addAuditLogs(
                    deviceMongoCollection,
                    userInfo,
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
        mqttTopic: "required|array",
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

    if(userInfo && userInfo.accesslevel && userInfo.accesslevel > 1) {
        return {
            statusCode: 404,
            success: false,
            msg: "NOT ENOUGH PERMISSIONS TO PERFORM THIS OPERATION.",
            err: "",
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
            mqttPort: tData.mqttPort,
            mqttExtraReceipe: tData.mqttExtraReceipe ? { ...tData.mqttExtraReceipe }: {},
            issue: moment(tData.issue).format("YYYY-MM-DD HH:mm:ss"),
            expiry: moment(tData.expiry).format("YYYY-MM-DD HH:mm:ss"),
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
            
            if(tData.status === "Active") {
                new MQTT(MQTT_URL, tData.mqttUserName, tData.mqttPassword, tData.mqttTopic, false);
            }
            else {
                new MQTT(MQTT_URL, tData.mqttUserName, tData.mqttPassword, tData.mqttTopic, true);
            }
            await Util.addAuditLogs(
                deviceMongoCollection,
                userInfo,
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
        mqttTopic: "required|array",
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

    if(userInfo && userInfo.accesslevel && userInfo.accesslevel > 1) {
        return {
            statusCode: 404,
            success: false,
            msg: "NOT ENOUGH PERMISSIONS TO PERFORM THIS OPERATION.",
            err: "",
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
            mqttPort: tData.mqttPort,
            mqttExtraReceipe: tData.mqttExtraReceipe ? { ...tData.mqttExtraReceipe }: {},
            
            issue: moment(tData.issue).format("YYYY-MM-DD HH:mm:ss"),
            expiry: moment(tData.expiry).format("YYYY-MM-DD HH:mm:ss"),
            created_time: moment().format("YYYY-MM-DD HH:mm:ss"),
            modified_time: moment().format("YYYY-MM-DD HH:mm:ss")
        };
        let result = await Util.mongo.insertOne(
            deviceMongoCollection,
            createObj
        );
        if (result) {
            console.log("Device created, now Initializing for events..");
            new MQTT(MQTT_URL, tData.mqttUserName, tData.mqttPassword, tData.mqttTopic, false);
            await Util.addAuditLogs(
                deviceMongoCollection,
                userInfo,
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

        if( userInfo && userInfo.accesslevel && userInfo.accesslevel === 3 ) {
            filter.userId = userInfo.userId;
            if( tData && tData.deviceId ) {
                filter.deviceId = tData.deviceId;
            }
        } else {
            if( tData && tData.deviceId ) {
                filter.deviceId = tData.deviceId;
            }
        }
        if( tData && tData.deviceName ) {
            filter.deviceName = tData.deviceName;
        }

        if( tData && tData.status ) {
            filter.status = tData.status;
        }

        let result = await Util.mongo.findAndPaginate(
            deviceMongoCollection,
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
        id: "required|string",
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

    if(userInfo && userInfo.accesslevel && userInfo.accesslevel > 2) {
        return {
            statusCode: 404,
            success: false,
            msg: "NOT ENOUGH PERMISSIONS TO PERFORM THIS OPERATION.",
            err: "",
        };
    }
    
    try {
        let updateObj = {
            $set: {
                userId: tData.userId,
                modified_time: moment().format("YYYY-MM-DD HH:mm:ss")
            }
        };

        let result = await Util.mongo.updateOne(
            deviceMongoCollection,
            { deviceId: tData.deviceId },
            updateObj
        );
        if (result) {
            await Util.addAuditLogs(
                deviceMongoCollection,
                userInfo,
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

const relayTriggerOffMQTTDevice = async (tData, userInfo = {}) => {
    let tCheck = await Util.checkQueryParams(tData, {
        id: "required|string"
    });

    if (tCheck && tCheck.error && tCheck.error == "PARAMETER_ISSUE") {
        return {
            statusCode: 404,
            success: false,
            msg: "PARAMETER_ISSUE",
            err: tCheck,
        };
    }

    if(userInfo && userInfo.accesslevel && userInfo.accesslevel > 1) {
        return {
            statusCode: 404,
            success: false,
            msg: "NOT ENOUGH PERMISSIONS TO PERFORM THIS OPERATION.",
            err: "",
        };
    }
    
    try {
        const resultDevice = await Util.mongo.findOne("MQTTDevice", {_id: tData.id});

        if(resultDevice && resultDevice._id) {
            let updateObj = {
                $set: {
                    status: "Active",
                    modified_time: moment().format("YYYY-MM-DD HH:mm:ss")
                }
            };

            let result = await Util.mongo.updateOne(
                deviceMongoCollection,
                { _id: tData.id },
                updateObj
            );
            if (result) {
                let MQTT_URL = `mqtt://${resultDevice.mqttIP}:${resultDevice.mqttPort}`;
                new MQTT(MQTT_URL, resultDevice.mqttUserName, resultDevice.mqttPassword, resultDevice.mqttTopic, false, resultDevice, "OFF");
                await Util.addAuditLogs(
                    deviceMongoCollection,
                    userInfo,
                    JSON.stringify(result)
                );
                return {
                    statusCode: 200,
                    success: true,
                    msg: "MQTT device Trigger Successfull",
                    status: result,
                };
            } else {
                return {
                    statusCode: 404,
                    success: false,
                    msg: "MQTT device Trigger Failed",
                    status: [],
                };
            }
        } else {
            return {
                statusCode: 404,
                success: false,
                msg: "MQTT device Not Found",
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
    assignMQTTDevice,
    relayTriggerOffMQTTDevice
};