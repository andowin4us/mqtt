const Util = require("../helper/util");
const deviceMongoCollection = "MQTTDeviceConfig";
const dotenv = require("dotenv");
const moment = require("moment");
const MQTT = require('../helper/mqtt');
let MAX_LOG_COUNT = 40;

const duplicate = async (receipeName, deviceId) => {
    const query = { receipeName: receipeName, deviceId: deviceId };
    const result = await Util.mongo.findOne("MQTTDeviceReceipe", query);

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

    if(userInfo && userInfo.accesslevel && userInfo.accesslevel > 2) {
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
        receipeId: "required|string",
        // temperature: "required|string",
        // humidity: "required|string",
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

    if(userInfo && userInfo.accesslevel && userInfo.accesslevel > 2) {
        return {
            statusCode: 404,
            success: false,
            msg: "NOT ENOUGH PERMISSIONS TO PERFORM THIS OPERATION.",
            err: "",
        };
    }

    let updateObj = {
        $set: {
            _id: tData.id,
            deviceId: tData.deviceId,
            receipeId: tData.receipeId,
            // temperature: tData.temperature,
            // humidity: tData.humidity,
            logCount: tData.logCount,
            sendingTopic: tData.sendingTopic,
            modified_time: moment().format("YYYY-MM-DD HH:mm:ss")
        },
    };
    try {
        const resultDevice = await Util.mongo.findOne("MQTTDevice", {deviceId: tData.deviceId});

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
                    receipeId: tData.receipeId,
                    // temperature: tData.temperature,
                    // humidity: tData.humidity,
                    logCount: tData.logCount,
                    sendingTopic: tData.sendingTopic,
                    created_time: moment().format("YYYY-MM-DD HH:mm:ss"),
                    modified_time: moment().format("YYYY-MM-DD HH:mm:ss")
                };

                let dataKeys = Object.keys(tData);
                for (let i = 0; i < dataKeys.length; i++) {
                    if (dataKeys[i] !== 'id') {
                        if (dataKeys[i] !== 'deviceId') {
                            if (dataKeys[i] !== 'sendingTopic') {
                                if (dataKeys[i] !== 'logCount') {
                                    if (dataKeys[i] !== 'receipeId') {
                                        createObj[dataKeys[i]] = tData[Object.keys(tData)[i]];
                                    }
                                }
                            }
                        }
                    }
                }

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
        receipeId: "required|string",
        // temperature: "required|string",
        // humidity: "required|string",
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

    if(userInfo && userInfo.accesslevel && userInfo.accesslevel > 2) {
        return {
            statusCode: 404,
            success: false,
            msg: "NOT ENOUGH PERMISSIONS TO PERFORM THIS OPERATION.",
            err: "",
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

        if(resultDevice && resultDevice._id) {
            let createObj = {
                _id: tData.id,
                deviceId: tData.deviceId,
                receipeId: tData.receipeId,
                // temperature: tData.temperature,
                // humidity: tData.humidity,
                logCount: tData.logCount,
                sendingTopic: tData.sendingTopic,
                created_time: moment().format("YYYY-MM-DD HH:mm:ss"),
                modified_time: moment().format("YYYY-MM-DD HH:mm:ss")
            };

            let dataKeys = Object.keys(tData);
            for (let i = 0; i < dataKeys.length; i++) {
                // if (dataKeys[i] !== 'id') {
                    if (dataKeys[i] !== 'deviceId') {
                        if (dataKeys[i] !== 'sendingTopic') {
                            if (dataKeys[i] !== 'logCount') {
                                if (dataKeys[i] !== 'receipeId') {
                                    createObj[dataKeys[i]] = tData[Object.keys(tData)[i]];
                                }
                            }
                        }
                    }
                // }
            }

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

const createReceipeData = async (tData, userInfo = {}) => {
    let tCheck = await Util.checkQueryParams(tData, {
        id: "required|string",
        receipeName: "required|string",
        receipeStatus: "required|string",
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

    if(userInfo && userInfo.accesslevel && userInfo.accesslevel > 2) {
        return {
            statusCode: 404,
            success: false,
            msg: "NOT ENOUGH PERMISSIONS TO PERFORM THIS OPERATION.",
            err: "",
        };
    }

    try {
        const isDublicate = await duplicate(tData.receipeName, tData.deviceId);

        if (isDublicate) {
            return {
                statusCode: 404,
                success: false,
                msg: "DUPLICATE NAME",
                err: "",
            };
        }

        let createObj = {
            _id: tData.id,
            deviceId: tData.deviceId,
            receipeName: tData.receipeName,
            receipeStatus: tData.receipeStatus,
            created_time: moment().format("YYYY-MM-DD HH:mm:ss"),
            modified_time: moment().format("YYYY-MM-DD HH:mm:ss")
        };
        let result = await Util.mongo.insertOne(
            "MQTTDeviceReceipe",
            createObj
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
                msg: "MQTT Device Receipe Created Successfull",
                status: result,
            };
        } else {
            return {
                statusCode: 404,
                success: false,
                msg: "MQTT Device Receipe Create Failed",
                status: [],
            };
        }
    } catch (error) {
        return {
            statusCode: 500,
            success: false,
            msg: "MQTT Device Receipe Create Error",
            status: [],
            err: error,
        };
    }
};

const updateReceipeData = async (tData, userInfo = {}) => {
    let tCheck = await Util.checkQueryParams(tData, {
        id: "required|string",
        receipeName: "required|string",
        receipeStatus: "required|string",
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

    if(userInfo && userInfo.accesslevel && userInfo.accesslevel > 2) {
        return {
            statusCode: 404,
            success: false,
            msg: "NOT ENOUGH PERMISSIONS TO PERFORM THIS OPERATION.",
            err: "",
        };
    }
    
    try {
        const isDublicate = await duplicate(tData.receipeName, tData.deviceId);

        if (isDublicate) {
            return {
                statusCode: 404,
                success: false,
                msg: "DUPLICATE NAME",
                err: "",
            };
        }

        let updateObj = {
            $set: {
                receipeName: tData.receipeName,
                receipeStatus: tData.receipeStatus,
                modified_time: moment().format("YYYY-MM-DD HH:mm:ss")
            }
        };
        let result = await Util.mongo.updateOne(
            "MQTTDeviceReceipe",
            { _id: tData.id },
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
                msg: "MQTT Device Receipe Update Successfull",
                status: result,
            };
        } else {
            return {
                statusCode: 404,
                success: false,
                msg: "MQTT Device Receipe Update Failed",
                status: [],
            };
        }
    } catch (error) {
        return {
            statusCode: 500,
            success: false,
            msg: "MQTT Device Receipe Update Error",
            status: [],
            err: error,
        };
    }
};

const getReceipeData = async (tData, userInfo = {}) => {
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
        if( tData && tData.deviceId ) {
            filter.deviceId = tData.deviceId;
        }

        let result = await Util.mongo.findAndPaginate(
            "MQTTDeviceReceipe",
            filter,
            {},
            tData.skip,
            tData.limit
        );
        let snatizedData = await Util.snatizeFromMongo(result);

        let totalConfigData = [];
        for(let i = 0; i < snatizedData[0].totalSize; i++) {
            let receipeObj = {}
            filter.receipeId = snatizedData[0].totalData[i].id;
            let resultConfigData = await Util.mongo.findAll(
                deviceMongoCollection,
                filter
            );

            resultConfigData = resultConfigData && resultConfigData.length > 0 ? resultConfigData : [];
            receipeObj.id = filter.receipeId;
            receipeObj.receipeName = snatizedData[0].totalData[i].receipeName;
            receipeObj.receipeConfig = resultConfigData;
            
            totalConfigData.push(receipeObj);
        }
        if (snatizedData) {
            return {
                statusCode: 200,
                success: true,
                msg: "MQTT device Receipe get Successfull",
                status: totalConfigData,
                totalSize: snatizedData[0].totalSize,
            };
        } else {
            return {
                statusCode: 404,
                success: false,
                msg: "MQTT device Receipe Not Found.",
                status: [],
            };
        }
    } catch (error) {
        return {
            statusCode: 500,
            success: false,
            msg: "MQTT device Receipe get Error",
            status: [],
            err: error,
        };
    }
};

const getReceipeCommand = async (tData, userInfo = {}) => {
    let tCheck = await Util.checkQueryParams(tData, {
        deviceId: "required|string",
        receipeId: "required|string",
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
        filter.receipeId = tData.receipeId;

        let result = await Util.mongo.findAll(
            deviceMongoCollection,
            filter,
            {}
        );
        let snatizedData = await Util.snatizeFromMongo(result);
        if (snatizedData) {
            return {
                statusCode: 200,
                success: true,
                msg: "MQTT device receipe get Successfull",
                status: snatizedData,
            };
        } else {
            return {
                statusCode: 404,
                success: false,
                msg: "MQTT device receipe Not Found.",
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
    getData,
    createReceipeData,
    updateReceipeData,
    getReceipeData,
    getReceipeCommand
};