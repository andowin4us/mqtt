const Util = require("../helper/util");
const deviceMongoCollection = "MQTTUser";
const MODULE_NAME = "User";
const md5Service = require('../services/md5.service');
const authService = require('../services/auth.service');
const moment = require("moment");

// Helper functions
const checkParameters = async (tData, requiredParams) => {
    let check = await Util.checkQueryParams(tData, requiredParams);
    if (check && check.error && check.error === "PARAMETER_ISSUE") {
        return {
            statusCode: 404,
            success: false,
            msg: "PARAMETER_ISSUE",
            err: check,
        };
    }
    return null;
};

const checkPermissions = (userInfo, requiredLevel) => {
    if (userInfo && userInfo.accesslevel && userInfo.accesslevel < requiredLevel) {
        return {
            statusCode: 404,
            success: false,
            msg: "NOT ENOUGH PERMISSIONS TO PERFORM THIS OPERATION.",
            err: "",
        };
    }
    return null;
};

const findDuplicate = async (query) => {
    return await Util.mongo.findOne(deviceMongoCollection, query);
};

// CRUD operations
const deleteData = async (tData, userInfo = {}) => {
    const paramCheck = await checkParameters(tData, { id: "required|string" });
    if (paramCheck) return paramCheck;

    const permissionCheck = checkPermissions(userInfo, 3);
    if (permissionCheck) return permissionCheck;

    try {
        const configDetails = await findDuplicate({ _id: tData.id });
        if (!configDetails || !configDetails.name) {
            return {
                statusCode: 404,
                success: false,
                msg: "MQTT User Not Found",
                status: [],
            };
        }

        const result = await Util.mongo.remove(deviceMongoCollection, { _id: tData.id });
        if (result) {
            await Util.addAuditLogs(MODULE_NAME, userInfo, "delete", `${userInfo.userName} has deleted a user.`, "success", JSON.stringify(result));
            return {
                statusCode: 200,
                success: true,
                msg: "MQTT User Deleted Successfully",
                status: result,
            };
        }

        return {
            statusCode: 404,
            success: false,
            msg: "MQTT User Deletion Failed",
            status: [],
        };
    } catch (error) {
        await Util.addAuditLogs(MODULE_NAME, userInfo, "delete", `${userInfo.userName} has deleted a user.`, "failure", JSON.stringify(result));
        return {
            statusCode: 500,
            success: false,
            msg: "MQTT User Deletion Error",
            status: [],
            err: error,
        };
    }
};

const updateData = async (tData, userInfo = {}) => {
    const paramCheck = await checkParameters(tData, {
        id: "required|string",
        name: "required|string",
        status: "required|string",
    });
    if (paramCheck) return paramCheck;

    const permissionCheck = checkPermissions(userInfo, tData.accesslevel);
    if (permissionCheck) return permissionCheck;

    try {
        const isDuplicate = await findDuplicate({ name: tData.name.toLowerCase(), _id: { $ne: tData.id } });
        if (isDuplicate) {
            return {
                statusCode: 404,
                success: false,
                msg: "DUPLICATE NAME",
                err: "",
            };
        }

        const updateObj = {
            $set: {
                _id: tData.id,
                name: tData.name.toLowerCase(),
                status: tData.status,
                modified_time: moment().format("YYYY-MM-DD HH:mm:ss"),
            },
        };

        const result = await Util.mongo.updateOne(deviceMongoCollection, { _id: tData.id }, updateObj);
        if (result) {
            await Util.addAuditLogs(MODULE_NAME, userInfo, "update", `${userInfo.userName} has updated a user.`, "success", JSON.stringify(result));
            return {
                statusCode: 200,
                success: true,
                msg: "MQTT User Updated Successfully",
                status: result,
            };
        }

        return {
            statusCode: 404,
            success: false,
            msg: "MQTT User Update Failed",
            status: [],
        };
    } catch (error) {
        await Util.addAuditLogs(MODULE_NAME, userInfo, "update", `${userInfo.userName} has updated a user.`, "failure", JSON.stringify(result));
        return {
            statusCode: 500,
            success: false,
            msg: "MQTT User Update Error",
            status: [],
            err: error,
        };
    }
};

const createData = async (tData, userInfo = {}) => {
    const paramCheck = await checkParameters(tData, {
        id: "required|string",
        name: "required|string",
        userName: "required|string",
        password: "required|string",
        accesslevel: "required|numeric",
        email: "required|string",
    });
    if (paramCheck) return paramCheck;

    const permissionCheck = checkPermissions(userInfo, tData.accesslevel);
    if (permissionCheck) return permissionCheck;

    try {
        const isDuplicate = await findDuplicate({ userName: tData.userName.toLowerCase()});
        if (isDuplicate) {
            return {
                statusCode: 404,
                success: false,
                msg: "DUPLICATE USERNAME",
                err: "",
            };
        }

        const isDuplicateEmail = await findDuplicate({ email: tData.email.toLowerCase()});
        if (isDuplicateEmail) {
            return {
                statusCode: 404,
                success: false,
                msg: "DUPLICATE EMAIL",
                err: "",
            };
        }

        const createObj = {
            _id: tData.id,
            name: tData.name,
            userName: tData.userName,
            status: "Active",
            accesslevel: tData.accesslevel,
            email: tData.email,
            password: md5Service().password(tData),
            created_time: moment().format("YYYY-MM-DD HH:mm:ss"),
            modified_time: moment().format("YYYY-MM-DD HH:mm:ss"),
        };

        const result = await Util.mongo.insertOne(deviceMongoCollection, createObj);
        if (result) {
            await Util.addAuditLogs(deviceMongoCollection, userInfo, "create", `${userInfo.userName} has created a new user.`, JSON.stringify(result));
            return {
                statusCode: 200,
                success: true,
                msg: "MQTT User Created Successfully",
                status: result,
            };
        }

        return {
            statusCode: 404,
            success: false,
            msg: "MQTT User Creation Failed",
            status: [],
        };
    } catch (error) {
        await Util.addAuditLogs(MODULE_NAME, userInfo, "create", `${userInfo.userName} has created a new user.`, "failure", JSON.stringify(result));
        return {
            statusCode: 500,
            success: false,
            msg: "MQTT User Creation Error",
            status: [],
            err: error,
        };
    }
};

const getData = async (tData, userInfo) => {
    const paramCheck = await checkParameters(tData, { skip: "numeric", limit: "numeric" });
    if (paramCheck) return paramCheck;

    try {
        const filter = {
            ...(userInfo && userInfo.accesslevel >= 2 && { accesslevel: { $gte: userInfo.accesslevel } }),
            ...(tData.userName && { userName: tData.userName }),
            ...(tData.name && { name: tData.name }),
            ...(tData.status && { status: tData.status }),
            ...(tData.email && { status: tData.email }),
            ...(tData.accesslevel && { accesslevel: tData.accesslevel === "Admin" ? 2 : tData.accesslevel === "Supervisor" ? 3 : 1 })
        };

        const result = await Util.mongo.findAndPaginate(deviceMongoCollection, filter, {}, tData.skip, tData.limit);
        const sanitizedData = await Util.snatizeFromMongo(result);

        if (sanitizedData) {
            return {
                statusCode: 200,
                success: true,
                msg: "MQTT User Retrieval Successful",
                status: sanitizedData[0].totalData,
                totalSize: sanitizedData[0].totalSize,
            };
        }

        return {
            statusCode: 404,
            success: false,
            msg: "MQTT User Retrieval Failed",
            status: [],
        };
    } catch (error) {
        return {
            statusCode: 500,
            success: false,
            msg: "MQTT User Retrieval Error",
            status: [],
            err: error,
        };
    }
};

const getUserAsRole = async (tData) => {
    try {
        const filter = {
            ...(tData.accesslevel && { accesslevel: tData.accesslevel }),
            status: "Active",
        };

        const result = await Util.mongo.findAll(deviceMongoCollection, filter);
        if (result) {
            return {
                statusCode: 200,
                success: true,
                msg: "MQTT User Retrieval Successful",
                status: result,
                totalSize: result.length,
            };
        }

        return {
            statusCode: 404,
            success: false,
            msg: "MQTT User Retrieval Failed",
            status: [],
        };
    } catch (error) {
        return {
            statusCode: 500,
            success: false,
            msg: "MQTT User Retrieval Error",
            status: [],
            err: error,
        };
    }
};

const login = async (tData, res) => {
    const { email, password, userName } = tData;

    if ((email || userName) && password) {
        try {
            const query = email ? { email } : { userName };
            const user = await findDuplicate(query);

            if (!user) {
                return res.status(400).json({ msg: 'Bad Request: User not found' });
            }

            if (md5Service().comparePassword(password, user.password) && user.status === "Active") {
                const session = {
                    id: user._id,
                    accesslevel: user.accesslevel,
                    name: user.name,
                    userName: user.userName,
                    email: user.email,
                };
                const token = authService().issue(session);
                return res.status(200).json({ token, userData: session });
            }

            return res.status(401).json({ msg: 'Unauthorized' });
        } catch (err) {
            return res.status(500).json({ msg: 'Internal Server Error' });
        }
    }

    return res.status(400).json({ msg: 'Bad Request: Email or password is incorrect' });
};

const resetPassword = async (tData, userInfo = {}) => {
    const paramCheck = await checkParameters(tData, {
        userName: "required|string",
        password: "required|string",
        newPassword: "required|string",
    });
    if (paramCheck) return paramCheck;

    try {
        const user = await findDuplicate({ userName: tData.userName });
        if (!user) {
            return {
                statusCode: 404,
                success: false,
                msg: "USER NOT FOUND.",
                err: paramCheck,
            };
        }

        if (!md5Service().comparePassword(tData.password, user.password)) {
            return {
                statusCode: 404,
                success: false,
                msg: "PASSWORD MISMATCH",
                err: paramCheck,
            };
        }

        const updateObj = {
            $set: {
                password: md5Service().password({ password: tData.newPassword }),
                modified_time: moment().format("YYYY-MM-DD HH:mm:ss"),
            },
        };

        const result = await Util.mongo.updateOne(deviceMongoCollection, { _id: user._id }, updateObj);
        if (result) {
            await Util.addAuditLogs(deviceMongoCollection, userInfo, "reset", `${userInfo.userName} has resetted his password.`, JSON.stringify(result));
            return {
                statusCode: 200,
                success: true,
                msg: "Password Updated Successfully",
                status: result,
            };
        }

        return {
            statusCode: 404,
            success: false,
            msg: "Password Update Failed",
            status: [],
        };
    } catch (error) {
        return {
            statusCode: 500,
            success: false,
            msg: "Password Update Error",
            status: [],
            err: error,
        };
    }
};

const logout = async (tData, res) => {
    const { email, password, userName } = tData;

    if ((email || userName) && password) {
        try {
            const query = email ? { email } : { userName };
            const user = await findDuplicate(query);

            if (!user) {
                return res.status(400).json({ msg: 'Bad Request: User not found' });
            }

            if (md5Service().comparePassword(password, user.password)) {
                const session = {
                    id: user._id,
                    accesslevel: user.accesslevel,
                    name: user.name,
                    userName: user.userName,
                    email: user.email,
                };
                const token = authService().issueLogout(session);
                return res.status(200).json({ token });
            }

            return res.status(401).json({ msg: 'Unauthorized' });
        } catch (err) {
            console.error(err);
            return res.status(500).json({ msg: 'Internal Server Error' });
        }
    }

    return res.status(400).json({ msg: 'Bad Request: Email or password is incorrect' });
};

module.exports = {
    deleteData,
    updateData,
    createData,
    getData,
    getUserAsRole,
    login,
    resetPassword,
    logout
};