// @ts-check
const fs = require("fs");
const path = require("path");
const parserFactory = require("./parserFactory.cjs");
const cdeNoteToFrequency = require("./cdeNoteToFrequency.cjs");

const preventUndefined = (...values) => {
    for (let value of values) {
        if (value === undefined) throw new Error("undefined value");
    }
}

/**
 * @typedef {Object} DirItem
 * @property {string} path
 * @property {string} pattern
 * @property {string} maps
 * @property {string} [kitName]
 * @property {'impulse-response' | 'chromatic'} type
 */
const audioExtensionPattern = /.(wav|aiff)$/;
/**
 * @param {DirItem[]} dirsList
 * @param {string} remoteBaseUrl
 * @param {string} kitName
 */
const generateSamplesList = (dirsList, localPublicPath, remoteBaseUrl, kitName) => {
    const chromaticKits = [];
    const impulseResponseKits = [];
    /**
     * @param {string} kitName
     * @param {'chromatic' | 'impulse-response'} kitType
     * @returns {Object}
     */
    const getKit = (kitName, libraryName, kitType) => {
        const kitList = kitType === 'chromatic' ? chromaticKits : impulseResponseKits;
        let library = kitList.find(lib => lib.name === kitName);
        if (!library) {
            library = {
                name: kitName,
                fromLibrary: libraryName,
                type: kitType,
                samples: [],
            };
            kitList.push(library);
        }
        return library;
    }

    for (let i = 0; i < dirsList.length; i++) {
        const dirItem = dirsList[i];
        const files = fs.readdirSync(path.join(localPublicPath, dirItem.path));
        const parser = parserFactory({
            pattern: dirItem.pattern,
            maps: dirItem.maps
        });
        const sampleKitType = dirItem.type;
        const kitList = sampleKitType === 'chromatic' ? chromaticKits : impulseResponseKits;

        for (let j = 0; j < files.length; j++) {
            const fileName = files[j];
            const nameWithoutExtension = fileName.replace(audioExtensionPattern, '');

            if (!fileName.match(audioExtensionPattern)) {
                if (fileName === "readme.txt") {
                    // This solution to associate readme files to a kit is suboptimal
                    // because the success depends on the order of the files in the directory
                    // (as long as kitName is not defined as part of the kit naming)
                    // consider - making kitName mandatory or appending readmes afterwards
                    const library = getKit(dirItem.kitName || dirItem.path, dirItem.path, sampleKitType);
                    const readmePath = path.join(dirItem.path, fileName);
                    const readme = fs.readFileSync(path.join(localPublicPath, readmePath), 'utf8');
                    library.readme = readme;
                } else {
                    console.log("ignoring", fileName);
                }
                continue;
            }
            try {
                let parsed = parser(nameWithoutExtension);
                if (parsed === null) {
                    console.error(`Could not parse ${nameWithoutExtension}`);
                    continue;
                }
                if (!parsed.kitName) {
                    parsed.kitName = dirItem.kitName || dirItem.path;
                }

                if (parsed.frequency && typeof parsed.frequency === 'string') {
                    parsed.frequency = parseFloat(parsed.frequency);
                }
                if (parsed.velocity && typeof parsed.velocity === 'string') {
                    parsed.velocity = parseFloat(parsed.velocity);
                }

                if (!parsed.frequency) {
                    if ('cdeNote' in parsed) {
                        parsed.frequency = cdeNoteToFrequency(parsed.cdeNote);
                    } else {
                        if (sampleKitType === 'chromatic') {
                            console.error(`No frequency or cdeNote for ${fileName}`);
                            continue;
                        }
                    }
                }

                parsed.path = remoteBaseUrl + '/' + path.join(dirItem.path, fileName);

                if (!parsed.name) parsed.name = fileName;

                const library = getKit(parsed.kitName, dirItem.path, sampleKitType);
                library.samples.push(parsed);
            } catch (e) {
                console.error(`Error parsing ${fileName} as ${nameWithoutExtension}: ${e.message}`);
            }
        }
    }

    chromaticKits.forEach((kit) => {
        const velocities_set = new Set();
        const frequencies_set = new Set();

        for (let sample of kit.samples) {
            velocities_set.add(sample.velocity);
            frequencies_set.add(sample.frequency);
        }

        const velocities = Array.from(velocities_set).sort((a, b) => a - b);
        const frequencies = Array.from(frequencies_set).sort((a, b) => a - b);

        // Determine de velocity division values, they go in between each available velocity level
        let iVelocity = 0;
        let velocityRanges = [0];
        for (let velocity of velocities) {
            if (!velocity) continue;
            velocityRanges.push(Math.floor((iVelocity + velocity) / 2));
            iVelocity = velocity;
        }
        velocityRanges.push(127);
        console.log({ velocities });
        console.log({ velocityRanges });

        // Determine the frequency division values, they go in between each available frequency level
        let iFrequency = 0;
        let frequencyRanges = [0];
        for (let frequency of frequencies) {
            frequencyRanges.push((iFrequency + frequency) / 2);
            iFrequency = frequency;
        }
        frequencyRanges.push(Infinity);

        // Now we can build the sample list
        let samples = [];
        for (let iSample in kit.samples) {
            let sample = kit.samples[iSample];
            let velocity = sample.velocity;
            let frequency = sample.frequency;
            let velocityIndex = velocityRanges.findIndex((value) => value >= velocity);
            let frequencyIndex = frequencyRanges.findIndex((value) => value >= frequency);
            let velocityStart = velocityRanges[velocityIndex - 1] || 0;
            let velocityEnd = velocityRanges[velocityIndex] || 127;
            let frequencyStart = frequencyRanges[frequencyIndex - 1];
            let frequencyEnd = frequencyRanges[frequencyIndex];


            try {
                if (frequencyEnd <= frequencyStart) {
                    throw new Error("frequencyEnd <= frequencyStart");
                }
                preventUndefined(velocityStart, velocityEnd, frequencyStart, frequencyEnd);

                let sampleDefinition = {
                    ...sample,
                    velocityStart, velocityEnd,
                    frequencyStart, frequencyEnd,
                };
                samples.push(sampleDefinition);

            } catch (e) {
                console.error(`Error parsing ${sample.name}: ${e.message}`);
            }
        }

        const sampleIdes = samples.map(({ path }) => path).sort();
        const sampleIdsSet = new Set(sampleIdes);

        if (sampleIdes.length !== sampleIdsSet.size) {
            throw new Error("Duplicate sample declarations");
        }

        kit.samples = samples;

    });
    return [...chromaticKits,...impulseResponseKits];
}

module.exports = generateSamplesList;