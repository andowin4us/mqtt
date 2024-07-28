const Util = require("../helper/util");
const deviceMongoCollection = "MQTTUser";
const md5Service = require('../services/md5.service');
const authService = require('../services/auth.service');
const dotenv = require("dotenv");
const moment = require("moment");

const duplicate = async (name, id) => {
    const query = { name: name.toLowerCase(), _id: { $ne: id } };
    const result = await Util.mongo.findOne(deviceMongoCollection, query);

    if (result) {
        return true;
    }
    return false;
};

const duplicateName = async (name) => {
    const query = { userName: name };
    const result = await Util.mongo.findOne(deviceMongoCollection, query);

    if (result) {
        return result;
    }
    return false;
};

const geUserData = async (query) => {
    // const query = { userName: userName };
    const result = await Util.mongo.findOne(deviceMongoCollection, query);

    return result;
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
        if (configDetails && configDetails.name) {
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
                    msg: "MQTT User Deleted Successfull",
                    status: result,
                };
            } else {
                return {
                    statusCode: 404,
                    success: false,
                    msg: "MQTT User Deleted Failed",
                    status: [],
                };
            }
        } else {
            return {
                statusCode: 404,
                success: false,
                msg: "MQTT User Deleted Failed",
                status: [],
            };
        }
    } catch (error) {
        return {
            statusCode: 500,
            success: false,
            msg: "MQTT User Deleted Error",
            status: [],
            err: error,
        };
    }
};

const updateData = async (tData, userInfo = {}) => {
    // Required and sanity checks
    let tCheck = await Util.checkQueryParams(tData, {
        id: "required|string",
        name: "required|string",
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

    if(userInfo && userInfo.accesslevel && userInfo.accesslevel < tData.accesslevel) {
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
            name: tData.name.toLowerCase(),
            status: tData.status,
            modified_time: moment().format("YYYY-MM-DD HH:mm:ss")
        },
    };
    try {
        const isDublicate = await duplicate(tData.name, tData.id);

        if (isDublicate) {
            return {
                statusCode: 404,
                success: false,
                msg: "USER NOT PRSENT",
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
                deviceMongoCollection,
                userInfo,
                JSON.stringify(result)
            );

            return {
                statusCode: 200,
                success: true,
                msg: "MQTT User Config Success",
                status: result,
            };
        } else {
            return {
                statusCode: 404,
                success: false,
                msg: "MQTT User Config Error",
                status: [],
            };
        }
    } catch (error) {
        return {
            statusCode: 500,
            success: false,
            msg: "MQTT User Config Error",
            status: [],
            err: error,
        };
    }
};

const createData = async (tData, userInfo = {}) => {
    let tCheck = await Util.checkQueryParams(tData, {
        id: "required|string",
        name: "required|string",
        userName: "required|string",
        password: "required|string",
        accesslevel: "required|numeric",
        email: "required|string",
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

        if(userInfo && userInfo.accesslevel && userInfo.accesslevel < tData.accesslevel) {
            return {
                statusCode: 404,
                success: false,
                msg: "NOT ENOUGH PERMISSIONS TO PERFORM THIS OPERATION.",
                err: "",
            };
        }

        let createObj = {
            _id: tData.id,
            name: tData.name,
            userName: tData.userName,
            status: "Active",
            accesslevel: tData.accesslevel,
            email: tData.email,
            password: md5Service().password(tData),
            created_time: moment().format("YYYY-MM-DD HH:mm:ss"),
            modified_time: moment().format("YYYY-MM-DD HH:mm:ss")
        };
        let result = await Util.mongo.insertOne(
            deviceMongoCollection,
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
                msg: "MQTT User Created Successfull",
                status: result,
            };
        } else {
            return {
                statusCode: 404,
                success: false,
                msg: "MQTT User Create Failed",
                status: [],
            };
        }
    } catch (error) {
        return {
            statusCode: 500,
            success: false,
            msg: "MQTT User Create Error",
            status: [],
            err: error,
        };
    }
};

const getData = async (tData, userInfo) => {
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

        if (userInfo && userInfo.accesslevel >= 2) {
            filter.accesslevel = { $gte: userInfo.accesslevel }
        } 

        if (tData && tData.userName) {
            filter.userName = tData.userName
        }

        if (tData && tData.name) {
            filter.name = tData.name
        }

        if (tData && tData.status) {
            filter.status = tData.status
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
                msg: "MQTT User get Successfull",
                status: snatizedData[0].totalData,
                totalSize: snatizedData[0].totalSize,
            };
        } else {
            return {
                statusCode: 404,
                success: false,
                msg: "MQTT User get Failed",
                status: [],
            };
        }
    } catch (error) {
        return {
            statusCode: 500,
            success: false,
            msg: "MQTT User get Error",
            status: [],
            err: error,
        };
    }
};

const login = async (tData, res) => {
    const { userName, password } = tData;
    let query = { };
    if (userName && password) {
        try {
            query = { email: userName };
            const user = await geUserData(query);

            if (!user) {
                return res.status(400).json({ msg: 'Bad Request: User not found' });
            }

            if (md5Service().comparePassword(password, user.password) && user.status === "Active") {
                const session = {
                    id: user.id,
                    accesslevel: user.accesslevel,
                    name: `${user.name}`,
                    userName: user.userName,
                    email: user.email
                };
                const token = authService().issue(session);
                return res.status(200).json({ token, userData: session });
            }

            return res.status(401).json({ msg: 'Unauthorized' });
        } catch (err) {
            console.log(err);
            return res.status(500).json({ msg: 'We are not able to process your request' });
        }
    }

    return res.status(400).json({ msg: 'Bad Request: Email or password is wrong' });
};

const resetPassword = async (tData, userInfo = {}) => {
    let tCheck = await Util.checkQueryParams(tData, {
        userName: "required|string",
        password: "required|string",
        newPassword: "required|string",
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
        const isDublicate = await duplicateName(tData.userName);
        if ( !isDublicate ) {
            return {
                statusCode: 404,
                success: false,
                msg: "USER NOT FOUND.",
                err: tCheck,
            };
        }

        if( md5Service().comparePassword(tData.password, isDublicate.password) === false ) {
            return {
                statusCode: 404,
                success: false,
                msg: "PASSWORD_MISMATCH",
                err: tCheck,
            };
        }
    
        let updateObj = {
            $set: {
                password: md5Service().password({password: tData.newPassword}),
                modified_time: moment().format("YYYY-MM-DD HH:mm:ss")
            },
        };

        let result = await Util.mongo.updateOne(
            deviceMongoCollection,
            { _id: isDublicate._id },
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
                msg: "MQTT User Config Password update Success",
                status: result,
            };
        } else {
            return {
                statusCode: 404,
                success: false,
                msg: "MQTT User Config Password update Error",
                status: [],
            };
        }
    } catch (error) {
        return {
            statusCode: 500,
            success: false,
            msg: "MQTT User Config Error",
            status: [],
            err: error,
        };
    }
};

const logout = async (tData, res) => {
    const { email, password, userName } = tData;
    let query = { email };
    if (userName) {
        query = { userName };
    }

    if ((email || userName) && password) {
        try {
            const user = await geUserData(query);

            if (!user) {
                return res.status(400).json({ msg: 'Bad Request: User not found' });
            }

            if (md5Service().comparePassword(password, user.password)) {
                const session = {
                    id: user.id,
                    accesslevel: user.accesslevel,
                    name: `${user.firstname}`,
                    userName: user.userName,
                    email: user.email
                };
                const token = authService().issueLogout(session);
                return res.status(200).json({ token });
            }

            return res.status(401).json({ msg: 'Unauthorized' });
        } catch (err) {
            console.log(err);
            return res.status(500).json({ msg: 'We are not able to process your request' });
        }
    }

    return res.status(400).json({ msg: 'Bad Request: Email or password is wrong' });
};

module.exports = {
    deleteData,
    updateData,
    createData,
    getData,
    login,
    resetPassword,
    logout
};