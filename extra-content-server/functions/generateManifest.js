const fs = require("fs");
const path = require("path");
const parserFactory = require("./parserFactory");
const cdeNoteToFrequency = require("./cdeNoteToFrequency");
const publichPath = 'public';
/**
 * @typedef {Object} DirItem
 * @property {string} path
 * @property {string} pattern
 * @property {string} maps
 */

/**
 * @param {DirItem[]} dirsList
 * @param {string} remoteBaseUrl
 */
const generateSamplesList = (dirsList, remoteBaseUrl) => {
    const libraries = [];
    const getLibrary = (libraryName) => {
        let library = libraries.find(lib => lib.name === libraryName);
        if (!library) {
            library = {
                name: libraryName,
                samples: [],
            };
            libraries.push(library);
        }
        return library;
    }

    for (let i = 0; i < dirsList.length; i++) {
        const dirItem = dirsList[i];
        const files = fs.readdirSync(path.join(publichPath, dirItem.path));
        const parser = parserFactory({
            pattern: dirItem.pattern,
            maps: dirItem.maps
        });
        for (let j = 0; j < files.length; j++) {
            const fileName = files[j];
            let parsed = parser(fileName);

            if (!parsed.libraryName) {
                console.error(`No libraryName for ${fileName}`);
                continue;
            }

            if (!parsed.frequency){
                if('cdeNote' in parsed){
                    parsed.frequency = cdeNoteToFrequency(parsed.cdeNote);
                } else {
                    console.error(`No frequency or cdeNote for ${fileName}`);
                    continue;
                }
            }

            parsed.path = remoteBaseUrl+'/'+path.join(dirItem.path, fileName);

            const library = getLibrary(parsed.libraryName);
            library.samples.push(parsed);
        }
    }
    return libraries;
}

module.exports = generateSamplesList;