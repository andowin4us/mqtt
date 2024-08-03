const dotenv = require('dotenv');
require('dotenv').config(); 
const moment = require("moment");
const Util = require("../helper/util");
const workerHelper = require("../helper/mainWorkerHelper");
const deviceMongoCollection = "MQTTMaintainence";
const { sendEmail } = require("../common/mqttMail");

const geMaintainenceData = async (collectionName, query) => {
    // const query = { userName: userName };
    const result = await Util.mongo.findOne(deviceMongoCollection, query);

    return result;
};

const downloadMaintainenceRequest = async (tData, userInfo = {}) => {
    let finalURL = "";

    let coloum = [ "modified_time", "devices", "maintainenceType", "engineerName", "engineerContact", "startTime", "endTime", "status"];
    try {
        let filter = {};
        
        if( tData && tData.startTime ) {
            filter.startTime = { "$gte": moment(tData.startTime).format("YYYY-MM-DD HH:mm:ss") };
        }

        if( tData && tData.endTime ) {
            filter.endTime = { "$lte": moment(tData.endTime).format("YYYY-MM-DD HH:mm:ss") };
        }

        if( tData && tData.status ) {
            filter.status = tData.status;
        }

        if( tData && tData.devices ) {
            filter.devices =  { $in: tData.devices };
        }

        let sort = {
            modified_time: 1,
        }

        let finalJson = await Util.mongo.findAllSort(
            deviceMongoCollection,
            filter,
            {},
            sort
        );

        if( finalJson && finalJson.length > 0 ) {
            const workerData = {
                tData: finalJson,
                column: coloum,
                fileName: "MaintainenceLogReport",
            };
    
            const dataFromWorker = await workerHelper.mainWorkerThreadCall(
                workerData,
                tData.type || "csv"
            );
            if (dataFromWorker.statusCode === 200) {
                finalURL = dataFromWorker.status;
            }
        } else {
            return {
                success: false,
                statusCode: 404,
                message: "No data found to generate report.",
            };
        }
    } catch (e) {
        console.log("error", e);
    }

    return {
        success: true,
        statusCode: 200,
        download: `${process.env.HOSTNAME}${finalURL}`,
    };
};

const submitMaintainenceRequest = async (tData, userInfo = {}) => {
    // Required and sanity checks
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

    if(userInfo && userInfo.accesslevel && userInfo.accesslevel > 2) {
        return {
            statusCode: 404,
            success: false,
            msg: "NOT ENOUGH PERMISSIONS TO PERFORM THIS OPERATION.",
            err: "",
        };
    }

    const request = await geMaintainenceData(deviceMongoCollection, {_id: tData.id});

    if (request) {
        if (!(moment().isBetween(moment(request.startTime), moment(request.endTime)))) {
            return {
                statusCode: 404,
                success: false,
                msg: "APPROVAL DATE AND TIME EXPIRED. KINDLY UPDATE YOUR REQUEST.",
                err: "",
            };
        }

        if(["Approved", "Rejected"].includes(request.status)) {
            return {
                statusCode: 404,
                success: false,
                msg: "MAINTAINENCE FORM ALREADY SUBMITTED. KINDLY CREATE NEW REQUEST.",
                err: "",
            };
        }
    }

    let updateObj = {
        $set: {
            _id: tData.id,
            status: Boolean(tData.isApproved) ? "Approved" : "Rejected",
            modified_time: moment().format("YYYY-MM-DD HH:mm:ss")
        },
    };
    try {
        let result = await Util.mongo.updateOne(
            deviceMongoCollection,
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
                msg: "MQTTMaintainence Config Success",
                status: result,
            };
        } else {
            return {
                statusCode: 404,
                success: false,
                msg: "MQTTMaintainence Config Error",
                status: [],
            };
        }
    } catch (error) {
        return {
            statusCode: 500,
            success: false,
            msg: "MQTTMaintainence Config Error",
            status: [],
            err: error,
        };
    }
};

const createMaintainenceRequest = async (tData, userInfo = {}) => {
    let tCheck = await Util.checkQueryParams(tData, {
        id: "required|string",
        devices: "required|array",
        maintainenceType: "required|string",
        engineerName: "required|string",
        engineerContact: "required|string",
        startTime: "required|string",
        endTime: "required|string"
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
        let createObj = {
            _id: tData.id,
            devices: tData.devices,
            maintainenceType: tData.maintainenceType,
            engineerName: tData.engineerName,
            engineerContact: tData.engineerContact,
            startTime: moment(tData.startTime).format("YYYY-MM-DD HH:mm:ss"),
            endTime: moment(tData.endTime).format("YYYY-MM-DD HH:mm:ss"),
            status: "Pending",
            created_time: moment().format("YYYY-MM-DD HH:mm:ss"),
            modified_time: moment().format("YYYY-MM-DD HH:mm:ss")
        };

        let result = await Util.mongo.insertOne(
            deviceMongoCollection,
            createObj
        );

        if (result) {
            let getFlagData = await geMaintainenceData("MQTTFlag", {});
            for (let i = 0; i < tData.devices.length; i++) {
                let deviceData = await geMaintainenceData("MQTTDevice", {deviceId: tData.devices[i]});
                if (deviceData) {
                    let sendEmailResponse = await sendEmail(getFlagData.superUserMails, 
                        { DeviceName: deviceData.deviceName, 
                            DeviceId: deviceData.deviceId, 
                            Action: "Maintainence Request raised.", 
                            MacId: deviceData.mqttMacId, 
                            TimeofActivity: moment().format("YYYY-MM-DD HH:mm:ss")
                        }, getFlagData
                    );
                    sendEmailResponse = JSON.parse(JSON.stringify(sendEmailResponse));
        
                    let mailResponse = {
                        ...sendEmailResponse,
                        status: sendEmailResponse.rejected.length > 0 ? "failed" : "success"
                    }
        
                    await Util.mongo.insertOne("MQTTNotify", mailResponse);
                }
            }

            await Util.addAuditLogs(
                deviceMongoCollection,
                userInfo,
                JSON.stringify(result)
            );
            return {
                statusCode: 200,
                success: true,
                msg: "MQTTMaintainence Created Successfull",
                status: result,
            };
        } else {
            return {
                statusCode: 404,
                success: false,
                msg: "MQTTMaintainence Create Failed",
                status: [],
            };
        }
    } catch (error) {
        console.log("error", error);
        return {
            statusCode: 500,
            success: false,
            msg: "MQTTMaintainence Create Error",
            status: [],
            err: error,
        };
    }
};

const getMaintainenceRequest = async (tData, userInfo = {}) => {
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

        if( tData && tData.devices ) {
            filter.devices =  { $in: tData.devices };
        }

        if( tData && tData.status ) {
            filter.status = tData.status;
        }

        if( tData && tData.startTime ) {
            filter.startTime = { "$gte": moment(tData.startTime).format("YYYY-MM-DD HH:mm:ss") };
        }

        if( tData && tData.endTime ) {
            filter.endTime = { "$lte": moment(tData.endTime).format("YYYY-MM-DD HH:mm:ss") };
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
                msg: "MQTTMaintainence get Successfull",
                status: snatizedData[0].totalData,
                totalSize: snatizedData[0].totalSize,
            };
        } else {
            return {
                statusCode: 404,
                success: false,
                msg: "MQTTMaintainence get Failed",
                status: [],
            };
        }
    } catch (error) {
        return {
            statusCode: 500,
            success: false,
            msg: "MQTTMaintainence get Error",
            status: [],
            err: error,
        };
    }
};

const updateMaintainenceRequest = async (tData, userInfo = {}) => {
    // Required and sanity checks
    let tCheck = await Util.checkQueryParams(tData, {
        id: "required|string",
        devices: "required|array",
        maintainenceType: "required|string",
        engineerName: "required|string",
        engineerContact: "required|string",
        startTime: "required|string",
        endTime: "required|string"
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
            devices: tData.devices,
            maintainenceType: tData.maintainenceType,
            engineerName: tData.engineerName,
            engineerContact: tData.engineerContact,
            startTime: moment(tData.startTime).format("YYYY-MM-DD HH:mm:ss"),
            endTime: moment(tData.endTime).format("YYYY-MM-DD HH:mm:ss"),
            status: "Pending",
            modified_time: moment().format("YYYY-MM-DD HH:mm:ss")
        }
    };
    try {
        let getExistingMaintainence = await geMaintainenceData(deviceMongoCollection, {_id: tData.id, status: "Pending"});
        
        if (getExistingMaintainence && getExistingMaintainence._id) {
            let result = await Util.mongo.updateOne(deviceMongoCollection, {_id: tData.id}, updateObj);
            if (result) {
                let getFlagData = await geMaintainenceData("MQTTFlag", {});
                for (let i = 0; i < tData.devices.length; i++) {
                    let deviceData = await geMaintainenceData("MQTTDevice", {deviceId: tData.devices[i]});
                    if (deviceData) {
                        let sendEmailResponse = await sendEmail(getFlagData.superUserMails, 
                            { DeviceName: deviceData.deviceName, 
                                DeviceId: deviceData.deviceId, 
                                Action: "Maintainence Request raised.", 
                                MacId: deviceData.mqttMacId, 
                                TimeofActivity: moment().format("YYYY-MM-DD HH:mm:ss")
                            }, getFlagData
                        );
                        sendEmailResponse = JSON.parse(JSON.stringify(sendEmailResponse));
            
                        let mailResponse = {
                            ...sendEmailResponse,
                            status: sendEmailResponse.rejected.length > 0 ? "failed" : "success"
                        }
            
                        await Util.mongo.insertOne("MQTTNotify", mailResponse);
                    }
                }

                await Util.addAuditLogs(
                    deviceMongoCollection,
                    userInfo,
                    JSON.stringify(result)
                );
    
                return {
                    statusCode: 200,
                    success: true,
                    msg: "MQTTMaintainence update Success",
                    status: result,
                };
            } else {
                return {
                    statusCode: 404,
                    success: false,
                    msg: "MQTTMaintainence Error",
                    status: [],
                };
            }
        } else {
            return {
                statusCode: 404,
                success: false,
                msg: "MQTTMaintainence Not found or already approved.",
                status: [],
            };
        }
    } catch (error) {
        return {
            statusCode: 500,
            success: false,
            msg: "MQTTMaintainence Error",
            status: [],
            err: error,
        };
    }
};

module.exports = {
    downloadMaintainenceRequest,
    submitMaintainenceRequest,
    createMaintainenceRequest,
    getMaintainenceRequest,
    updateMaintainenceRequest
};