const listOfNoteNames = [
    'C','CSharp',
    'D','DSharp',
    'E',
    'F','FSharp',
    'G','GSharp',
    'A','ASharp',
    'B',
];
/**
 * Converts notes like C4, D#5, etc. to frequencies.
 * @param {string} note
 */
const cdeNoteToFrequency = (nomenclatureNote) => {
    const note = nomenclatureNote.slice(0, -1);
    const octaveStr = nomenclatureNote.slice(-1);
    const octave = parseInt(octaveStr);
    const noteIndex = listOfNoteNames.indexOf(note);
    if(noteIndex === -1) {
        console.error(`Invalid note ${nomenclatureNote}`);
        return;
    }
    if(isNaN(octave)) {
        console.error(`Invalid octave ${nomenclatureNote}`);
        return;
    }
    const frequency = 55 * Math.pow(2, (noteIndex - 9 + (octave * 12)) / 12);
    return frequency;
}

module.exports = cdeNoteToFrequency;