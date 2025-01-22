// @ts-check
const writeFile = require('fs').writeFileSync;
const readFileSync = require('fs').readFileSync;
const generateSamplesList = require('./functions/generateManifest.cjs');

const path = require('path');
const scriptDir = "./"

const samplesDirRelative = 'audio';
const samplesDir = path.join(scriptDir, "/public", samplesDirRelative);

const getKits = async (samplesDir) => {
    const namingsPath = path.join(samplesDir, '/namings.json');
    const resNamingPath = path.resolve(scriptDir, namingsPath);
    const namings = JSON.parse(
        readFileSync(resNamingPath, 'utf8')
    );
    return generateSamplesList(namings, samplesDir , 'audio', 'factory samples', 'http');
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
    return "export default " + stringifier(samplesList).replace(/\"Infinity\"/g,"Infinity");
}

getKits(samplesDir).then((theKits) => {

    writeFile(
        path.join(scriptDir, './public/audio', 'samples.json'),
        stringifier({
            url: '/audio',
            name: 'factory',
            content:theKits
        })
    );
});