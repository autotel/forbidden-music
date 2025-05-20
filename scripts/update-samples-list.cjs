// @ts-check
const writeFile = require('fs').writeFileSync;
const readFileSync = require('fs').readFileSync;
const generateSamplesList = require('./functions/generateManifest.cjs');

const path = require('path');
const scriptDir = "./"

const samplesListFilename = 'samplesLibrary.json';
const samplesDirRelative = 'extras-84Z5I4';
const samplesDir = path.join(scriptDir, "/public");

const getKits = async (samplesDir) => {
    const namingsPath = path.join(samplesDir, samplesDirRelative, '/namings.json');
    const resNamingPath = path.resolve(scriptDir, namingsPath);
    const namings = JSON.parse(
        readFileSync(resNamingPath, 'utf8')
    );
    return generateSamplesList(namings, samplesDir, samplesDirRelative, 'factory samples', 'http');
}

function censor(key, value) {
    if (value === Infinity) {
        return "Infinity";
    } else {
        return value;
    }
}

const stringifier = (samplesList) => {
    return JSON.stringify(samplesList, censor, 2);
}
const tsStringifier = (samplesList) => {
    return "export default " + stringifier(samplesList).replace(/\"Infinity\"/g, "Infinity");
}

getKits(samplesDir).then((theKits) => {

    writeFile(
        path.join(samplesDir, samplesDirRelative, samplesListFilename),
        stringifier({
            url: '/' + samplesDirRelative,
            name: samplesDirRelative,
            content: theKits
        })
    );
});