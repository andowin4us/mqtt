const Util = require('../helper/util');
const workerHelper = require("../helper/mainWorkerHelper");
let collectionName = "users"

const getLogger = async (tData, userInfo = {}) => {
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
            collectionName,
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
                msg: "MQTT data type " + +" get Successfull",
                status: snatizedData[0].totalData,
                totalSize: snatizedData[0].totalSize,
            };
        } else {
            return {
                statusCode: 404,
                success: false,
                msg: "MQTT data type " + +" get Failed",
                status: [],
            };
        }
    } catch (error) {
        return {
            statusCode: 500,
            success: false,
            msg: "MQTT  Error",
            status: [],
            err: error,
        };
    }
};

const downloadLogger = async (tData, userInfo = {}) => {
    console.log("tDATA-->", tData);
    let finalURL = "";

    let isFailed = true;
    let coloum = ["username", "password"];
    try {
        let finalJson = await Util.mongo.findAll(
            collectionName,
            {},
            {}
        );
        console.log("finalJson", finalJson)
        const workerData = {
            tData: finalJson,
            column: coloum,
            fileName: "ActivityLogReport",
        };

        const dataFromWorker = await workerHelper.mainWorkerThreadCall(
            workerData,
            tData.type || "csv"
        );
        if (dataFromWorker.statusCode === 200) {
            finalURL = dataFromWorker.status;
        }
    } catch (e) {
        console.log("error", e);
    }

    return {
        success: true,
        statusCode: 200,
        download: finalURL,
    };
};

module.exports = {
    getLogger,
    downloadLogger
};