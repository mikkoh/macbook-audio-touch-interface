module.exports = (data) => {
    // calculate root mean square
    let sum = 0;

    data.slice(0, 128).forEach((value) => {
        sum += value * value;
    });

    sum /= data.length;

    return Math.sqrt(sum);
};
