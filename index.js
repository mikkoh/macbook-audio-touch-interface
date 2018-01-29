const brain = require('brain.js');
const fs = require('fs');
const readAudio = require('read-audio');
const pull = require('pull-stream');
const getEnergy = require('./get-energy');

const filesToTrainFrom = [
    '0',
    '1'
];

const net = new brain.NeuralNetwork({
    activation: 'relu',
    hiddenLayers: [4]
});



const trainingData = 
    filesToTrainFrom.map((fileName) => {
        const contents = fs.readFileSync(`${fileName}.json`);
        const data = JSON.parse(contents);
        const output = fileName.split('-').map(parseFloat);

        return data.map((energy) => {
            return { input: [energy], output };
        });
    })
    .reduce((combinedArray, currentTrainingData) => {
        return combinedArray.concat(currentTrainingData);
    }, []);

net.train(
    trainingData, 
    {
        errorThresh: 0.005,
        iterations: 20000,
        logPeriod: 100,
        learningRate: 0.3,
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
        pull.drain(function (value) {
            const result = net.run([value]);
            let name;

            console.log(value, result);

            if (result[0] < 0.25) {
                name = 'left';
            } else if (result[0] > 0.25 && result[0] < 0.75) {
                name = 'center';
            } else {
                name = 'right';
            }

            console.log(`${name} ${result[0]}`);
        })
    );
}
