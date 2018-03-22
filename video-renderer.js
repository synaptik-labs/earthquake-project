const ffmpeg = require('fluent-ffmpeg');

process.env['FFMPEG_PATH'] = 'D:/devtools/ffmpeg/bin/ffmpeg.exe';

console.log("Starting video rendering.");

ffmpeg()
	.input(__dirname + "/frames/frame-%06d.png")
	.output(__dirname + "/video.mp4")
	.fps(24)
	.on("progress", function(progress) {
		if (progress.percent) {
			console.log("Progress: " + progress.percent + "% done (" + progress.frames + ")");
		} else {
			console.log("Progress: " + JSON.stringify(progress));
		}
	})
	.on("error", function(error, stdout, stderr) {
		console.log("Error: " + JSON.stringify(error));
	})
	.on("end", function(stdout, stderr) {
		console.log("Done!");
		console.log("stdout: ", stdout);
		console.log("stderr: ", stderr);
	})
	.run();