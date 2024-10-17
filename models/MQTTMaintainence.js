const dotenv = require('dotenv');
dotenv.config();
const moment = require('moment');
const Util = require("../helper/util");
const workerHelper = require("../helper/mainWorkerHelper");
const deviceMongoCollection = "MQTTMaintainence";
const MODULE_NAME = "Maintainence";
const { sendEmail } = require("../common/mqttMail");

// Helper function to get maintenance data
const getMaintainenceData = async (collectionName, query) => {
    return await Util.mongo.findOne(collectionName, query);
};

// Helper function to check user permissions
const checkPermissions = (userInfo) => {
    if (userInfo && userInfo.accesslevel && userInfo.accesslevel > 2) {
        return {
            statusCode: 404,
            success: false,
            msg: "NOT ENOUGH PERMISSIONS TO PERFORM THIS OPERATION.",
            err: "",
        };
    }
    return null;
};

// Helper function to check parameters
const checkParams = async (tData, expectedParams) => {
    let tCheck = await Util.checkQueryParams(tData, expectedParams);
    if (tCheck && tCheck.error && tCheck.error === "PARAMETER_ISSUE") {
        return {
            statusCode: 404,
            success: false,
            msg: "PARAMETER_ISSUE",
            err: tCheck,
        };
    }
    return null;
};

// Download maintenance request
const downloadMaintainenceRequest = async (tData, userInfo = {}) => {
    let finalURL = "";
    const columns = ["modified_time", "devices", "engineerName", "engineerContact", "startTime", "endTime", "status"];

    try {
        let deviceIdList = [];
        if (userInfo && userInfo.accesslevel === 3) {
            let devicesAssignedToSupervisor = await Util.mongo.findAll("MQTTDevice", {userId: userInfo.id}, {});

            for (device of devicesAssignedToSupervisor) {
                deviceIdList.push(device.deviceId);
            }
        }

        if (tData.devices) {
            deviceIdList.push(tData.devices);
        }

        const filter = {
            ...(tData.startTime && { startTime: { "$gte": moment(tData.startTime).format("YYYY-MM-DD HH:mm:ss") } }),
            ...(tData.endTime && { endTime: { "$lte": moment(tData.endTime).format("YYYY-MM-DD HH:mm:ss") } }),
            ...(tData.status && { status: tData.status }),
            ...(tData.devices && { devices: { $in: deviceIdList } }),
        };

        const sort = { modified_time: 1 };
        const data = await Util.mongo.findAllSort(deviceMongoCollection, filter, {}, sort);

        if (data && data.length > 0) {
            const workerData = {
                tData: data,
                column: columns,
                fileName: "MaintainenceLogReport",
            };

            const result = await workerHelper.mainWorkerThreadCall(workerData, tData.type || "csv");

            if (result.statusCode === 200) {
                finalURL = result.status;
            } else {
                return { success: false, statusCode: result.statusCode, message: result.message };
            }
        } else {
            return { success: false, statusCode: 404, message: "No data found to generate report." };
        }
    } catch (error) {
        console.error("Error in downloadMaintainenceRequest:", error);
        return { success: false, statusCode: 500, message: "Error generating report.", err: error };
    }

    return { success: true, statusCode: 200, download: `${process.env.HOSTNAME}${finalURL}` };
};

// Submit maintenance request
const submitMaintainenceRequest = async (tData, userInfo = {}) => {
    const paramCheck = await checkParams(tData, { id: "required|string" });
    if (paramCheck) return paramCheck;

    const permissionCheck = checkPermissions(userInfo);
    if (permissionCheck) return permissionCheck;

    const request = await getMaintainenceData(deviceMongoCollection, { _id: tData.id });
    if (request) {
        // if (!moment().isBetween(moment(request.startTime), moment(request.endTime))) {
        //     return { statusCode: 404, success: false, msg: "APPROVAL DATE AND TIME EXPIRED. KINDLY UPDATE YOUR REQUEST." };
        // }
        if (["Approved", "Rejected", "Auto_Rejected"].includes(request.status)) {
            return { statusCode: 404, success: false, msg: "MAINTAINENCE FORM ALREADY SUBMITTED. KINDLY CREATE NEW REQUEST." };
        }
    }

    const updateObj = {
        $set: {
            _id: tData.id,
            status: tData.isApproved ? "Approved" : "Rejected",
            isEditable: false,
            modified_time: moment().format("YYYY-MM-DD HH:mm:ss"),
        },
    };

    try {
        const result = await Util.mongo.updateOne(deviceMongoCollection, { _id: tData.id }, updateObj);
        if (result) {
            await Util.addAuditLogs(MODULE_NAME, userInfo, `${tData.isApproved ? "Approve" : "Reject"}`, `${userInfo.userName} has ${tData.isApproved ? "Approved" : "Rejected"} Device Maintenance Request.`, "success", JSON.stringify(result));
            return { statusCode: 200, success: true, msg: "MQTTMaintainence Config Success", status: result };
        } else {
            await Util.addAuditLogs(MODULE_NAME, userInfo, `${tData.isApproved ? "Approve" : "Reject"}`, `${userInfo.userName} has ${tData.isApproved ? "Approved" : "Rejected"} Device Maintenance Request.`, "failure", JSON.stringify(result));
            return { statusCode: 404, success: false, msg: "MQTTMaintainence Config Error", status: [] };
        }
    } catch (error) {
        await Util.addAuditLogs(MODULE_NAME, userInfo, `${tData.isApproved ? "Approve" : "Reject"}`, `${userInfo.userName} has ${tData.isApproved ? "Approved" : "Rejected"} Device Maintenance Request.`, "error", error);
        return { statusCode: 500, success: false, msg: "MQTTMaintainence Config Error", status: [], err: error };
    }
};

// Create maintenance request
const createMaintainenceRequest = async (tData, userInfo = {}) => {
    const paramCheck = await checkParams(tData, {
        id: "required|string",
        devices: "required|array",
        engineerName: "required|string",
        engineerContact: "required|string",
        startTime: "required|string",
        endTime: "required|string",
    });
    if (paramCheck) return paramCheck;

    // const permissionCheck = checkPermissions(userInfo);
    // if (permissionCheck) return permissionCheck;

    const currentTime = moment();

    if (currentTime.isAfter(tData.startTime)) {
        return { statusCode: 404, success: false, msg: "START DATE CANNOT BE LESS THAN CURRENT DATE." };
    }
    if (moment(tData.startTime).isAfter(moment(tData.endTime))) {
        return { statusCode: 404, success: false, msg: "START DATE CANNOT BE GREATER THAN END DATE." };
    }

    const createObj = {
        _id: tData.id,
        devices: tData.devices,
        maintainenceType: tData.maintainenceType,
        engineerName: tData.engineerName,
        engineerContact: tData.engineerContact,
        startTime: moment(tData.startTime).format("YYYY-MM-DD HH:mm:ss"),
        endTime: moment(tData.endTime).format("YYYY-MM-DD HH:mm:ss"),
        status: "Pending",
        isEditable: true,
        created_time: moment().format("YYYY-MM-DD HH:mm:ss"),
        modified_time: moment().format("YYYY-MM-DD HH:mm:ss"),
    };

    try {
        const result = await Util.mongo.insertOne(deviceMongoCollection, createObj);
        if (result) {
            const getFlagData = await getMaintainenceData("MQTTFlag", {});
            for (const deviceId of tData.devices) {
                const deviceData = await getMaintainenceData("MQTTDevice", { deviceId: deviceId });
                if (deviceData) {
                    const emailResponse = await sendEmail(getFlagData.superUserMails, {
                        DeviceName: deviceData.deviceName,
                        DeviceId: deviceData.deviceId,
                        Action: "Maintainence Request Raised.",
                        MacId: deviceData.mqttMacId,
                        TimeofActivity: moment().format("YYYY-MM-DD HH:mm:ss"),
                    }, getFlagData, getFlagData.ccUsers, getFlagData.bccUsers);

                    const mailResponse = {
                        ...emailResponse,
                        status: emailResponse?.rejected?.length > 0 ? "failed" : "success",
                    };

                    await Util.mongo.insertOne("MQTTNotify", mailResponse);
                }
            }

            await Util.addAuditLogs(MODULE_NAME, userInfo, "create", `${userInfo.userName} has created Device Maintenance Request.`, "success", JSON.stringify(result));
            return { statusCode: 200, success: true, msg: "MQTTMaintainence Created Successfully", status: result };
        } else {
            await Util.addAuditLogs(MODULE_NAME, userInfo, "create", `${userInfo.userName} has created Device Maintenance Request.`, "failure", JSON.stringify(result));
            return { statusCode: 404, success: false, msg: "MQTTMaintainence Create Failed", status: [] };
        }
    } catch (error) {
        await Util.addAuditLogs(MODULE_NAME, userInfo, "create", `${userInfo.userName} has created Device Maintenance Request.`, "error", error);
        return { statusCode: 500, success: false, msg: "MQTTMaintainence Create Error", status: [], err: error };
    }
};

// Get maintenance request
const getMaintainenceRequest = async (tData, userInfo = {}) => {
    const paramCheck = await checkParams(tData, { skip: "numeric", limit: "numeric" });
    if (paramCheck) return paramCheck;

    try {
        let deviceIdList = [], filter = {};
        if (userInfo && userInfo.accesslevel === 3) {
            let devicesAssignedToSupervisor = await Util.mongo.findAll("MQTTDevice", {userId: userInfo.id}, {});

            if (devicesAssignedToSupervisor.length === 0) {
                return { statusCode: 200, success: true, msg: "Maintainence Get Successful", status: [], totalSize: 0 };
            }

            for (device of devicesAssignedToSupervisor) {
                deviceIdList.push(device.deviceId);
            }

            filter.devices = { $in: deviceIdList };
        }

        if (tData.devices) {
            deviceIdList.push(tData.devices);
        }

        filter = {
            ...(tData.devices && { devices: { $in: deviceIdList } }),
            ...(tData.status && { status: tData.status }),
            ...(tData.startTime && { startTime: { "$gte": moment.utc(tData.startTime).startOf('day').format('YYYY-MM-DD HH:mm:ss') } }),
            ...(tData.endTime && { endTime: { "$lte": moment.utc(tData.endTime).endOf('day').format('YYYY-MM-DD HH:mm:ss') } }),
        };

        const result = await Util.mongo.findAndPaginate(deviceMongoCollection, filter, {}, tData.skip, tData.limit);
        const sanitizedData = await Util.snatizeFromMongo(result);

        if (sanitizedData) {
            return { statusCode: 200, success: true, msg: "MQTTMaintainence Get Successful", status: sanitizedData[0].totalData, totalSize: sanitizedData[0].totalSize };
        } else {
            return { statusCode: 404, success: false, msg: "MQTTMaintainence Get Failed", status: [] };
        }
    } catch (error) {
        return { statusCode: 500, success: false, msg: "MQTTMaintainence Get Error", status: [], err: error };
    }
};

// Update maintenance request
const updateMaintainenceRequest = async (tData, userInfo = {}) => {
    const paramCheck = await checkParams(tData, {
        id: "required|string",
        devices: "required|array",
        engineerName: "required|string",
        engineerContact: "required|string",
        startTime: "required|string",
        endTime: "required|string",
    });
    if (paramCheck) return paramCheck;

    // const permissionCheck = checkPermissions(userInfo);
    // if (permissionCheck) return permissionCheck;

    const updateObj = {
        $set: {
            _id: tData.id,
            devices: tData.devices,
            maintainenceType: tData.maintainenceType,
            engineerName: tData.engineerName,
            engineerContact: tData.engineerContact,
            startTime: moment(tData.startTime).format("YYYY-MM-DD HH:mm:ss"),
            endTime: moment(tData.endTime).format("YYYY-MM-DD HH:mm:ss"),
            status: "Pending",
            modified_time: moment().format("YYYY-MM-DD HH:mm:ss"),
        },
    };

    try {
        const existingRequest = await getMaintainenceData(deviceMongoCollection, { _id: tData.id, status: "Pending" });

        if (existingRequest) {
            const result = await Util.mongo.updateOne(deviceMongoCollection, { _id: tData.id }, updateObj);
            if (result) {
                const getFlagData = await getMaintainenceData("MQTTFlag", {});
                for (const deviceId of tData.devices) {
                    const deviceData = await getMaintainenceData("MQTTDevice", { deviceId: deviceId });
                    if (deviceData) {
                        const emailResponse = await sendEmail(getFlagData.superUserMails, {
                            DeviceName: deviceData.deviceName,
                            DeviceId: deviceData.deviceId,
                            Action: "Maintainence Request Updated.",
                            MacId: deviceData.mqttMacId,
                            TimeofActivity: moment().format("YYYY-MM-DD HH:mm:ss"),
                        }, getFlagData, getFlagData.ccUsers, getFlagData.bccUsers);

                        const mailResponse = {
                            ...emailResponse,
                            status: emailResponse.rejected.length > 0 ? "failed" : "success",
                        };

                        await Util.mongo.insertOne("MQTTNotify", mailResponse);
                    }
                }

                await Util.addAuditLogs(MODULE_NAME, userInfo, "update", `${userInfo.userName} has updated Device Maintenance Request.`, "success", JSON.stringify(result));
                return { statusCode: 200, success: true, msg: "MQTTMaintainence Update Successful", status: result };
            } else {
                await Util.addAuditLogs(MODULE_NAME, userInfo, "update", `${userInfo.userName} has updated Device Maintenance Request.`, "failure", JSON.stringify(result));
                return { statusCode: 404, success: false, msg: "MQTTMaintainence Update Failed", status: [] };
            }
        } else {
            return { statusCode: 404, success: false, msg: "MQTTMaintainence Not Found or Already Approved", status: [] };
        }
    } catch (error) {
        await Util.addAuditLogs(MODULE_NAME, userInfo, "update", `${userInfo.userName} has updated Device Maintenance Request.`, "error", error);
        return { statusCode: 500, success: false, msg: "MQTTMaintainence Update Error", status: [], err: error };
    }
};

module.exports = {
    downloadMaintainenceRequest,
    submitMaintainenceRequest,
    createMaintainenceRequest,
    getMaintainenceRequest,
    updateMaintainenceRequest
};