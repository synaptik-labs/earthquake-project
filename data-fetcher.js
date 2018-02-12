const fetch = require('node-fetch');
const fs = require('fs');

const startRange = new Date("1980-01-01 00:00:00");
//const endRange = new Date("1982-01-01");
const endRange = new Date();

const frameSize = 1;	// In months

async function fetchData(startFrame, endFrame) {
	let url = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=csv&orderby=time-asc&starttime=${startFrame.toISOString()}&endtime=${endFrame.toISOString()}`;

	console.log(`Fetching data from ${url}`);
	let response = await fetch(url);
	let data = await response.text();

	if (response.status != 200) {
		throw data;
	}

	return data;
}

async function fetchAllData() {
	let frameStartTime = new Date(startRange);
	let frameEndTime = new Date(startRange);
	frameEndTime.setMonth(frameEndTime.getMonth() + frameSize);

	let done = false;

	let stream = fs.createWriteStream('data.csv');
	let firstRequest = true;

	while (!done) {
		let data = await fetchData(frameStartTime, frameEndTime);
		if (!firstRequest) {
			data = data.substring(data.indexOf("\n")+1);
		} else {
			firstRequest = false;
		}
		stream.write(data);

		frameStartTime.setMonth(frameStartTime.getMonth() + frameSize);
		frameEndTime.setMonth(frameEndTime.getMonth() + frameSize);

		if (frameStartTime > endRange) {
			done = true;
		}
	}
}

fetchAllData();

//const endRange = new Date();

