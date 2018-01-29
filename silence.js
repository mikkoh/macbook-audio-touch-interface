const fs = require('fs');
const pull = require('pull-stream');
const readAudio = require('read-audio');
const getEnergy = require('./get-energy');

const silenceFile = 'silence.json';
const silenceFileDuration = 3000;

module.exports = (callback) => {
    if (fs.existsSync(silenceFile)) {
        getSilenceFromFile(callback);
    } else {
        getSilence(callback);
    }
};

function getSilenceFromFile(callback) {
    const result = fs.readFileSync(silenceFile);

    callback(null, average(JSON.parse(result)));
}

function getSilence(callback) {
    const audio = readAudio();
    const startTime = Date.now();
    const silence = [];
    let calledCallback;

    pull(
        audio,
        pull.map(function (result) {
            return getEnergy(result.data);
        }),
        pull.drain(function(value) {
            silence.push(value);

            if (!calledCallback && Date.now() - startTime > silenceFileDuration) {
                audio.ps.kill();
                saveSilence(silence);
                callback(null, average(silence));
                calledCallback = true;
            }
        })
    );
}

function saveSilence(silenceData) {
    fs.writeFileSync(silenceFile, JSON.stringify(silenceData));
}

function average(silence) {
    return silence.reduce((total, value) => {
        return total + value; 
    }, 0) / silence.length;
}
