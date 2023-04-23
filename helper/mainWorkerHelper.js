const mainWorkerThreadCall = async (tData, downloadFormat, url, userInfo) => {
	const filename =
		downloadFormat === "excel" ? "excelDownloadWorker" : "csvDownloadWorker";
	return new Promise(async (resolve, reject) => {
		try {
			const { Worker, isMainThread } = require("worker_threads");
			console.log("worker_threads is found");
			if (isMainThread) {
				const worker = new Worker(
					url ? url : `./api/helper/workers/${filename || "worker"}.js`,
					{
						workerData: tData,
					}
				);
				worker.on("message", (msg) => {
					resolve(msg);
				});
				worker.on("online", () => {
					console.log("worker is online");
				});
				worker.on("error", (error) => {
					console.log("error", error);
					reject(error);
				});
				worker.on("exit", (code) => {
					console.log("worker thread exit with code", code);
					if (code !== 0) {
						console.log(new Error(`Worker stopped with exit code ${code}`));
						reject(code);
					}
				});
			}
		} catch (e) {
			console.error("worker_threads is not found", e);
			const urlGen = require("./downloadHelper");
			let data;
			try {
				if (downloadFormat === "excel") {
					data = await urlGen.excelDownload(tData);
				} else {
					data = await urlGen.csvDownload(tData);
				}
				if (data) {
					resolve(data);
				} else {
					reject("download fail non worker thread");
				}

			} catch (error) {
				console.log("error in non thread", error);
			}
		}
	});
};

module.exports = {
	mainWorkerThreadCall,
};
