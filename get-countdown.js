module.exports = (prompt) => {
  let countDown = 3;

  console.log(prompt);

  return function doCountDown(callback) {
    console.log(countDown);

    countDown--;

    if (countDown >= 0) {
      setTimeout(() => {
        doCountDown(callback);
      }, 1000);
    } else {
      callback(null);
    }
  };
};
