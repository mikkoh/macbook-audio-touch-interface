const path = require('path');
const fs = require('fs-extra');

module.exports = (outPath, contents) => {
    const directory = path.dirname(outPath);

    fs.ensureDirSync(directory);
    fs.writeFileSync(outPath, contents);
};
