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
const audioExtensionPattern = /.(wav|aiff)$/;
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
            const nameWithoutExtension = fileName.replace(audioExtensionPattern, '');

            if (!fileName.match(audioExtensionPattern)) {
                if (fileName === "readme.txt") {
                    const library = getLibrary(dirItem.path);
                    const readmePath = path.join(dirItem.path, fileName);
                    const readme = fs.readFileSync(path.join(publichPath, readmePath), 'utf8');
                    library.readme = readme;
                } else {
                    console.log("ignoring", fileName);
                }
                continue;
            }
            try {
                let parsed = parser(nameWithoutExtension);

                if (!parsed.libraryName) {
                    parsed.libraryName = dirItem.path;
                }

                if (!parsed.frequency) {
                    if ('cdeNote' in parsed) {
                        parsed.frequency = cdeNoteToFrequency(parsed.cdeNote);
                    } else {
                        console.error(`No frequency or cdeNote for ${fileName}`);
                        continue;
                    }
                }

                parsed.path = remoteBaseUrl + '/' + path.join(dirItem.path, fileName);

                const library = getLibrary(parsed.libraryName);
                library.samples.push(parsed);
            } catch (e) {
                console.error(`Error parsing ${fileName} as ${nameWithoutExtension}: ${e.message}`);
            }
        }
    }
    return libraries;
}

module.exports = generateSamplesList;