const readAudio = require('read-audio');
const pull = require('pull-stream');
const getEnergy = require('./get-energy');
const fs = require('fs');
const saveFile = require('./save-file');
const getFile = require('./get-file');
const getSilence = require('./get-silence');
const getCountDown = require('./get-countdown');
const async = require('async');

const recordDelay = 500;
const durationToRecordFor = 5000;

const filesToCapture = [
  'data/0.json',
  'data/1.json'
];

getSilence((error, silence) => {
  if (error) {
    console.log(error);
    return;
  }

  async.map(
    filesToCapture, 
    getFile,
    (error, files) => {
      async.series(
        files.filter(file => file === null).map((file, i) => {
          return record.bind(null, silence, filesToCapture[i]);
        }),
        () => {
          console.log('finished recording');
        }
      );
    }
  );
});

function record(silenceLevel, fileName, callback) {
  const countDown = getCountDown(`Recording ${fileName} in:`);

  countDown(() => {
    const audio = readAudio();
    const startTime = Date.now();
    const recording = [];
    let calledCallback = false;

    pull(
      audio,
      pull.map(function (result) {
        return getEnergy(result.data);
      }),
      pull.drain(function (value) {
        const time = Date.now() - startTime;

        if (time > durationToRecordFor + recordDelay) {
          if (!calledCallback) {
            audio.ps.kill();
            saveFile(fileName, JSON.stringify(recording));
            callback(null, recording);
            calledCallback = true;
          }
  
          return;
        }

        if (time > recordDelay && value > silenceLevel) {
          recording.push(value);
        }
      })
    );
  });
}
