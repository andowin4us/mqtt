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
                $set: {
                    ...result,
                    ...tData,
                    created_time: moment().format("YYYY-MM-DD HH:mm:ss"),
                    modified_time: moment().format("YYYY-MM-DD HH:mm:ss")
                }
            };

            let resultAdd = await Util.mongo.updateOne(
                deviceMongoCollection,
                {_id: result._id},
                updateObj
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
        } else {
            let insertObj = {
                $set: {
                    _id: Util.getUuid(),
                    ...tData,
                    created_time: moment().format("YYYY-MM-DD HH:mm:ss"),
                    modified_time: moment().format("YYYY-MM-DD HH:mm:ss")
                }
            };

            let resultAdd = await Util.mongo.updateOne(
                deviceMongoCollection,
                {},
                insertObj
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

module.exports = {
    updateFlag
};