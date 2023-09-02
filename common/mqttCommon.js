const { MongoClient } = require('mongodb');
const connection = require('../config/connection');
const { v4: uuidv4 } = require("uuid");
const moment = require("moment");

async function utilizeMqtt(message) {
    try {
        //data type check
        if(typeof message === "object" && JSON.parse(message)) {
            let data = JSON.parse(message);

            if(data.mqttDataLogs_onPrem && data.mqttDataLogs_onPrem.extra_data) {
                console.log("log length is ", data.mqttDataLogs_onPrem.extra_data.length, data.mqttDataLogs_onPrem.device_id);
                let count = [];

                for( let i = 0; i < data.mqttDataLogs_onPrem.extra_data.length; i++ ) {
                    let processData = data.mqttDataLogs_onPrem.extra_data[i];

                    //incoming event null and validate check
                    if(processData && processData.device_id) {
                        console.log("Processing your message now for extra onPrem data ", JSON.stringify(processData), processData.device_id);
                        let result = await mongoInsert( processData, { deviceId: processData.device_id }, "MQTTDevice", "find" );
                        console.log("device detail for multiple club events.", result);
    
                        //device id check
                        if( result && result.deviceId && processData.device_id === result.deviceId ) {
                            //device status check
                            if( result.status && result.status === "Active" ) {
                                //device name check
                                if( processData.device_name && processData.device_name === result.deviceName ) {
                                    //device mac check
                                    if( processData.mac_id && processData.mac_id === result.mqttMacId) {
                                        //logger type check
                                        let resultConfig = await mongoInsert( processData, { deviceId: processData.device_id, logType: processData.log_type }, "MQTTLoggerType", "find" );
        
                                        if(resultConfig && resultConfig._id) {
                                            let resultExisting = await mongoInsert( processData, { device_id: processData.device_id, log_line_count: processData.log_line_count }, "MQTTLogger", "find" );
        
                                            if(resultExisting && resultExisting._id) {
                                                console.log("MQTTLogger is already present.");
        
                                                count.push("false");
                                                // return false;
                                            } else {
                                                processData._id = uuidv4();
                                                processData.modified_time = moment().format("YYYY-MM-DD HH:mm:ss");
                                                await mongoInsert( processData, {}, "MQTTLogger", "create" );
                        
                                                count.push("true");
                                                // return true;
                                            }
                                        } else {
                                            let resultExisting = await mongoInsert( processData, { device_id: processData.device_id, log_line_count: processData.log_line_count }, "dump_logger_type", "find" );
        
                                            if(resultExisting && resultExisting._id) {
                                                console.log("dump_logger_type is already present.");
        
                                                count.push("false");
                                                // return false;
                                            } else {
                                                processData._id = uuidv4();
                                                processData.modified_time = moment().format("YYYY-MM-DD HH:mm:ss");
                                                await mongoInsert( processData, {}, "dump_logger_type", "create" );
            
                                                count.push("false");
                                                // return false;
                                            }
                                        }
                                    } else {
                                        let resultExisting = await mongoInsert( processData, { device_id: processData.device_id, log_line_count: processData.log_line_count }, "dump_device_mac", "find" );
        
                                        if(resultExisting && resultExisting._id) {
                                            console.log("dump_device_mac is already present.");
    
                                            count.push("false");
                                            // return false;
                                        } else {
                                            processData._id = uuidv4();
                                            processData.modified_time = moment().format("YYYY-MM-DD HH:mm:ss");
                                            await mongoInsert( processData, {}, "dump_device_mac", "create" );
            
                                            count.push("false");
                                            // return false;
                                        }
                                    }
                                } else {
                                    let resultExisting = await mongoInsert( processData, { device_id: processData.device_id, log_line_count: processData.log_line_count }, "dump_device_name", "find" );

                                    if(resultExisting && resultExisting._id) {
                                        console.log("dump_device_mac is already present.");

                                        count.push("false");
                                        // return false;
                                    } else {
                                        processData._id = uuidv4();
                                        processData.modified_time = moment().format("YYYY-MM-DD HH:mm:ss");
                                        await mongoInsert( processData, {}, "dump_device_name", "create" );
            
                                        count.push("false");
                                        // return false;
                                    }
                                }
                            } else {
                                let resultExisting = await mongoInsert( processData, { device_id: processData.device_id, log_line_count: processData.log_line_count }, "dump_device_status", "find" );

                                if(resultExisting && resultExisting._id) {
                                    console.log("dump_device_status is already present.");

                                    count.push("false");
                                    // return false;
                                } else {
                                    data._id = uuidv4();
                                    processData.modified_time = moment().format("YYYY-MM-DD HH:mm:ss");
                                    await mongoInsert( data, {}, "dump_device_status", "create" );
            
                                    count.push("false");
                                }
                            }
                        } else {
                            let resultExisting = await mongoInsert( processData, { device_id: processData.device_id, log_line_count: processData.log_line_count }, "dump_device_id", "find" );

                            if(resultExisting && resultExisting._id) {
                                console.log("dump_device_id is already present.");

                                count.push("false");
                                // return false;
                            } else {
                                processData._id = uuidv4();
                                processData.modified_time = moment().format("YYYY-MM-DD HH:mm:ss");
                                await mongoInsert( processData, {}, "dump_device_id", "create" );
        
                                count.push("false");
                                // return false;
                            }
                        }
                    } else {
                        let resultExisting = await mongoInsert( processData, { device_id: processData.device_id ? processData.deviceId : "", log_line_count: processData.log_line_count ? processData.log_line_count : "" }, "dump_device_id", "find" );

                        if(resultExisting && resultExisting._id) {
                            console.log("dump_device_id is already present.");

                            count.push("false");
                            // return false;
                        } else {
                            // console.log("Data Improper.");
                            processData._id = uuidv4();
                            processData.modified_time = moment().format("YYYY-MM-DD HH:mm:ss");
                            await mongoInsert( processData, {}, "dump_device_id", "create" );

                            count.push("false");
                        }
                    }
                }

                if(count === data.mqttDataLogs_onPrem.extra_data.length) {
                    const allEqual = count => count.every( v => v === count[0] );

                    if( allEqual(count) === true ) {
                        return true;
                    } else {
                        return false;
                    }
                }
            } else {
                console.log("Processing your message now for ", data.device_id);
                let result = await mongoInsert( data, { deviceId: data.device_id }, "MQTTDevice", "find" );
                console.log("device detail for single event is", JSON.stringify(result));

                //device id check
                if( result && result.deviceId && data.device_id === result.deviceId ) {
                    //device status check
                    if( result.status && data.status === "Active" ) {
                        //device name check
                        if( data.device_name && data.device_name === result.deviceName ) {
                            //device mac check
                            if( data.mac_id && data.mac_id === result.mqttMacId) {
                                //logger type check
                                let resultConfig = await mongoInsert( data, { deviceId: data.device_id, logType: data.log_type }, "MQTTLoggerType", "find" );

                                if(resultConfig && resultConfig._id) {
                                    let resultExisting = await mongoInsert( data, { device_id: data.device_id, log_line_count: data.log_line_count }, "MQTTLogger", "find" );

                                    if(resultExisting && resultExisting._id) {
                                        console.log("MQTTLogger is already present.");

                                        return false;
                                    } else {
                                        data._id = uuidv4();
                                        data.modified_time = moment().format("YYYY-MM-DD HH:mm:ss");
                                        await mongoInsert( data, {}, "MQTTLogger", "create" );
                
                                        return true;
                                    }
                                } else {
                                    let resultExisting = await mongoInsert( data, { device_id: data.device_id, log_line_count: data.log_line_count }, "dump_logger_type", "find" );

                                    if(resultExisting && resultExisting._id) {
                                        console.log("dump_logger_type is already present.");

                                        return false;
                                    } else {
                                        data._id = uuidv4();
                                        data.modified_time = moment().format("YYYY-MM-DD HH:mm:ss");
                                        await mongoInsert( data, {}, "dump_logger_type", "create" );

                                        return false;
                                    }
                                }
                            } else {
                                let resultExisting = await mongoInsert( data, { device_id: data.device_id, log_line_count: data.log_line_count }, "dump_device_mac", "find" );

                                if(resultExisting && resultExisting._id) {
                                    console.log("dump_device_mac is already present.");

                                    return false;
                                } else {
                                    data._id = uuidv4();
                                    data.modified_time = moment().format("YYYY-MM-DD HH:mm:ss");
                                    await mongoInsert( data, {}, "dump_device_mac", "create" );

                                    return false;
                                }
                            }
                        } else {
                            let resultExisting = await mongoInsert( data, { device_id: data.device_id, log_line_count: data.log_line_count }, "dump_device_name", "find" );

                            if(resultExisting && resultExisting._id) {
                                console.log("dump_device_name is already present.");

                                return false;
                            } else {
                                data._id = uuidv4();
                                data.modified_time = moment().format("YYYY-MM-DD HH:mm:ss");
                                await mongoInsert( data, {}, "dump_device_name", "create" );

                                return false;
                            }
                        }
                    } else {
                        let resultExisting = await mongoInsert( data, { device_id: data.device_id, log_line_count: data.log_line_count }, "dump_device_status", "find" );

                        if(resultExisting && resultExisting._id) {
                            console.log("dump_device_status is already present.");

                            return false;
                        } else {
                            data._id = uuidv4();
                            data.modified_time = moment().format("YYYY-MM-DD HH:mm:ss");
                            await mongoInsert( data, {}, "dump_device_status", "create" );

                            return false;
                        }
                    }
                } else {
                    let resultExisting = await mongoInsert( data, { device_id: data.device_id, log_line_count: data.log_line_count }, "dump_device_id", "find" );

                    if(resultExisting && resultExisting._id) {
                        console.log("dump_device_id is already present.");

                        return false;
                    } else {
                        data._id = uuidv4();
                        data.modified_time = moment().format("YYYY-MM-DD HH:mm:ss");
                        await mongoInsert( data, {}, "dump_device_id", "create" );

                        return false;
                    }
                }
            }
        } else {
            let resultExisting = await mongoInsert( data, { device_id: data.device_id ? data.device_id : "", log_line_count: data.log_line_count ? data.log_line_count : "" }, "dump_device_id", "find" );

            if(resultExisting && resultExisting._id) {
                console.log("dump_device_id is already present.");

                return false;
            } else {
                data._id = uuidv4();
                data.modified_time = moment().format("YYYY-MM-DD HH:mm:ss");
                await mongoInsert( data, {}, "dump_device_id", "create" );

                return false;
            }
        }
    } catch (err) {
        console.log("error occurred.", err);

        return false;
    }
}

async function mongoInsert(data, filter, collectionName, type) {
    let count = 0;
    const client = await MongoClient.connect(connection.mongo.url, { useNewUrlParser: true }).catch(err => { console.log(err); });

    if (!client) {

        if(count === 4) {
            return false;
        } else {
            count++;
            await mongoInsert(data);
        }
    }

    if(type === "find") {
        try {
            const db = client.db(connection.mongo.database);
            let collection = db.collection(collectionName);
            let res = await collection.findOne(filter);
    
            // console.log(res);

            return res;
        } catch (err) {
            console.log(err);
        }
    }

    if(type === "create") {
        try {
            const db = client.db(connection.mongo.database);
            let collection = db.collection(collectionName);
            let res = await collection.insertOne(data);
    
            console.log("data insert to ", collectionName, res.insertedCount);
            return res;
        } catch (err) {
            console.log(err);
        }
    }
}

module.exports = {
    utilizeMqtt
};