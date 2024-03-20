// @ts-check
const fs = require('fs');
const path = require('path');

const listOfSourceFiles = fs.readdirSync(path.join(__dirname, 'source'));
const listOfNotesInAmericanKey = [
    'C','C#',
    'D','D#',
    'E',
    'F','F#',
    'G','G#',
    'A','A#',
    'B',
];
/**
 * @param {string} nomenclatureNote
 */
const americanNomenclatureToFrequency = (nomenclatureNote) => {
    const [note, octaveStr] = nomenclatureNote.toUpperCase();
    const octave = parseInt(octaveStr);
    const noteIndex = listOfNotesInAmericanKey.indexOf(note);
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

/**
 * @param {string} filename
 */
const renameFunction = (filename) => {
    const velocity = 127 * parseInt([...filename.match(/_v(\d)/i)||[]][1]) / 5;
    const americanNote = (filename.match(/_([A-G]\d)/i) || [])[1];
    if(!americanNote) {
        console.error(`Invalid note for ${filename}`);
        return;
    } 
    if(isNaN(velocity)) {
        console.error(`Invalid velocity for ${filename}`);
        return;
    }
    const frequency = americanNomenclatureToFrequency(americanNote);
    if(!frequency) {
        console.error(`Invalid frequency for ${filename}`);
        return;
    }
    console.log({
        velocity,
        pp:americanNote,
        frequency,
    });

    const newName = `${velocity.toFixed(0)}_${frequency.toFixed(5)}.wav`;
    return [
        path.join(__dirname, 'source', filename),
        path.join(__dirname, newName),
    ];
}

const moves = listOfSourceFiles.map(renameFunction);
console.log(moves);
moves.forEach((sd) => {
    if(!sd) return;
    const [source, destination] = sd;
    fs.copyFileSync(source, destination);
});