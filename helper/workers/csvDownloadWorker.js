const fs = require("fs");
const momenttz = require("moment-timezone");
const csvWriteStream = require("csv-write-stream");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;
const { workerData, parentPort } = require("worker_threads");
const testFunc = async ({
	tData,
	column,
	fileName,
	userInfo = {},
	...workerData
}) => {
	if (tData && column && fileName) {
		try {
			let finalURL = "";
			const name = `${fileName ? fileName : "Report"}-${momenttz().format(
				"YYYY-MM-DD-HH-mm"
			)}`;
			const tName = `${name}.csv`;
			const url = `xlsReport/${tName}`;
			fs.createWriteStream(`${__dirname}/../../../private/${url}`);
			finalURL = `/static/${url}`;

			let headers = [];
			for (let tRow of column) {
				headers.push({ id: tRow.name || tRow, title: tRow.label || tRow });
			}

			let path = `${__dirname}/../../../private/${url}`;
			const csvWriter = createCsvWriter({
				path: path,
				header: headers,
			});
			var tColumnRow = [];
			for (let t of tData) {
				let tRow = {};
				column.forEach((data) => {

					let tData = data;
					if (data && data.dataValues && typeof data !== "undefined") {
						tData = data.dataValues;
					} else if (data && typeof data !== "undefined") {
						tData = data;
					} else {
						tData = data;
					}

					tRow[tData.name || tData] = t[tData.name || tData];

				});
				//console.log("tColumnRow",tRow);
				tColumnRow.push(tRow);
			}
			await csvWriter.writeRecords(tColumnRow);
			//   return finalURL;
			// parentPort.postMessage(finalURL);
			const tResponse = {
				statusCode: 200,
				success: true,
				path: path,
				name: tName,
				status: finalURL,
			};
			parentPort.postMessage(tResponse);
		} catch (error) {
			const tResponse = {
				statusCode: 404,
				success: false,
				msg: "PARAMETER_ISSUE",
				err: error,
			};
			parentPort.postMessage(tResponse);
		}
	} else {
		const tResponse = {
			statusCode: 404,
			success: false,
			msg: "tData,column & fileName are mandatory",
		};
		parentPort.postMessage(tResponse);
	}
};

testFunc(workerData);

module.exports = {
	testFunc,
};
