const csv = require("csvtojson");
const xlsxPopulate = require("xlsx-populate");
const fs = require("fs");
const formidable = require("formidable");

const checkAndCreate = async (dir) => {
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir);
	}
};

const uploadCsvFile = async (req, fileConfig = [], ignoreEmpty = false) => {
	const form = new formidable.IncomingForm();
	return new Promise(async (resolve, reject) => {
		form.parse(req, async (err, fields, response) => {
			if (err) {
				reject({
					statusCode: 404,
					success: false,
					msg: "file upload error",
				});
			}
			if (
				!response ||
				!response.file ||
				!response.file.name ||
				response.file.name.search("csv") === -1
			) {
				reject({
					statusCode: 404,
					success: false,
					msg: "Invalid file Extention.",
				});
			}
			try {
				let finalData = await upload(
					response.file,
					fileConfig,
					req.user,
					ignoreEmpty
				);
				resolve(finalData);
			} catch (error) {
				reject(error);
			}
		});
	});
};

const upload = async (file, fileFields, userInfo = {}, ignoreEmpty) => {
	return new Promise(async (resolve, reject) => {
		const readStream = fs.createReadStream(file.path);
		const uploadDir = `${__dirname}/../../private/csv/`;
		const uploadFile = `${uploadDir}/${file.name}`;
		await checkAndCreate(uploadDir);
		const writeStream = fs.createWriteStream(uploadFile);
		const stream = readStream.pipe(writeStream);
		// Converting pipe into promise

		const pipe = (stream) =>
			new Promise((resolve, reject) => {
				stream.on("finish", resolve);
				stream.on("error", reject);
			});

		pipe(stream)
			.then(async () => {
				const usedSheets = await csv({
					noheader: true,
					output: "csv",
				}).fromFile(uploadFile);

				let fieldNames = usedSheets[0];
				usedSheets.shift();
				//checkLead(usedSheets);
				let mfields = fileFields && fileFields.length > 0 ? fileFields : [];
				let mTmp = {};
				let i = 0;
				let mIndex = -1;
				let j = 0;
				let tmp = [];

				fieldNames = fieldNames.filter(function (el) {
					return el != "";
				});
				//check if these 5 fields exist in main fields array
				for (let field of mfields) {
					if (!fieldNames.includes(field)) {
						return reject({
							statusCode: 404,
							success: false,
							msg: "Invalid columns.Please Check",
						});
					}
				}
				//loop through multiple sheets! if any.
				for (sheet of usedSheets) {
					i = 0;
					let needTOAdd = true;

					for (let mFiled of fieldNames) {
						if (!mfields.includes(mFiled)) {
							var key = fieldNames[i];
							j++;
							if (mIndex == -1) mIndex = i;
							if (key !== undefined && key !== "" && sheet[i] !== "") {
								mTmp[key] = sheet[i];
							}
						} else {
							var key = mFiled;
							if (key !== undefined && key !== "" && sheet[i] !== "") {
								mTmp[key] = sheet[i];
							}
						}
						i++;
					}
					if (mIndex != -1) {
						sheet.splice(mIndex, j);
					}

					if (needTOAdd) {
						//checking if the object has value for each of its unique fields
						for (let column of mfields) {
							//retrive keys from the row object
							let columnsFromCSV = Object.keys(mTmp);
							if (!ignoreEmpty) {
								if (!columnsFromCSV.includes(column)) {
									//check for empty row values
									return reject({
										statusCode: 404,
										success: false,
										msg: "Empty Row Or Wrong Format.Please Check",
									});
								}
							}
						}

						tmp.push(mTmp);
						mTmp = {};
					}
				}

				resolve({
					statusCode: 200,
					success: true,
					data: tmp,
					userInfo: userInfo,
				});
			})
			.catch((e) => {
				reject({ statusCode: 400, success: false, msg: "uploaded error" });
			});
	});
};

module.exports = {
	uploadCsvFile,
};
