// @ts-check
const readdir = require('fs').readdirSync;
const writeFile = require('fs').writeFileSync;
const readFileSync = require('fs').readFileSync;
const path = require('path');
const scriptDir = "./"

const samplesRelativetoSrc = 'audio';
const samplesDir = path.join(scriptDir, "/public", samplesRelativetoSrc);
const samplePacks = readdir(samplesDir);

/**
 * @typedef {Object} SampleDefinition
 * @property {string} name
 * @property {string} path
 * @property {number} frequency
 * @property {number} [velocity]
 * 
 */

/**
 * @typedef {Object} NoteSamplePackDefinition
 * @property {string} name
 * @property {boolean} exclusive
 * @property {boolean} onlyLocal
 * @property {string} readme
 * @property {SampleDefinition[]} samples
 * 
 */

/**
 * @typedef {Object} ImpulseResposeSampleDefinition
 * @property {string} name
 * @property {string} path
 * @property {string} collection
 * @property {string} readme
 * 
 */

/**
 * @typedef {NoteSamplePackDefinition & {type:'granular'}} GranularSamplerPackDefinition
 */
/**
 * @typedef {NoteSamplePackDefinition & {type:'one shot'}} OneShotSamplePackDefinition
 */

/**
 * make sure that the script is being called from one dir up
 */
if (!samplePacks) {
    throw new Error("run this script from the root of the project");
}

const fileListIncludes = (files, filename) => files.includes(filename);
/**  @param {string[]} samplesDir */
const samplePackIsImpulseResponse = samplesDir => fileListIncludes(samplesDir, "_type-impulse-response");
const samplePackIsOneShot = samplesDir => fileListIncludes(samplesDir, "_type-one-shot");
const samplePackIsGranular = samplesDir => fileListIncludes(samplesDir, "_type-granular");
const filenameIsReadme = filename => filename.match(/_?readme\.txt$/);
const filenameIsAudioSample = filename => filename.match(/.*\.(wav|aiff)$/);
/**
 * function that maps the array, but if the callback returns false, it will not be included in the result
 * @template V
 * @param {V[]} arr
 * @template R
 * @param {(item: V, index: number, array: V[]) => R | false} callback
 * @returns {R[]}
 */
const filterMap = (arr, callback) => {
    /**
     * @type {R[]}
     */
    const result = [];
    for (let i = 0; i < arr.length; i++) {
        const item = callback(arr[i], i, arr);
        if (item) {
            result.push(item);
        }
    }
    return result;
}

/**
 * @param {string} samplePack
 * @param {string[]} filesList
 * @returns {string[]}
 */
const getReadmes = (samplePack, filesList) => {
    return filterMap(filesList, sample => {
        if (!filenameIsReadme(sample)) {
            return false;
        }
        const contents = readFileSync(path.join(samplesDir, samplePack, sample), 'utf8');
        return contents;
    });
}

/**
 * @param {string} samplePack
 * @param {string[]} samplesList
 * @returns {ImpulseResposeSampleDefinition[]}
 */
const processImpulseResponsePack = (samplePack, samplesList) => {
    const readmesList = getReadmes(samplePack, samplesList);
    return filterMap(samplesList, sample => {
        console.log("isAudio?", sample, filenameIsAudioSample(sample))
        if (!filenameIsAudioSample(sample)) {
            return false;
        }
        const name = sample.replace(/\.(wav)$/, '');
        return {
            name,
            path: path.join(samplesRelativetoSrc, samplePack, sample),
            collection: samplePack,
            readme: readmesList.join('\n')
        }
    })
}
/**
 * @param {string} samplePack
 * @param {string[]} samplesList
 * @returns {NoteSamplePackDefinition}
 */
const processNoteSamplePack = (samplePack, samplesList) => {
    const readmes = getReadmes(samplePack, samplesList);
    const exclusive = samplesList.includes("_exclusive")
    const onlyLocal = samplesList.includes("_only_local")
    /**
     * @type {SampleDefinition[]}
     */
    const samples = filterMap(samplesList, sample => {
        if (!filenameIsAudioSample(sample)) {
            return false;
        }

        const baseName = sample.replace(/\.(wav)$/, '');
        const parts = baseName.split(/[\_]/);
        const frequency = parts.pop();
        const velocity = parts.pop();
        if (frequency === undefined) {
            console.warn("no frequency for", sample)
            return false;
        }
        const fq = parseFloat(frequency);

        if (isNaN(fq)) {
            return false
        }

        const returnValue = {
            name: sample,
            frequency: fq,
            path: path.join(samplesRelativetoSrc, samplePack, sample)
        };


        /** @type {boolean | number} */
        let vel = false;
        if (velocity) {
            vel = parseInt(velocity);
            if (isNaN(vel)) {
                vel = false;
            }
            returnValue.velocity = (vel || 0) / 127;
        }
        console.log("sample", samplePack, sample, { fq, vel });

        return returnValue;

    });

    return {
        name: samplePack,
        exclusive,
        onlyLocal,
        samples,
        readme: readmes.join('\n'),
    };
}

let impulseResponsesList = [];
/** @type {OneShotSamplePackDefinition[]}  */
let oneShotsList = [];
/** @type {GranularSamplerPackDefinition[]}  */
let granularList = [];

samplePacks.forEach(samplePack => {
    const files = readdir(path.join(samplesDir, samplePack));
    if (samplePackIsImpulseResponse(files)) {
        impulseResponsesList = processImpulseResponsePack(samplePack, files);
    }
    if (samplePackIsOneShot(files)) {
        oneShotsList.push({
            type: 'one shot',
            ...processNoteSamplePack(samplePack, files),
        });
    }
    if (samplePackIsGranular(files)) {
        granularList.push({
            type: 'granular',
            ...processNoteSamplePack(samplePack, files),
        });
    }

});


writeFile(
    path.join(scriptDir, './src', '_autogenerated_samples.ts'),
    "export default " + JSON.stringify([...oneShotsList, ...granularList], null, 2)
);
writeFile(
    path.join(scriptDir, './src', '_autogenerated_impulse_responses.ts'),
    "export default " + JSON.stringify(impulseResponsesList, null, 2)
);