const { createCanvas, loadImage } = require('canvas');
const lineReader = require('line-reader');
const fs = require('fs');

// Values for the size of the background image
const SCREEN_WIDTH = 1920;
const SCREEN_HEIGHT = 1080;
const HALF_WIDTH = SCREEN_WIDTH / 2;
const HALF_HEIGHT = SCREEN_HEIGHT / 2;

// Values used to convert longitude and latitude into x and y coordinates for the background image
// Longitude = -180 degrees to +180 degrees
// Latitude  = -90 degrees to 90 degrees
//   (NOTE: Up is positive for latitude but screen coordinates are negative so we have to invert the value)
const X_RATIO = HALF_WIDTH / 180;
const Y_RATIO = -HALF_HEIGHT / 90;

// Values to determine length of video as well as the number of frames.
const VIDEO_DURATION = 3600;	// in seconds
const FRAMES_PER_SECOND = 24;
const TOTAL_FRAMES = VIDEO_DURATION * FRAMES_PER_SECOND;

// Values used for removing and updating earthquakes between image frames.
const QUAKE_DURATION = 12;	// frames
const QUAKE_DECAY_RATE = 1.0 / QUAKE_DURATION;

const START_DATE = new Date('1980-01-01T06:17:45.250Z');
const END_DATE = new Date('2018-02-09T22:01:49.307Z');
const FRAME_WINDOW_SIZE = (END_DATE - START_DATE) / TOTAL_FRAMES;

// Tracked earthquakes that will be converted into circles and drawn for each image
let quakes = [];

// The frameWindow will track the time frame that earthquakes fall within for a given image.
//   Based on the default values above this is roughly 4 hours. Meaning each image will represent
//   4 hours of earthquakes.
let frameWindow = { start: new Date(START_DATE), end: new Date(START_DATE)};
frameWindow.end.setMilliseconds(frameWindow.end.getMilliseconds() + FRAME_WINDOW_SIZE);

// Loop through all tracked earthquakes and update the alpha and age values.
//  Remove quakes that are considered too old
function updateEarthquakeData() {
	for (let i = 0; i < quakes.length ; i ++) {
		let quake = quakes[i];
		quake.alpha -= QUAKE_DECAY_RATE;
		quake.age ++;
		if (quake.age > QUAKE_DURATION) {
			quakes.splice(i, 1);
			i --;
		}
	}
}

// Convert token array into an earthquake object
function addEarthquake(tokens) {
	// time,latitude,longitude,depth,mag
	let time = new Date(tokens[0]);
	let yPos = (tokens[1] * Y_RATIO) + HALF_HEIGHT;
	let xPos = (tokens[2] * X_RATIO) + HALF_WIDTH;
	let radius = tokens[4] * tokens[4];
	let quake = { time: time, x: xPos, y: yPos, radius: radius, alpha: 1.0, age: 0};
	quakes.push(quake);
}

// Renders an individual image frame based on the tracked earthquake data
function renderFrame(context, backgroundImage, filename) {
	context.drawImage(backgroundImage, 0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

	// Draw circles for each earthquake
	quakes.forEach((quake) => {
		context.fillStyle = "rgba(255, 0, 0, " + quake.alpha + ")";

		context.beginPath();
		context.arc(quake.x, quake.y, quake.radius, 0, Math.PI * 2);
		context.fill();
	});

	// Add the date of the frame window to the bottom left corner of the image
	context.font = "30px Arial";
	context.fillStyle = "rgba(255, 0, 0, 1.0)";
	context.fillText(frameWindow.start, 0, SCREEN_HEIGHT - 30);

	// Write the image out as a PNG
	let stream = context.canvas.pngStream();
	let out = fs.createWriteStream(filename);

	stream.on('data', (data) => {
		out.write(data);
	});

	stream.on('end', () => {
		out.end();
	});
}

// Main loop function
function render() {
	loadImage("background.png").then((backgroundImage) => {
		let canvas = createCanvas(SCREEN_WIDTH, SCREEN_HEIGHT);
		let context = canvas.getContext('2d');

		let lineNumber = 0;
		let frameNumber = 0;
		lineReader.eachLine('data.csv', (line, last) => {
			lineNumber ++;
			if (lineNumber > 1) {
				// Skip the header

				let tokens = line.split(',');
				let quakeDate = new Date(tokens[0]);
				if (quakeDate > frameWindow.end) {
					// If the earthquake we are processing exceeds the current frame window, we'll
					//  render the existing data to an image and update the data (i.e. fade the earthquakes)
					let filename = 'frames/frame-' + ('' + frameNumber).padStart(6, '0') + '.png';

					if (!fs.existsSync(filename)) {
						// If the frame image does not already exist we'll create it
						renderFrame(context, backgroundImage, filename);
						console.log("Wrote frame to " + filename);
						console.log("  - Earthquakes processed: " + lineNumber);
					} else {
						// If the frame image already exists we will not create it
						// This allows us to 'continue' the process since it requires a significant amount of time
						//   to run to completion.
						console.log("Frame already exists: " + filename);
						console.log("  - Earthquakes processed: " + lineNumber);
					}

					// Advance the frame window for the next image
					frameWindow.start.setMilliseconds(frameWindow.start.getMilliseconds() + FRAME_WINDOW_SIZE);
					frameWindow.end.setMilliseconds(frameWindow.end.getMilliseconds() + FRAME_WINDOW_SIZE);
					frameNumber++;
					updateEarthquakeData();
				}
				addEarthquake(tokens);
			}
		});
	});
}

render();