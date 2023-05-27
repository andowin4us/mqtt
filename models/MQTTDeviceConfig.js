const Util = require("../helper/util");
const deviceMongoCollection = "MQTTDeviceConfig";
const ThirdPartyAPICaller = require("../common/ThirdPartyAPICaller");
const dotenv = require("dotenv");

const duplicate = async (name, id) => {
    const query = { name: name.toLowerCase(), _id: { $ne: id } };
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
        if (configDetails && configDetails.name) {
            let result = await Util.mongo.remove(deviceMongoCollection, {
                _id: tData.id,
            });
            if (result) {
                await Util.addAuditLogs(
                    userInfo,
                    `MQTT device : ${configDetails.name.toLowerCase() || 0
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
        name: "required|alphaNumeric"
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
            name: tData.name.toLowerCase(),
            userName: tData.userName
        },
    };
    try {
        const isDublicate = await duplicate(tData.name, tData.id);

        if (isDublicate) {
            return {
                statusCode: 404,
                success: false,
                msg: "DUPLICATE NAME",
                err: "",
            };
        }

        let result = await Util.mongo.updateOne(
            deviceMongoCollection,
            { _id: tData.id },
            updateObj
        );
        if (result) {
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
        name: "required|alphaNumeric",
        userName: "required|alphaNumeric"
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
        const isDublicate = await duplicate(tData.name, tData.id);

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
            name: tData.name.toLowerCase(),
            userName: tData.userName,
        };
        let result = await Util.mongo.insertOne(
            deviceMongoCollection,
            createObj
        );
        if (result) {
            await Util.addAuditLogs(
                moduleName,
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
        let result = await Util.mongo.findAndPaginate(
            deviceMongoCollection,
            {},
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

module.exports = {
    deleteData,
    updateData,
    createData,
    getData
};