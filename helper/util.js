const Mongo = require("../config/mongo");
const MQTT = require("../config/mqtt");
const ObjectID = require("mongodb").ObjectID;
const moment = require("moment");
const { v4: uuidv4 } = require("uuid");
const { Validator } = require("node-input-validator");
const passwordValidator = require("password-validator");

// Password Validator schema pass with min 6 in liength has digit in it and not spaces
let passValidator = new passwordValidator();
passValidator.is().min(6).has().digits().has().not().spaces();
require("dotenv").config();


const snatizeFromMongo = async (result) => {
    if (result && result[0] && result[0].totalData) {
        for (let res of result[0].totalData) {
            if (res._id) {
                res.id = res._id;
                delete res._id;
            }
        }
        result[0].totalSize = result[0].totalCount[0]
            ? result[0].totalCount[0].count
            : 0;
        delete result[0].totalCount;
    }
    return result;
};

const addAuditLogs = async (moduleName, userInfo, result) => {
    let insertObj = {
        moduleName,
        modified_user_id: userInfo.id || 0,
        modified_user_name: userInfo.userName || "test",
        modified_time: moment().format("YYYY-MM-DD HH:mm:ss"),
        log: result
    }

    await Mongo.db.collection("MQTTAuditLog").insertOne(insertObj);
    return insertObj;
};

const snatizeArrayForId = async (result) => {
    if (result) {
        for (let res of result) {
            if (res._id) {
                res.id = res._id;
                delete res._id;
            }
        }
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
        const result = await Mongo.db
            .collection(collection)
            .findOne(filter, projection);
        return result;
    },
    async count(collection, filter, options = {}) {
        const result = await Mongo.db.collection(collection).count(filter, options);
        return result;
    },
    async find(
        collection,
        filter = {},
        projection = {},
        skip = 0,
        limit = 200000
    ) {
        const result = await Mongo.db
            .collection(collection)
            .find(filter, projection)
            .skip(skip)
            .limit(limit)
            // .aggregate()
            .toArray();
        return result;
    },
    async findAndPaginate(
        collection,
        filter = {},
        projection = {},
        skip = 0,
        limit = 200000
    ) {
        const dataParams = [{ $match: filter }, { $skip: skip }, { $limit: limit }];
        if (Object.keys(projection).length > 0) {
            dataParams.push({ $project: projection });
        }

        console.log("projection got in mongo func", projection);

        let result = [];
        result = await Mongo.db
            .collection(collection)
            .aggregate([
                {
                    $facet: {
                        totalData: dataParams,
                        totalCount: [
                            {
                                $match: filter,
                            },
                            {
                                $group: { _id: null, count: { $sum: 1 } },
                            },
                        ],
                    },
                },
            ])
            .toArray();

        return result;
    },
    async findPaginateAndSort(
        collection,
        filter = {},
        projection = {},
        skip = 0,
        limit = 200000,
        sort
    ) {
        const dataParams = [{ $match: filter }, { $skip: skip }, { $limit: limit }];
        if (Object.keys(projection).length > 0) {
            dataParams.push({ $project: projection });
        }

        console.log("projection got in mongo func", projection);

        let result = [];
        result = await Mongo.db
            .collection(collection)
            .aggregate([
                { 
                    $sort: sort
                },
                {
                    $facet: {
                        totalData: dataParams,
                        totalCount: [
                            {
                                $match: filter,
                            },
                            {
                                $group: { _id: null, count: { $sum: 1 } },
                            },
                        ],
                    },
                },
            ])
            .toArray();

        return result;
    },
    async findAll(collection, filter, projection = {}) {
        console.log("(util.js):projection findAll, ", projection);
        const result = await Mongo.db
            .collection(collection)
            .find(filter, projection)
            .toArray();
        return result;
    },
    async findAllSort(collection, filter, projection = {}, sort) {
        console.log("(util.js):projection findAll, ", projection);
        const result = await Mongo.db
            .collection(collection)
            .find(filter, projection)
            .sort(sort)
            .toArray();
        return result;
    },
    async findAllSkipLimit(
        collection,
        filter,
        projection = {},
        skip = 0,
        limit = 0
    ) {
        console.log("(util.js):projection findAll, ", projection);
        const result = await Mongo.db
            .collection(collection)
            .find(filter, projection)
            .skip(skip)
            .limit(limit)
            .toArray();
        return result;
    },
    async insertOne(collection, insertData) {
        const result = await Mongo.db.collection(collection).insertOne(insertData);
        return result;
    },
    async insertMany(collection, insertData) {
        const result = await Mongo.db.collection(collection).insertMany(insertData);
        return result;
    },
    async updateOne(collection, filter, upsetData) {
        const result = await Mongo.db
            .collection(collection)
            .updateOne(filter, upsetData, { upsert: true });
        return result;
    },
    async updateMany(collection, filter, upsetData) {
        const result = await Mongo.db
            .collection(collection)
            .updateMany(filter, upsetData, { upsert: true });
        return result;
    },
    async aggregateData(collection, query) {
        return await Mongo.db
            .collection(collection)
            .aggregate(query, { allowDiskUse: true })
            .toArray();
    },
    async remove(collection, filter) {
        const result = await Mongo.db.collection(collection).deleteOne(filter);
        return result;
    },
    async removeAll(collection, filter) {
        const result = await Mongo.db.collection(collection).remove(filter);
        return result;
    },
    async insertBulk(
        collection,
        arrayOfObject,
        filter,
        createByObjTemp,
        uniqueKeyName
    ) {
        var bulk = Mongo.db.collection(collection).initializeUnorderedBulkOp();
        arrayOfObject.forEach((item) => {
            let filterTemp = {};

            const id = uuidv4();

            const uniqueKey = uniqueKeyName
                ? item[uniqueKeyName].toLowerCase().trim().replace(/ +/g, "")
                : "";

            item.uniqueKey = uniqueKey;

            if (filter && Array.isArray(filter) && filter.length) {
                filter.forEach((key) => {
                    if (item[key]) {
                        filterTemp[key] = item[key];
                    }
                });

                const storeObj = {
                    ...item,
                    ...(createByObjTemp || {}),
                    _id: id,
                };

                console.log("filterTemp insertBulk", filterTemp);

                bulk
                    .find({ ...filterTemp })
                    .upsert()
                    .updateOne({
                        $set: storeObj,
                    });
            } else {
                bulk.insert({
                    ...item,
                    uniqueKey: uniqueKey,
                    ...(createByObjTemp || {}),
                    _id: id,
                });
            }

            // bulk.insert({
            // _id: uuidv4(),
            // ...item,
            // });
        });
        bulk.execute();
        return true;
    },
};

const jsonParser = async (obj) => {
    if (obj) {
        if (typeof obj == "string") {
            try {
                let data = JSON.parse(obj);
                return data;
            } catch (error) {
                return {};
            }
        } else if (typeof obj == "object") {
            return obj;
        } else {
            return {};
        }
    } else {
        return {};
    }
};

const checkQueryParams = async (getData, checkData) => {
    const v = new Validator(getData, checkData);
    let matched = await v.check();

    if (matched) {
        return v;
    } else {
        return {
            error: "PARAMETER_ISSUE",
            list: v.errors || "SERVER_INTERNAL_ERROR",
        };
    }
};

const getArray = (tObjectArray, key) => {
    let tArray = [];
    tObjectArray.forEach((element) => {
        tArray.push(element[key]);
    });

    return tArray;
};

const getList = (tObjectArray, key, valueKey) => {
    let tArray = {};
    tObjectArray.forEach((element) => {
        if (element[key]) {
            tArray[element[key]] = element[valueKey] || "";
        }
    });

    return tArray;
};

const passValidate = async (param) => {
    return passValidator.validate(param);
};

const getStringArray = (list) => {
    return list.map(String);
};

const getUuid = () => {
    return uuidv4();
};

const createHeader = async (summarySheet, coloum, headerName = "Report") => {
    summarySheet.row(1).height(20);
    var topFirst = "A",
        first = "A",
        last = "Z",
        prefix = "",
        topLast = "Z";
    var i = first.charCodeAt(0);
    for (data of coloum) {
        let charName = `${eval("String.fromCharCode(" + i + ")")}`;
        topLast = `${prefix}${eval("String.fromCharCode(" + i + ")")}`;
        summarySheet
            .cell(`${prefix}${eval("String.fromCharCode(" + i + ")")}2`)
            .value(data.label);
        if (charName === last) {
            i = "A".charCodeAt(0);
            prefix = topFirst;
        } else {
            i = i + 1;
        }
        summarySheet.column(`${eval("String.fromCharCode(" + i + ")")}`).width(20);
    }
    // if(headerName !== "undefined" || headerName !== "") {
    summarySheet
        .range(`${topFirst}1:${topLast}1`)
        .merged(true)
        .value(headerName)
        .style({
            bold: true,
            horizontalAlignment: "center",
            fontFamily: "Arial",
            fontSize: 12,
            verticalAlignment: "center",
            borderColor: "black",
            borderStyle: "thin",
        });
    // }
    summarySheet.range(`${topFirst}2:${topLast}2`).style({
        horizontalAlignment: "center",
        fontFamily: "Arial",
        fontSize: 10,
        verticalAlignment: "center",
        borderColor: "black",
        borderStyle: "thin",
    });
    return summarySheet;
};

const validator = async (getData, res, checkData) => {
    let tReturnVal = null;
    const v = new Validator(getData, checkData);
    let matched = await v.check();

    if (matched) {
        tReturnVal = v;
    } else {
        var resObj = this.responseJsonStructure(400, false, {
            error: "PARAMETER_ISSUE",
            list: v.errors || "SERVER_INTERNAL_ERROR",
        });
        console.log("resObj", resObj);
        res.send(400, resObj);
    }

    return tReturnVal;
};

module.exports = {
    mongo: mongoPool,
    moment,
    passValidate,
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
    addAuditLogs,
};
