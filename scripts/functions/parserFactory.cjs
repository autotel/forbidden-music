/**
 * @typedef {Object} ParserConfig
 * @property {string} pattern
 * @property {string} maps
*/

/**
 * @param {ParserConfig} config
 */
const parserFactory = (config) => {
    const regExp = new RegExp(config.pattern);
    const keyNames = config.maps.split(/\s+/);
    /**
     * @param {string} input
     * @returns {Object | null}
     */
    return (input) => {
        const matches = input.match(regExp);
        if(matches === null) {
            return null;
        }
        const result = {};
        // console.log(config.pattern, matches);
        for(let i = 0; i < keyNames.length; i++) {
            result[keyNames[i]] = matches[i + 1];
        }
        return result;
    }
}


module.exports = parserFactory;