/* eslint-disable no-console */
const axios = require('axios');
const https = require('https');
const request = require('request');

class ThirdPartyAPICaller {
	constructor() { }

	async thirdPartyAPI_Call(type, url, body, actucalResponse = false, headers) {
		if (type === "GET") {
			try {

				return await axios.get(url);

			} catch (error) {

				return { statusCode: 404, success: false, msg: 'API_ISSUE', err: error };
			}
		}
		if (type === "POST") {
			try {
				let tData = await axios.post(url, body, {
					httpsAgent: new https.Agent({
						rejectUnauthorized: false
					})
				});
				if (actucalResponse) { // This flag is for Inside Apis
					return tData;
				}
				if (tData && tData.statusCode && tData.OUTPUT) {
					return { statusCode: tData.STATUS_CODE, success: tData.OUTPUT, msg: tData.LOG || "" };
				}
				return tData;
			} catch (error) {
				console.log(`thirdPartyAPI_Call`, error);
				return { statusCode: 404, success: false, msg: 'API_ISSUE', err: error };
			}
		}
	}

	async syncAPIRequest(clientServerOptions, actucalResponse = false) {
		return new Promise(function (resolve, reject) {
			request(clientServerOptions, function (error, res, body) {
				try { console.log(body) } catch (e) { }
				if (!error && res && res.statusCode == 200) {
					console.log(res.statusCode);
					let mResponse = {}
					if (actucalResponse) {
						resolve(body);
						return;
					}

					try {
						mResponse = JSON.parse(body);
						resolve(mResponse);
					} catch (e) {
						resolve({ succuss: false, status: "In Valid Data" });
					}
				} else {
					let mResponse = {}
					try {
						mResponse = JSON.parse(body);
					} catch (e) {
						console.log(e);
						mResponse = body;
					}
					resolve(mResponse);
				}
			});
		});
	}


}

module.exports = ThirdPartyAPICaller;
