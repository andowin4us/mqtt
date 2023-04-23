const fs = require("fs");
const momenttz = require("moment-timezone");
const xlsxPopulate = require("xlsx-populate");
const { workerData, parentPort } = require("worker_threads");
const createHeader = (summarySheet, column) => {
	summarySheet.row(1).height(20);
	var topFirst = "A",
		first = "D",
		last = "Z",
		prefix = "",
		topLast = "Z";
	var i = first.charCodeAt(0);
	summarySheet.cell(`A2`).value("Start Time");
	summarySheet.cell(`B2`).value("End Time");
	summarySheet.cell(`C2`).value("Recording URL");
	column.forEach((data) => {
		if (data && typeof data !== "undefined") {
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
			summarySheet
				.column(`${eval("String.fromCharCode(" + i + ")")}`)
				.width(20);
		}
	});
	summarySheet
		.range(`${topFirst}1:${topLast}1`)
		.merged(true)
		.value("CDR Report")
		.style({
			bold: true,
			horizontalAlignment: "center",
			fontFamily: "Arial",
			fontSize: 12,
			verticalAlignment: "center",
			borderColor: "black",
			borderStyle: "thin",
		});
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
			const elsxReport = await xlsxPopulate.fromBlankAsync();
			elsxReport.sheet(0).name(`${fileName}`);
			const summarySheet = elsxReport.sheet(0);
			createHeader(summarySheet, column);
			summarySheet.column("J").width(5);
			let j = 3;
			for (let t of tData) {
				var first = "A",
					last = "Z",
					prefix = "";
				var i = first.charCodeAt(0);
				column.forEach((data) => {
					if (data && typeof data !== "undefined") {
						let charName = `${eval("String.fromCharCode(" + i + ")")}`;
						if (data.customParam && t.variable_params) {
							summarySheet
								.cell(`${prefix}${eval("String.fromCharCode(" + i + ")")}${j}`)
								.value(t.variable_params[data.name]);
						} else {
							summarySheet
								.cell(`${prefix}${eval("String.fromCharCode(" + i + ")")}${j}`)
								.value(t[data]);
						}
						if (charName === last) {
							i = "A".charCodeAt(0);
							prefix = "A";
						} else {
							i = i + 1;
						}
					}
				});
				j++;
			}

			const name = `${fileName}-${momenttz().format("YYYY-MM-DD-HH-mm")}`;
			const url = `xlsReport/${name}.xlsx`;
			await elsxReport.toFileAsync(`${__dirname}/../../../private/${url}`);
			finalURL = `/static/${url}`;
			const tResponse = {
				statusCode: 200,
				success: true,
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
