const ExportCSV = async (tData, userInfo) => {
	const { Worker, isMainThread } = require("worker_threads");
	return new Promise(async (resolve, reject) => {
		if (isMainThread) {
			const worker = new Worker(`./api/helper/worker.js`, {
				workerData: tData,
			});

			// // resolve("main");
			worker.on("message", (msg) => {
				resolve(msg);
			});
			worker.on("online", () => {
				console.log("online");
			});
			worker.on("error", (error) => {
				console.log("error", error);
				reject(error);
			});
			worker.on("exit", (code) => {
				console.log("worker therd exit", code);
				if (code !== 0) {
					console.log(new Error(`Worker stopped with exit code ${code}`));
					reject(code);
				}
			});
		} else {
			console.log("not inside main thread");
		}
	});
};

module.exports = {
	ExportCSV,
};
