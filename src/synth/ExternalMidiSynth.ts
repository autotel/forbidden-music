import { frequencyToMidiNote } from '../functions/toneConverters';
import { ParamType, SynthInstance, SynthParam, SynthParamsSetter } from './SynthInterface';


const getMidiOutputsArray = (midiAccess: MIDIAccess) => {
    const outputs = [] as MIDIOutput[];
    midiAccess.outputs.forEach((output) => {
        outputs.push(output);
    });
    return outputs;
}

const pitchBendRangeOctaves = 1 / 6;

type MidiChannel = (0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15);
type HeldChannel = {
    channel: MidiChannel;
    note: number;
    identifier: any;
}
export class ExternalMidiSynth implements SynthInstance {
    constructor(audioContext: AudioContext) {


    }
    name = "External midi Synth";
    midiOutputs: MIDIOutput[] = [];
    selectedMidiOutputIndex = 0;

    usedChannels = [
        false, false, false, false,
        false, false, false, false,
        false, false, false, false,
        false, false, false, false,
    ] as (false | number)[];

    lastUsedChannel = 0;

    getChannelAssignation = (note: number) => {
        for (let i = 0; i < this.usedChannels.length; i++) {
            if (this.usedChannels[i] === false) {
                this.usedChannels[i] = note;
                this.lastUsedChannel = i;
                return i as MidiChannel;
            }
        }
        this.lastUsedChannel = (this.lastUsedChannel + 1) % 16;
        this.usedChannels[this.lastUsedChannel] = note;
        return this.lastUsedChannel as MidiChannel;
    }

    getNoteforChannel = (channel: MidiChannel) => this.usedChannels[channel];

    sendTestChord = () => {
        const midiOutput = this.midiOutputs[this.selectedMidiOutputIndex];
        if (!midiOutput) return console.log("no output");
        for (let i = 0; i < 3; i++) {
            const noteOnMessage = [0x90, 48 + i * 12, 0x7f];    // note on, middle C, full velocity
            const noteOffMessage = [0x80, 48 + i * 12, 0x40];  // note off, middle C, 50 velocity
            const itime = i * 100;
            midiOutput.send(noteOnMessage, window.performance.now() + itime);
            midiOutput.send(noteOffMessage, window.performance.now() + itime + 500);
        }
    }

    triggerAttackRelease = (frequency: number, duration: number, relativeNoteStart: number, velocity: number) => {
        const midiOutput = this.midiOutputs[this.selectedMidiOutputIndex];
        // if note end is in the past, return and warn
        if(relativeNoteStart + duration < 0) return console.warn("note end is in the past");

        if (!midiOutput) return;
        const { note, cents } = frequencyToMidiNote(frequency);
        const channel = this.getChannelAssignation(note)
        console.log("triggering note",{ note, cents, channel});
        let channelNibble = channel & 0x0F;
        const midiVelocity = Math.floor(velocity * 127);
        const noteOnMessage = [0x90 | channelNibble, note, midiVelocity];
        const noteOffMessage = [0x80 | channelNibble, note, 0];
        // according to 
        // https://sites.uci.edu/camp2014/2014/04/30/managing-midi-pitchbend-messages/
        // pitch bend of 8192 means no pitch bend. Below that, it's negative pitch bend, and above, is positive.
        // I don't know for sure whether the result is accurate
        const midiPitchBendValue = Math.floor((cents / 100) * 8192 * pitchBendRangeOctaves + 8192);
        const pitchBendMessage = [0xe0 | channelNibble, midiPitchBendValue & 0x7f, (midiPitchBendValue >> 7) & 0x7f];
        midiOutput.send(pitchBendMessage);
        midiOutput.send(noteOnMessage, relativeNoteStart); //omitting the timestamp means send immediately.
        // potential problem: note off migth get send even if stopped all happened just before. 
        midiOutput.send(noteOffMessage, window.performance.now() + duration * 1000);
        setTimeout(() => {
            this.usedChannels[channel] = false;
        }, duration * 1000);
    };
    triggerPerc = (frequency: number, relativeNoteStart: number, velocity: number) => {
        this.triggerAttackRelease(frequency, 0.5, relativeNoteStart, velocity);
    };
    releaseAll = () => {
        this.usedChannels.forEach((note, channel) => {
            if (note === false) return;
            const midiOutput = this.midiOutputs[this.selectedMidiOutputIndex];
            if (!midiOutput) return;
            const channelNibble = channel & 0x0F;
            const noteOffMessage = [0x80 | channelNibble, note, 0];
            midiOutput.send(noteOffMessage);
            this.usedChannels[channel] = false;
        });
    };
    getParams = () => {
        console.log("getParams", this.midiOutputs.length);
        if (!this.midiOutputs.length) return [{
            type: ParamType.infoText,
            displayName: "off",
            getter: () => [
                "to activate, switch to a different instrument and then back",
            ].join("\n")

        }] as SynthParam[];

        return [{
            type: ParamType.option,
            getter: () => {
                return this.selectedMidiOutputIndex;
            },
            setter: (n: number) => {
                this.selectedMidiOutputIndex = n;
                this.sendTestChord();
            },
            displayName: "output",
            options: this.midiOutputs.map((output, i) => {
                return {
                    value: i,
                    displayName: output.name
                }
            }),
        }, {
            type: ParamType.infoText,
            displayName: "notes",
            getter: () => [
                "notes:",
                "1. this midi interface doesn't use MPE, but it sends each",
                "\t voice to a different channel, so that each can have their",
                "\t own pitch bend.",
                "\t If you buy me a synth with MPE I promise to implement it :P",
                "",
                "2. Set your synth's pitch bend range to +- 2 semitones,",
                "\t otherwise the tuning is not going to be accurate",
                "",
                "3. I'm not 100% sure of the accuracy of the tone yet.",
            ].join("\n")
        }] as SynthParam[];
    }
    set = (_p: SynthParamsSetter) => { }
    enable = () => {
        (async () => {
            const midiAccess = await navigator.requestMIDIAccess();
            this.midiOutputs = getMidiOutputsArray(midiAccess);
            this.sendTestChord();
        })();
    }
    disable = () => { };
}