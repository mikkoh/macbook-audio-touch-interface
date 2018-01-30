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

console.log("Average silence: ", getAverage(silenceData));

const trainingDataTouchPosition = 
    filesToTrainFrom.map((fileName, i) => {
        const contents = fs.readFileSync(fileName, 'utf8');
        const data = JSON.parse(contents);

        return data.map((energy) => {
            return { input: [energy], output: [i] };
        });
    })
    .reduce((combinedArray, currentTrainingData) => {
        console.log("Average: ", getAverage(currentTrainingData.map(data => data.input[0])));

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

            console.log(energy, resultPosition);

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
