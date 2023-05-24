export const baseFrequency = 13.75;
export const base12TETNote = 0;

export const octaveToFrequency = (octave: number) => baseFrequency * Math.pow(2, octave);
export const frequencyToOctave = (frequency: number) => Math.log2(frequency / baseFrequency);

/** written by ai. untested: */
export const midiNoteToFrequency = (note: number, cents = 0) => {
    return octaveToFrequency((note - base12TETNote + cents / 100) / 12);
}
/** 
 * written by ai. untested
 * provides midi note + cents for a frequency
 * */
export const frequencyToMidiNote = (frequency: number): { note: number, cents: number } => {
    const octave = frequencyToOctave(frequency);
    const note = Math.round(octave * 12 + base12TETNote);
    const cents = Math.round((octave * 12 + base12TETNote - note) * 100);
    return { note, cents };
}
/**
 * provides a midi note in continuous value based on frequency
 */
export const frequencyToNote12 = (frequency: number): number => {
    const octave = frequencyToOctave(frequency);
    const note = octave * 12 + base12TETNote;
    return note;
}


