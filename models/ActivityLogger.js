const Util = require('../helper/util');
const workerHelper = require("../helper/mainWorkerHelper");
const momenttz = require("moment-timezone");

const activityLogs = async (tData, userInfo = {}) => {
    try {
        // Util.addAuditLogsCustome(userInfo, tData.log,
        //     JSON.stringify(tData),
        //     tData.type, tData.subType,
        //     tData);
        return {
            statusCode: 200,
            success: true,
            msg: {},
        };
    } catch (error) {
        console.log(error);
        return {
            statusCode: 400,
            success: false,
            msg: "AuditLog Unsuccessfull",
        };
    }
};


// const getData = async (cData, isDownload = false, userInfo) => {
//     try {
//         var tmpData = {};
//         var boolQuery;
//         boolQuery = esb.boolQuery();
//         if (cData.startDate && cData.endDate) {
//             let startDate = momenttz(cData.startDate).tz("Asia/Calcutta").format("x");
//             let endDate = momenttz(cData.endDate).tz("Asia/Calcutta").format("x");
//             boolQuery.must(
//                 esb.rangeQuery("initiateTime").gte(startDate).lte(endDate)
//             );
//         }
//         if (cData.freeTextSearch && cData.freeTextSearch !== "") {
//             boolQuery.must(esb.queryStringQuery(cData.freeTextSearch));
//         }

//         if (userInfo && (userInfo.accesslevel === 3 || userInfo.accesslevel === 10)) {
//             boolQuery.must(esb.matchQuery('userName', userInfo.agentUserName));
//         }

//         let tSort = new esb.Sort("initiateTime", "desc");
//         tSort.unmappedType("boolean");
//         tmpData = esb.requestBodySearch().query(boolQuery).sort(tSort);
//         console.log("boolQuery", JSON.stringify(tmpData));
//         //tmpData._body.aggs = {};
//         //tmpData._body.size = 0;
//         //let tData = getFormateData(cData);

//         console.log("isDownload ===>", isDownload);
//         let response;
//         try {
//             if (isDownload === false) {
//                 response = await Elastic.elasticSearchData(
//                     ELASTIC_INDEX_NAME,
//                     ELASTIC_INDEX_TYPE,
//                     tmpData,
//                     cData.size,
//                     cData.from
//                 );
//             } else {
//                 response = await Elastic.elasticSearchData(
//                     ELASTIC_INDEX_NAME,
//                     ELASTIC_INDEX_TYPE,
//                     tmpData,
//                     50000,
//                     0
//                 );
//                 console.log("Inside download");
//             }
//         } catch (e) {
//             console.log(e);
//             return null;
//         }
//         return response;
//     } catch (e) {
//         console.log(e);
//     }
// };

const ExportReport = async (tData, userInfo = {}) => {
    console.log("tDATA-->", tData);
    let finalURL = "";
    // let coloum = tdata.column;
    let cData = {
        startDate: tData.startDate,
        endDate: tData.endDate,
        type: tData.type,
        timeZone: tData.timeZone,
        typeOfGroupBy: tData.typeOfGroupBy,
        freeTextSearch: tData.freeTextSearch,
    };
    if (cData.typeOfGroupBy === "agentSkill") {
        tData = await getMongoData(cData, false);
        val = await formateMongoData(tData, cData.typeOfGroupBy);
    } else {
        tData = await getData(cData, true, userInfo);
        val = await formateData(tData, cData.typeOfGroupBy);
    }

    let isFailed = true;
    let finalJson = val[0];
    let coloum = val[1];
    let totalSize = cData.typeOfGroupBy === "agentSkill" ? val[0].length : tData.hits.total;

    try {
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
    activityLogs,
    ExportReport
};