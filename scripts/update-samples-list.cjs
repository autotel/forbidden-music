const readdir = require('fs').readdirSync;
const writeFile = require('fs').writeFileSync;
const path = require('path');
const scriptDir = "./"

const samplesRelativetoSrc = '/audio';
const samplesDir = path.join(scriptDir, "/public", samplesRelativetoSrc);
const samplePacks = readdir(samplesDir);

/**
 * function that maps the array, but if the callback returns false, it will not be included in the result
 */
const filterMap = (arr, callback) => {
    const result = [];
    for (let i = 0; i < arr.length; i++) {
        const item = callback(arr[i], i, arr);
        if (item) {
            result.push(item);
        }
    }
    return result;
}

const samplePacksList = filterMap(samplePacks, samplePack => {
    const samples = readdir(path.join(samplesDir, samplePack));

    const readmesList = filterMap(samples, sample => {
        if (!sample.match(/readme\.txt$/)) {
            return false;
        }
        const contents = require('fs').readFileSync(path.join(samplesDir, samplePack, sample), 'utf8');
        return contents;
    });

    const samplesList = filterMap(samples, sample => {
        if (!sample.match(/[\d\.]+\.wav$/)) {
            return false;
        }
        const fq = parseFloat(path.basename(sample, '.wav'));
        if (isNaN(fq)) {
            return false
        }
        return {
            name: sample,
            frequency: fq,
            path: path.join(samplesRelativetoSrc, samplePack, sample)
        };
    });
    if (samplesList.length === 0) {
        return false;
    }
    return {
        name: samplePack,
        samples: samplesList,
        readme: readmesList.join('\n'),
    };
});

writeFile(
    path.join(scriptDir, './src', '_autogenerated_samples.ts'),
    "export default " + JSON.stringify(samplePacksList, null, 2)
);