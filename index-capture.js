const readAudio = require('read-audio');
const pull = require('pull-stream');
const getSilence = require('./silence');
const getEnergy = require('./get-energy');
const fs = require('fs');

const args = process.argv.slice(2);
const recordDelay = 500;
const durationToReecordFor = 5000;
let fileName;

if (args.length == 0) {
    errorMessage();
    return;
} else {
    fileName = args[0];
    
    if (!fileName) {
        errorMessage();
        return;
    }
}

getSilence((err, silenceLevel) => {
    console.log('start recording');
    record(silenceLevel, (err, recording) => {
        fs.writeFileSync(`${fileName}.json`, JSON.stringify(recording));
    });
});


function record(silenceLevel, callback) {
    const audio = readAudio();
    const startTime = Date.now();
    const recording = [];

    pull(
        audio,
        pull.map(function (result) {
            return getEnergy(result.data);
        }),
        pull.drain(function (value) {
            const time = Date.now() - startTime;

            if (time > durationToReecordFor + recordDelay) {
                audio.ps.kill();
                callback(null, recording);
                return;
            }

            if (time > recordDelay && value > silenceLevel) {
                recording.push(value);
            }
        })
    );
}

function errorMessage() {
    console.log('pass in the filename');
}

