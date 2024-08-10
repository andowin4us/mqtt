const Util = require("../helper/util");
const deviceMongoCollection = "MQTTFlag";
const dotenv = require("dotenv");
const moment = require("moment");

const updateFlag = async (tData, userInfo = {}) => {
    if(userInfo && userInfo.accesslevel && userInfo.accesslevel > 1) {
        return {
            statusCode: 404,
            success: false,
            msg: "NOT ENOUGH PERMISSIONS TO PERFORM THIS OPERATION.",
            err: "",
        };
    }

    const result = await Util.mongo.findOne(deviceMongoCollection, {});

    try {
        if (result) {
            let updateObj = {
                ...result,
                created_time: moment().format("YYYY-MM-DD HH:mm:ss"),
                modified_time: moment().format("YYYY-MM-DD HH:mm:ss")
            };

            let resultAdd = await Util.mongo.updateOne(
                deviceMongoCollection,
                {_id: result._id},
                {$set: {...updateObj, ...tData}}
            );
            if (resultAdd) {
                await Util.addAuditLogs(
                    deviceMongoCollection,
                    userInfo,
                    JSON.stringify(resultAdd)
                );

                return {
                    statusCode: 200,
                    success: true,
                    msg: "MQTT Flag Success",
                    status: resultAdd,
                };
            } else {
                return {
                    statusCode: 404,
                    success: false,
                    msg: "MQTT Flag Error",
                    status: [],
                };
            }
        }
    } catch (error) {
        return {
            statusCode: 500,
            success: false,
            msg: "MQTT Flag Error",
            status: [],
            err: error,
        };
    }
};

const getData = async (tData, userInfo) => {
    try {
        let filter = {};

        let result = await Util.mongo.findAll(
            deviceMongoCollection,
            filter
        );
        let snatizedData = await Util.snatizeFromMongo(result);

        if (snatizedData) {
            return {
                statusCode: 200,
                success: true,
                msg: "MQTT Flags get Successfull",
                status: snatizedData[0].totalData,
                totalSize: snatizedData[0].totalSize,
            };
        } else {
            return {
                statusCode: 404,
                success: false,
                msg: "MQTT Flags get Failed",
                status: [],
            };
        }
    } catch (error) {
        return {
            statusCode: 500,
            success: false,
            msg: "MQTT Flags get Error",
            status: [],
            err: error,
        };
    }
};

module.exports = {
    updateFlag,
    getData
};