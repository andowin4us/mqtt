const util = require('../helper/util');
const ThirdPartyAPICaller = require('../common/ThirdPartyAPICaller');
const { MIDDLEWARE_SCHEDULER_API, MIDDLEWARE_SCHEDULER_API_SUB_ROUTE } = process.env;

const ActivityLogController = () => {

	const addAuditLogCommon = async (req, res) => {
		console.log('addAuditLogCommon', req.body);
		if (req && req.body && req.body) {
			let thirdPartyAPI = new ThirdPartyAPICaller();
			let url = `${MIDDLEWARE_SCHEDULER_API}/${MIDDLEWARE_SCHEDULER_API_SUB_ROUTE}`;
			if (url && url !== "") {
				console.log(`api to call ${url}`);
				let apiResult = await thirdPartyAPI.thirdPartyAPI_Call("POST", `${url}`, req.body);
				let response = apiResult.data || {};
				return res.status(200).json(response);
			} else {
				console.log("No url to send api data to")
			}
		} else {
			return res.status(404).json({ status: "fail", statusCode: 404, result: [] });
		}
	}

	return {
		addAuditLogCommon,
	};
};



module.exports = ActivityLogController;
