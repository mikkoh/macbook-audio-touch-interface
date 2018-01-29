module.exports = (data) => {
    // calculate root mean square
    let sum = 0;

    data.forEach((value) => {
        sum += value * value;
    });

    sum /= data.length;

    return Math.sqrt(sum);
};
