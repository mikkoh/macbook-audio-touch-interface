const fs = require('fs');

module.exports = (file, callback) => {
  fs.readFile(file, 'utf8', (error, value) => {
    if (error) {
      callback(null, null);
    } else {
      callback(null, value);
    }
  });
};
