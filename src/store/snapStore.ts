import { defineStore } from 'pinia'
import { Tool } from '../dataTypes/Tool.js';
import Fraction from 'fraction.js';
import { EditNote } from '../dataTypes/EditNote.js';
import { ref } from 'vue';
import colundi from '../scales/colundi.js';
import { frequencyToOctave, octaveToFrequency } from '../functions/toneConverters.js';
const fundamental = octaveToFrequency(0);
console.log("fundamental", fundamental);

export type SnapExplanation = {
    text: string;
    relatedNote?: EditNote;
    relatedNumber?: number;
};

class SnapTracker {
    /** the smallest distance to a snap value found thus far */
    closestSnappedDistance: number | null = null;
    /** the resulting value corresponding to the closest snap */
    closestSnappedValue: number | null = null;
    /** the target value, if no snap were to be applied */
    rawValue: number;
    /** 
     * keeps track of relations between relatedSnapObjects and a value, so that 
     * when a snap succeeds, it can also provide all the other objects that provide
     * the same snap
     */
    snapValueToObjectMap = new Map<number, SnapExplanation[]>();

    /** instert a new snapped value to contend as teh closest snap point */
    addSnappedValue(snappedValue: number, relatedSnapObject?: SnapExplanation) {
        if (this.rawValue === null) {
            throw new Error("rawValue is null");
        }
        const snapDistance = Math.abs(snappedValue - this.rawValue);
        if (this.closestSnappedDistance === null || snapDistance < this.closestSnappedDistance) {
            this.closestSnappedValue = snappedValue;
            this.closestSnappedDistance = snapDistance;
        }
        if (relatedSnapObject !== undefined) {
            const existing = this.snapValueToObjectMap.get(snappedValue);
            if (existing === undefined) {
                this.snapValueToObjectMap.set(snappedValue, [relatedSnapObject]);
            } else {
                existing.push(relatedSnapObject);
            }
        }
    }

    getSnapObjectsOfSnappedValue() {
        if (this.closestSnappedValue === null) {
            return [];
        }
        const ret = this.snapValueToObjectMap.get(this.closestSnappedValue);
        if (ret === undefined) {
            return [];
        }
        return ret;
    }

    getResult(): number {
        if (this.closestSnappedValue === null) {
            return this.rawValue;
        }
        return this.closestSnappedValue;
    }

    constructor(rawValue: number) {
        this.rawValue = rawValue;
    }
}

export enum SnapType {
    Time,
    Tone,
    ToneRelation,
}

interface SnapDefinition {
    description: string,
    icon: string,
    type: SnapType,
    active: boolean,
}
/*


        if (snapValues.equal1.active === true) {
            toneSnap.addSnappedValue(Math.round(targetOctave));
        }
        if (snapValues.equal10.active === true) {
            EDOSsnap(10, targetOctave, toneSnap);
        }
        if (snapValues.equal12.active === true) {
            EDOSsnap(12, targetOctave, toneSnap);
        }
        if (snapValues.equal19.active === true) {
            EDOSsnap(19, targetOctave, toneSnap);
        }
        if (snapValues.equal22.active === true) {
            EDOSsnap(22, targetOctave, toneSnap);
        }
        if (snapValues.equal24.active === true) {
            EDOSsnap(24, targetOctave, toneSnap);
        }
        if (snapValues.equal31.active === true) {
            EDOSsnap(31, targetOctave, toneSnap);
        }
        
*/
const snaps: { [key: string]: SnapDefinition } = {
    customFrequencyTable: {
        description: "Snap to custom frequency table",
        icon: "Custom",
        type: SnapType.Tone,
        active: false,
    },
    equal1: {
        description: "Octaves only",
        icon: "1EDO",
        type: SnapType.Tone,
        active: true,
    },
    equal10: {
        description: "Equal temperament, 10 tones. Tone is divided equally into 12 tones per octave",
        icon: "10EDO",
        type: SnapType.Tone,
        active: false,
    },
    equal12: {
        description: "Equal temperament, 12 tones. Tone is divided equally into 12 tones per octave",
        icon: "12EDO",
        type: SnapType.Tone,
        active: false,
    },
    equal19: {
        description: "Equal temperament, 19 tones. Tone is divided equally into 12 tones per octave",
        icon: "19EDO",
        type: SnapType.Tone,
        active: false,
    },
    equal22: {
        description: "Equal temperament, 22 tones. Tone is divided equally into 12 tones per octave",
        icon: "22EDO",
        type: SnapType.Tone,
        active: false,
    },
    equal24: {
        description: "Equal temperament, 24 tones. Tone is divided equally into 12 tones per octave",
        icon: "24EDO",
        type: SnapType.Tone,
        active: false,
    },
    equal31: {
        description: "Equal temperament, 31 tones. Tone is divided equally into 12 tones per octave",
        icon: "31EDO",
        type: SnapType.Tone,
        active: false,
    },
    equal48: {
        description: "Equal temperament, 48 tones. Tone is divided equally into 12 tones per octave",
        icon: "48EDO",
        type: SnapType.Tone,
        active: false,
    },
    hzEven: {
        description: "frequencies which are multiple of 2",
        icon: "2\u00d7",
        type: SnapType.Tone,
        active: false,
    },
    hzFundamentalMultiple: {
        description: "frequencies which are multiple of the fundamental frequency.",
        icon: "FF\u00d7",
        type: SnapType.Tone,
        active: false,
    },
    hzMult: {
        description: "frequencies which are multiple of one another",
        icon: "a\u00d7b",
        type: SnapType.ToneRelation,
        active: false,
    },
    hzRelationFraction: {
        description: "The frequency of the note is a simple fraction of the frequency of another note.",
        icon: "HZ a/b",
        type: SnapType.ToneRelation,
        active: false,
    },
    hzHalfOrDouble: {
        description: "The frequency of the note is a half or double the other",
        icon: "HZ 2x",
        type: SnapType.ToneRelation,
        active: false,
    },
    hzThird: {
        description: "The frequency of the note is a third or three times the other",
        icon: "HZ 3x",
        type: SnapType.ToneRelation,
        active: false,
    },
    hzFifth: {
        description: "The frequency of the note is a fifth or five times the other",
        icon: "HZ 5x",
        type: SnapType.ToneRelation,
        active: false,
    },
    hzSeventh: {
        description: "The frequency of the note is a seventh or seven times the other",
        icon: "HZ 7x",
        type: SnapType.ToneRelation,
        active: false,
    },
    timeInteger: {
        description: "Times that are multiple of 1 time unit",
        icon: "1\u00d7",
        type: SnapType.Time,
        active: false,
    },
    timeQuarter: {
        description: "Times which are multiples of 1/4 of a time unit.",
        icon: "1/4\u00d7",
        type: SnapType.Time,
        active: true,
    },
    sameStart: {
        description: "Start positions equal to the start positions of other notes.",
        icon: "=",
        type: SnapType.Time,
        active: false,
    },
    timeIntegerRelationFraction: {
        description: "The time of the note is a simple fraction of the time of another note.",
        icon: "T a/b",
        type: SnapType.Time,
        active: false,
    }
};

// TODO: bug when resizing; it snaps tone. Why is it even spending 
// time on tone snapping when resizing!?
export const useSnapStore = defineStore("snap", () => {
    const simplify = ref<number>(0.1);
    const values = ref(snaps);
    const focusedNote = ref(null as EditNote | null);
    const timeSnapExplanation = ref([] as SnapExplanation[]);
    const toneSnapExplanation = ref([] as SnapExplanation[]);
    const customOctavesTable = ref(colundi as number[]);
    const onlyWithMutednotes = ref(false);

    /** sets a simple focusedNote flag for display purposes */
    const setFocusedNote = (to: EditNote) => {
        resetSnapExplanation();
        focusedNote.value = to;
    };
    const resetSnapExplanation = () => {
        timeSnapExplanation.value = [];
        toneSnapExplanation.value = [];
    };
    interface OctaveSnapParams {
        targetOctave: number,
        otherNotes: EditNote[] | undefined,
        targetHz: number,
        snapValues: { [key: string]: SnapDefinition },
    }

    const EDOSsnap = (edo:number, targetOctave:number, toneSnap: SnapTracker)=>{
        const relatedNumber = Math.round(targetOctave * edo) / edo;
        toneSnap.addSnappedValue(relatedNumber, {
            text: "equal"+edo,
            relatedNumber,
        });
    }

    const onlyMutedIfWanted = (otherNotes: EditNote[] | undefined) => {
        if(otherNotes === undefined) return;
        if(!onlyWithMutednotes.value) return otherNotes;
        return otherNotes.filter((editNote) => editNote.mute);
    } 


    const octaveSnaps = ({
        targetOctave,
        otherNotes,
        targetHz,
        snapValues,
    }: OctaveSnapParams) => {
        otherNotes = onlyMutedIfWanted(otherNotes);
        const toneSnap = new SnapTracker(targetOctave);

        if (snapValues.customFrequencyTable.active === true) {
            if (customOctavesTable.value.length > 0) {
                // find the closest frequency in the table
                const closestOctave = customOctavesTable.value.reduce((prev, curr) => {
                    return (Math.abs(curr - targetOctave) < Math.abs(prev - targetOctave) ? curr : prev);
                });
                toneSnap.addSnappedValue(closestOctave, {
                    text: "custom frequency table",
                    relatedNumber: closestOctave,
                });
            }
        }

        if (snapValues.hzEven.active === true) {
            const relatedNumber = Math.round(targetHz / 2) * 2;
            toneSnap.addSnappedValue(frequencyToOctave(relatedNumber), {
                text: "hzEven",
                relatedNumber,
            });
        };



        if (snapValues.hzFundamentalMultiple.active === true) {
            const relatedNumber = fundamental;
            const frequencyValue = Math.round(targetHz / fundamental) * fundamental;
            toneSnap.addSnappedValue(frequencyToOctave(frequencyValue), {
                text: "hzFundamentalMultiple",
                relatedNumber,
            });
        }
        if (snapValues.equal1.active === true) {
            toneSnap.addSnappedValue(Math.round(targetOctave));
        }
        if (snapValues.equal10.active === true) {
            EDOSsnap(10, targetOctave, toneSnap);
        }
        if (snapValues.equal12.active === true) {
            EDOSsnap(12, targetOctave, toneSnap);
        }
        if (snapValues.equal19.active === true) {
            EDOSsnap(19, targetOctave, toneSnap);
        }
        if (snapValues.equal22.active === true) {
            EDOSsnap(22, targetOctave, toneSnap);
        }
        if (snapValues.equal24.active === true) {
            EDOSsnap(24, targetOctave, toneSnap);
        }
        if (snapValues.equal31.active === true) {
            EDOSsnap(31, targetOctave, toneSnap);
        }
        if (snapValues.equal48.active === true) {
            EDOSsnap(48, targetOctave, toneSnap);
        }
        
        

        /** 
         * target / other = other * 1 / target
         * mycandidate = other
         **/
        // Relational  HZ snaps
        if (otherNotes) {
            if (snapValues.hzRelationFraction.active === true) {
                for (const otherNote of otherNotes) {
                    const otherHz = otherNote.frequency;
                    const fraction = new Fraction(targetHz).div(otherHz).simplify(simplify.value);
                    const closeHzRatio = fraction.valueOf();
                    // reintegrate rounded proportion back to the other's hz value
                    const myCandidateHz = closeHzRatio * otherHz;
                    const myCandidateOctave = frequencyToOctave(myCandidateHz);
                    toneSnap.addSnappedValue(myCandidateOctave, {
                        text: `hz fraction ${fraction.toString()}`,
                        relatedNote: otherNote,
                    });
                }
            } else {
                // It is presumed that fraction includes all these possibilites

                if (snapValues.hzMult.active === true) {
                    for (const otherNote of otherNotes) {
                        const relatedNumber = Math.round(targetHz / otherNote.frequency) * otherNote.frequency;
                        if(relatedNumber > 0) {
                            toneSnap.addSnappedValue(frequencyToOctave(relatedNumber), {
                                text: "multiple of "+otherNote.frequency.toPrecision(3),
                                relatedNumber,
                                relatedNote: otherNote,
                            });
                        }
                    }
                };
                
                if (snapValues.hzHalfOrDouble.active === true) {
                    for (const otherNote of otherNotes) {
                        const myCandidateHzDouble = otherNote.frequency * 2
                        const myCandidateOctaveDouble = frequencyToOctave(myCandidateHzDouble);
                        const myCandidateHzHalf = otherNote.frequency / 2
                        const myCandidateOctaveHalf = frequencyToOctave(myCandidateHzHalf);
                        const myCandidateEqual = otherNote.frequency;
                        const myCandidateEqualOctave = frequencyToOctave(myCandidateEqual);

                        toneSnap.addSnappedValue(myCandidateOctaveDouble, {
                            text: `double the frequency`,
                            relatedNote: otherNote,
                        });
                        toneSnap.addSnappedValue(myCandidateOctaveHalf, {
                            text: `half the frequency`,
                            relatedNote: otherNote,
                        });
                        toneSnap.addSnappedValue(myCandidateEqualOctave, {
                            text: `same tone`,
                            relatedNote: otherNote,
                        });
                    }
                }
                if (snapValues.hzThird.active === true) {
                    for (const otherNote of otherNotes) {
                        const myCandidateHzDouble = otherNote.frequency * 3
                        const myCandidateOctaveDouble = frequencyToOctave(myCandidateHzDouble);
                        const myCandidateHzHalf = otherNote.frequency / 3
                        const myCandidateOctaveHalf = frequencyToOctave(myCandidateHzHalf);

                        toneSnap.addSnappedValue(myCandidateOctaveDouble, {
                            text: `3x the frequency`,
                            relatedNote: otherNote,
                        });
                        toneSnap.addSnappedValue(myCandidateOctaveHalf, {
                            text: `1/3 the frequency`,
                            relatedNote: otherNote,
                        });
                    }
                }
                if (snapValues.hzFifth.active === true) {
                    for (const otherNote of otherNotes) {
                        const myCandidateHzDouble = otherNote.frequency * 5
                        const myCandidateOctaveDouble = frequencyToOctave(myCandidateHzDouble);
                        const myCandidateHzHalf = otherNote.frequency / 5
                        const myCandidateOctaveHalf = frequencyToOctave(myCandidateHzHalf);

                        toneSnap.addSnappedValue(myCandidateOctaveDouble, {
                            text: `5x the frequency`,
                            relatedNote: otherNote,
                        });
                        toneSnap.addSnappedValue(myCandidateOctaveHalf, {
                            text: `1/5 the frequency`,
                            relatedNote: otherNote,
                        });
                    }
                }
                if (snapValues.hzSeventh.active === true) {
                    for (const otherNote of otherNotes) {
                        const myCandidateHzDouble = otherNote.frequency * 7
                        const myCandidateOctaveDouble = frequencyToOctave(myCandidateHzDouble);
                        const myCandidateHzHalf = otherNote.frequency / 7
                        const myCandidateOctaveHalf = frequencyToOctave(myCandidateHzHalf);

                        toneSnap.addSnappedValue(myCandidateOctaveDouble, {
                            text: `7x the frequency`,
                            relatedNote: otherNote,
                        });
                        toneSnap.addSnappedValue(myCandidateOctaveHalf, {
                            text: `1/7 the frequency`,
                            relatedNote: otherNote,
                        });
                    }
                }

            }
        }
        return { toneSnap };
    }
    interface TimeSnapParams {
        otherNotes: EditNote[] | undefined,
        editNote: EditNote,
        durationSnap: SnapTracker | false,
        snapValues: { [key: string]: SnapDefinition },
    }

    const timeSnaps = ({
        otherNotes,
        editNote,
        durationSnap,
        snapValues,
    }: TimeSnapParams) => {

        otherNotes = onlyMutedIfWanted(otherNotes);
        const timeSnap = new SnapTracker(editNote.time);
        if (snapValues.timeQuarter.active === true) {
            const relatedNumber = Math.round(editNote.time * 4);
            timeSnap.addSnappedValue(relatedNumber / 4, {
                text: "Quarter snap",
                relatedNumber,
            });
            if (durationSnap) {
                const relatedNumberd = Math.round(editNote.duration! * 4) / 4
                durationSnap.addSnappedValue(relatedNumberd, {
                    text: "Quarter snap",
                    relatedNumber: relatedNumberd,
                });
            }
        } else if (snapValues.timeInteger.active === true) {
            const relatedStart = Math.round(editNote.time);
            timeSnap.addSnappedValue(relatedStart, {
                text: "Integer snap",
                relatedNumber: relatedStart,
            });
            if (durationSnap) {
                const relatedDuration = Math.round(editNote.duration!);
                durationSnap.addSnappedValue(relatedDuration, {
                    text: "Integer snap",
                    relatedNumber: relatedDuration,
                });
            }
        }

        if (snapValues.sameStart.active === true) {
            if (otherNotes) {
                for (const otherNote of otherNotes) {
                    timeSnap.addSnappedValue(otherNote.time, {
                        text: "Same start",
                        relatedNote: otherNote,
                    });
                }
            }
        }

        if (snapValues.timeIntegerRelationFraction.active === true) {
            if (otherNotes) {
                for (const otherNote of otherNotes) {
                    const otherStart = otherNote.time;
                    const closestStartFraction = new Fraction(editNote.time).div(otherStart).simplify(simplify.value);
                    const closeStartRatio = closestStartFraction.valueOf();
                    // reintegrate rounded proportion back to the other's start value
                    const myCandidateStart = closeStartRatio * otherStart;
                    timeSnap.addSnappedValue(myCandidateStart, {
                        text: `time fraction ${closestStartFraction.toString()}`,
                        relatedNote: otherNote,
                    });
                }
            }
        }
        return { timeSnap };
    }

    /** has side effects to snap explanations */
    interface SnapParams {
        inNote: EditNote,
        targetOctave: number,
        otherNotes?: Array<EditNote>,
        sideEffects?: boolean,
        skipOctaveSnap?: boolean,
        skipTimeSnap?: boolean,
    }
    const snap = ({
        inNote,
        targetOctave,
        otherNotes,
        sideEffects = true,
        skipOctaveSnap = false,
        skipTimeSnap = false,
    }: SnapParams) => {
        otherNotes = onlyMutedIfWanted(otherNotes);
        /** outNote */
        const editNote = inNote.clone();
        const targetHz = octaveToFrequency(targetOctave);

        const durationSnap = editNote.duration ? new SnapTracker(editNote.duration) : false;

        const snapValues = values.value as { [key: string]: SnapDefinition };

        // Time snaps
        if (!skipTimeSnap) {

            const { timeSnap } = timeSnaps({
                otherNotes,
                editNote,
                durationSnap,
                snapValues
            });
            editNote.time = timeSnap.getResult();
            if (sideEffects) {
                timeSnapExplanation.value.push(...timeSnap.getSnapObjectsOfSnappedValue());
            }
        }
        // Tone snaps
        if (!skipOctaveSnap) {
            const { toneSnap } = octaveSnaps({
                otherNotes,
                targetOctave,
                targetHz,
                snapValues
            });
            editNote.octave = toneSnap.getResult();
            if (sideEffects) {
                toneSnapExplanation.value.push(...toneSnap.getSnapObjectsOfSnappedValue());
            }
        }


        if (durationSnap) editNote.duration = durationSnap.getResult();



        return editNote;

    }
    return {
        simplify,
        values,
        focusedNote,
        timeSnapExplanation,
        toneSnapExplanation,
        customOctavesTable,
        onlyWithMutednotes,
        setFocusedNote,
        resetSnapExplanation,
        snap,
    }

});