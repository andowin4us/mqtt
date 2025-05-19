const Mongo = require("../config/mongo");
const { v4: uuidv4 } = require("uuid");
const ObjectID = require("mongodb").ObjectID;
const moment = require("moment");
const { Validator } = require("node-input-validator");
require("dotenv").config();
const { sendMessageToQueue } = require("../config/sqs");

// Helper Functions
const snatizeFromMongo = async (result) => {
    if (result?.[0]?.totalData) {
        result[0].totalData.forEach(res => {
            if (res._id) {
                res.id = res._id;
                delete res._id;
            }
        });
        result[0].totalSize = result[0].totalCount?.[0]?.count || 0;
        delete result[0].totalCount;
    }
    return result;
};

const addAuditLogs = async (moduleName, userInfo, operation, message, response, result) => {
    const logEntry = {
        moduleName,
        modified_user_id: userInfo.id || 0,
        operation: operation,
        message: message,
        status: response,
        role: userInfo.accesslevel === 1 ? "SuperUser" : userInfo.accesslevel === 2 ? "Admin" : "Supervisor",
        modified_user_name: userInfo.userName || "test1",
        modified_time: moment().format("YYYY-MM-DD HH:mm:ss"),
        log: result
    };

    await Mongo.db.collection("MQTTAuditLog").insertOne(logEntry);
    return logEntry;
};

const snatizeArrayForId = async (result) => {
    if (result) {
        result.forEach(res => {
            if (res._id) {
                res.id = res._id;
                delete res._id;
            }
        });
    }
    return result;
};

const mongoPool = {
    get() {
        return Mongo.db;
    },
    getObjectId(id) {
        return ObjectID(id);
    },
    async findOne(collection, filter, projection = {}) {
        return Mongo.db.collection(collection).findOne(filter, { projection });
    },
    async count(collection, filter, options = {}) {
        return Mongo.db.collection(collection).countDocuments(filter, options);
    },
    async find(collection, filter = {}, projection = {}, skip = 0, limit = 200000) {
        return Mongo.db.collection(collection).find(filter, { projection }).skip(skip).limit(limit).toArray();
    },
    async findAndPaginate(collection, filter = {}, projection = {}, skip = 0, limit = 200000) {
        const dataParams = [{ $match: filter }, { $skip: skip }, { $limit: limit }, { $sort: { modified_time: -1 } }];
        if (Object.keys(projection).length) {
            dataParams.push({ $project: projection });
        }

        return Mongo.db.collection(collection).aggregate([
            {
                $facet: {
                    totalData: dataParams,
                    totalCount: [
                        { $match: filter },
                        { $group: { _id: null, count: { $sum: 1 } } }
                    ]
                }
            }
        ]).toArray();
    },
    async findPaginateAndSort(collection, filter = {}, projection = {}, skip = 0, limit = 200000, sort = {}) {
        const dataParams = [{ $match: filter }, { $skip: skip }, { $limit: limit }];
        if (Object.keys(projection).length) {
            dataParams.push({ $project: projection });
        }

        return Mongo.db.collection(collection).aggregate([
            { $sort: sort },
            {
                $facet: {
                    totalData: dataParams,
                    totalCount: [
                        { $match: filter },
                        { $group: { _id: null, count: { $sum: 1 } } }
                    ]
                }
            }
        ]).toArray();
    },
    async findAll(collection, filter, projection = {}) {
        return Mongo.db.collection(collection).find(filter, { projection }).toArray();
    },
    async findAllSort(collection, filter, projection = {}, sort = {}) {
        return Mongo.db.collection(collection).find(filter, { projection }).sort(sort).toArray();
    },
    async findAllSkipLimit(collection, filter, projection = {}, skip = 0, limit = 0) {
        return Mongo.db.collection(collection).find(filter, { projection }).skip(skip).limit(limit).toArray();
    },
    async insertOne(collection, insertData) {
        // await sendMessageToQueue({...insertData, operation: "insert"});
        return Mongo.db.collection(collection).insertOne(insertData);
    },
    async insertMany(collection, insertData) {
        return Mongo.db.collection(collection).insertMany(insertData);
    },
    async updateOne(collection, filter, updateData) {
        // await sendMessageToQueue({...insertData, operation: "update"});
        return Mongo.db.collection(collection).updateOne(filter, updateData);
    },
    async updateMany(collection, filter, updateData) {
        return Mongo.db.collection(collection).updateMany(filter, updateData);
    },
    async aggregateData(collection, query) {
        return Mongo.db.collection(collection).aggregate(query, { allowDiskUse: true }).toArray();
    },
    async remove(collection, filter) {
        // await sendMessageToQueue({...insertData, operation: "remove"});
        return Mongo.db.collection(collection).deleteOne(filter);
    },
    async removeAll(collection, filter) {
        return Mongo.db.collection(collection).deleteMany(filter);
    },
    async insertBulk(collection, arrayOfObject, filter = [], createByObjTemp = {}, uniqueKeyName = '') {
        const bulk = Mongo.db.collection(collection).initializeUnorderedBulkOp();
        arrayOfObject.forEach(item => {
            const id = uuidv4();
            const uniqueKey = uniqueKeyName ? item[uniqueKeyName].toLowerCase().trim().replace(/ +/g, "") : "";

            item.uniqueKey = uniqueKey;
            const filterTemp = filter.reduce((acc, key) => {
                if (item[key]) acc[key] = item[key];
                return acc;
            }, {});

            if (Object.keys(filterTemp).length) {
                bulk.find(filterTemp).upsert().updateOne({ $set: { ...item, ...createByObjTemp, _id: id } });
            } else {
                bulk.insert({ ...item, uniqueKey, ...createByObjTemp, _id: id });
            }
        });
        await bulk.execute();
        return true;
    }
};

const jsonParser = async (obj) => {
    if (typeof obj === "string") {
        try {
            return JSON.parse(obj);
        } catch {
            return {};
        }
    }
    return obj || {};
};

const checkQueryParams = async (getData, checkData) => {
    const validator = new Validator(getData, checkData);
    const isValid = await validator.check();
    return isValid ? validator : { error: "PARAMETER_ISSUE", list: validator.errors || "SERVER_INTERNAL_ERROR" };
};

const getArray = (objectArray, key) => objectArray.map(element => element[key]);

const getList = (objectArray, key, valueKey) => {
    return objectArray.reduce((acc, element) => {
        if (element[key]) acc[element[key]] = element[valueKey] || "";
        return acc;
    }, {});
};

const getStringArray = (list) => list.map(String);

const getUuid = () => uuidv4();

const createHeader = async (summarySheet, columns, headerName = "Report") => {
    summarySheet.row(1).height(20);
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let currentChar = 0;

    columns.forEach((data, index) => {
        const colLetter = alphabet[currentChar];
        summarySheet.cell(`${colLetter}2`).value(data.label);
        summarySheet.column(colLetter).width(20);

        if (index % 26 === 25) {
            currentChar = 0;
            summarySheet.cell(`${alphabet[currentChar]}1`).value(headerName)
                .style({
                    bold: true,
                    horizontalAlignment: "center",
                    fontFamily: "Arial",
                    fontSize: 12,
                    verticalAlignment: "center",
                    borderColor: "black",
                    borderStyle: "thin"
                });
        } else {
            currentChar++;
        }
    });

    summarySheet.range('A1:Z1').merged(true).value(headerName)
        .style({
            bold: true,
            horizontalAlignment: "center",
            fontFamily: "Arial",
            fontSize: 12,
            verticalAlignment: "center",
            borderColor: "black",
            borderStyle: "thin"
        });
    summarySheet.range('A2:Z2').style({
        horizontalAlignment: "center",
        fontFamily: "Arial",
        fontSize: 10,
        verticalAlignment: "center",
        borderColor: "black",
        borderStyle: "thin"
    });

    return summarySheet;
};

const validator = async (getData, res, checkData) => {
    const validation = await checkQueryParams(getData, checkData);
    if (validation.error) {
        const response = {
            statusCode: 400,
            success: false,
            msg: validation.error,
            err: validation.list
        };
        res.status(400).json(response);
        return null;
    }
    return validation;
};

module.exports = {
    mongo: mongoPool,
    moment,
    snatizeFromMongo,
    snatizeArrayForId,
    jsonParser,
    checkQueryParams,
    getArray,
    getList,
    getUuid,
    createHeader,
    getStringArray,
    validator,
    addAuditLogs
};
