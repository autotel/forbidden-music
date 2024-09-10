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
 * @property {number} frequencyStart
 * @property {number} frequencyEnd
 * @property {number} velocityStart
 * @property {number} velocityEnd
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
 * @typedef {NoteSamplePackDefinition & {type:'chromatic'}} GranularSamplerPackDefinition
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
const samplePackIsAtonal = samplesDir => fileListIncludes(samplesDir, "_type-atonal");
const samplePackIsChromatic = samplesDir => fileListIncludes(samplesDir, "_type-chromatic");
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


    const samplesIncomplete = filterMap(samplesList, sample => {
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
        
        return returnValue;

    }).sort((a, b) => a.frequency - b.frequency);

    /**
     * @type {SampleDefinition | false}
     */
    let prevSample = false;
    /**
     * @type {SampleDefinition[]}
     */
    const samples = samplesIncomplete.map((item, index, arr) => {
        const nextSample = arr[index + 1];

        let frequencyStart = 0;
        let frequencyEnd = Infinity;

        if (prevSample && prevSample.frequencyEnd) {
            frequencyStart = prevSample.frequencyEnd;
        }
        if (item.frequency && nextSample && nextSample.frequency) {
            frequencyEnd = (item.frequency + nextSample.frequency) / 2;
        }

        let velocityStart = 0;
        let velocityEnd = Infinity;

        if (prevSample && prevSample.velocityEnd) {
            velocityStart = prevSample.velocityEnd;
        }
        if (item.velocity && nextSample && nextSample.velocity) {
            velocityEnd = (item.velocity + nextSample.velocity) / 2;
        }

        prevSample =  {
            ...item,
            frequencyStart, frequencyEnd,
            velocityStart, velocityEnd,
        }

        return prevSample;
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
        impulseResponsesList.push(...processImpulseResponsePack(samplePack, files));
    }
    if (samplePackIsAtonal(files)) {
        oneShotsList.push({
            type: 'one shot',
            ...processNoteSamplePack(samplePack, files),
        });
    }
    if (samplePackIsChromatic(files)) {
        granularList.push({
            type: 'chromatic',
            ...processNoteSamplePack(samplePack, files),
        });
    }

});

function censor(key, value) {
    if (value === Infinity) {
        return "Infinity";
    } else {
        return value;
    }
}

const stringifier = (samplesList) => {
    return "export default " + JSON.stringify(samplesList, censor, 2).replace(/\"Infinity\"/g,"Infinity");
}

writeFile(
    path.join(scriptDir, './src', '_autogenerated_samples.ts'),
    stringifier([...oneShotsList, ...granularList])
);
writeFile(
    path.join(scriptDir, './src', '_autogenerated_impulse_responses.ts'),
    stringifier(impulseResponsesList)
);