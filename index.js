const brain = require('brain.js');
const fs = require('fs');
const readAudio = require('read-audio');
const pull = require('pull-stream');
const getEnergy = require('./get-energy');
const clear = require('clear');
const robot = require('robotjs');

const silenceData = JSON.parse(fs.readFileSync('data/silence.json'));
const filesToTrainFrom = [
    'data/0.json',
    'data/1.json'
];
const dataFromFiles = filesToTrainFrom.map((fileName) => {
    const contents = fs.readFileSync(fileName, 'utf8');

    return JSON.parse(contents).sort();
});

const screenSize = robot.getScreenSize();
const mousePosition = [screenSize.width * 0.5, screenSize.height * 0.5];
const targetMouse = mousePosition.slice();

const touchPositionNet = new brain.NeuralNetwork({
    hiddenLayers: [2]
});

const touchIsDownNet = new brain.NeuralNetwork({
    hiddenLayers: [4]
});

function getAverage(data) {
    return data.reduce((sum, value) => {
        return sum + value;
    }, 0) / data.length;
}

function getMedian(data, isDataSorted = true) {
    if (isDataSorted) {
        return data[Math.round(data.length * 0.5)];
    } else {
        return data.sort()[Math.round(data.length * 0.5)];
    }
}

console.log("Average silence: ", getAverage(silenceData));
console.log("Median silence: ", getMedian(silenceData));
console.log("Average 0: ", getAverage(dataFromFiles[0]));
console.log("Median 0: ", getMedian(dataFromFiles[0]));
console.log("Average 1: ", getAverage(dataFromFiles[1]));
console.log("Median 1: ", getMedian(dataFromFiles[1]));


const trainingDataTouchPosition = 
    dataFromFiles
    .map((data, i) => {
        const aboveMedian = data.filter((energy) => {
            return Math.abs(energy - getMedian(data)) < 0.005;
        });

        console.log('reduced', data.length, aboveMedian.length);

        return aboveMedian;
    })
    .map((data, i) => {
        return data.map((energy) => {
            return { input: [energy], output: [i] };
        });
    })
    .reduce((combinedArray, currentTrainingData) => {
        return combinedArray.concat(currentTrainingData);
    }, []);

const trainingDataIsTouchDown = [].concat(
    trainingDataTouchPosition.map((data) => {
        return {
            input: data.input,
            output: [1]
        };
    }),
    silenceData.map((energy) => {
        return {
            input: [energy],
            output: [0]
        }
    })
);

touchPositionNet.train(
    trainingDataTouchPosition, 
    {
        errorThresh: 0.005,
        iterations: 20000,
        logPeriod: 100,
        log: true
    }
);

touchIsDownNet.train(
    trainingDataIsTouchDown, 
    {
        errorThresh: 0.005,
        iterations: 20000,
        logPeriod: 100,
        log: true
    }
);

startPredicting();


function startPredicting() {
    const audio = readAudio();
    const startTime = Date.now();
    const recording = [];

    pull(
        audio,
        pull.map(function (result) {
            return getEnergy(result.data);
        }),
        pull.drain(function (energy) {
            const resultPosition = touchPositionNet.run([energy]);
            const resultIsDown = touchIsDownNet.run([energy]);
            let name;

            if (resultPosition[0] < 0.25) {
                name = 'top';
            } else if (resultPosition[0] > 0.25 && resultPosition[0] < 0.75) {
                name = 'center';
            } else {
                name = 'bottom';
            }

            clear();
            console.log(name);
            console.log('position', resultPosition[0]);
            console.log('is down', resultIsDown[0] > 0.5);

            if (resultIsDown[0] > 0.5) {
                targetMouse[0] = screenSize.width * 0.5;
                targetMouse[1] = screenSize.height * resultPosition[0];
            }

            mousePosition[0] += (targetMouse[0] - mousePosition[0]) * 0.01;
            mousePosition[1] += (targetMouse[1] - mousePosition[1]) * 0.01;

            robot.moveMouse(mousePosition[0], mousePosition[1]);
        })
    );
}
