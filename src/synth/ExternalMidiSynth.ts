import { frequencyToMidiNote } from '../functions/toneConverters';
import { AudioModule } from './interfaces/AudioModule';
import { SynthChainStepType } from './interfaces/SynthChainStep';
import { ParamType, SynthParam } from './interfaces/SynthParam';
import { EventParamsBase, SynthVoice } from './super/Synth';


//@ts-ignore
const getMidiOutputsArray = (midiAccess: MIDIAccess) => {
    //@ts-ignore
    const outputs = [] as MIDIOutput[];
    //@ts-ignore
    midiAccess.outputs.forEach((output: MIDIOutput) => {
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

const createVoice = (synth: ExternalMidiSynth): SynthVoice => {
    let triggerChannel = 0;
    let noteOffMessage: number[] = [];
    const midiOutput = synth.midiOutputs[synth.selectedMidiOutputIndex];
    if (!midiOutput) throw new Error("no midi output");
    
    const ret = {
        inUse: false,
        scheduleStart(frequency: number, absoluteStartTime: number, noteParameters: EventParamsBase) {
            const { velocity } = noteParameters;
            const relativeNoteStart = absoluteStartTime - window.performance.now();
            const { note, cents } = frequencyToMidiNote(frequency);
            const channel = synth.getChannelAssignation(note)
            console.log("triggering note", { note, cents, channel });
            let channelNibble = channel & 0x0F;
            const midiVelocity = Math.floor(velocity * 127);
            const noteOnMessage = [0x90 | channelNibble, note, midiVelocity];
            noteOffMessage = [0x80 | channelNibble, note, 0];
            triggerChannel = channel;
            // according to 
            // https://sites.uci.edu/camp2014/2014/04/30/managing-midi-pitchbend-messages/
            // pitch bend of 8192 means no pitch bend. Below that, it's negative pitch bend, and above, is positive.
            // I don't know for sure whether the result is accurate
            const midiPitchBendValue = Math.floor((cents / 100) * 8192 * pitchBendRangeOctaves + 8192);
            const pitchBendMessage = [0xe0 | channelNibble, midiPitchBendValue & 0x7f, (midiPitchBendValue >> 7) & 0x7f];
            midiOutput.send(pitchBendMessage);
            midiOutput.send(noteOnMessage, relativeNoteStart); //omitting the timestamp means send immediately.
            return this;
        },
        scheduleEnd(absoluteStopTime: number) {
            // potential problem: note off migth get sent even if stopped all happened just before. 
            midiOutput.send(noteOffMessage, absoluteStopTime);
            setTimeout(() => {
                synth.usedChannels[triggerChannel] = false;
            }, absoluteStopTime * 1000);
            return this;
        },
        stop() {
            midiOutput.send(noteOffMessage);
            synth.usedChannels[triggerChannel] = false;
            return this;
        }
    }
    return ret;
}


export class ExternalMidiSynth implements AudioModule {
    receivesNotes: true = true;
    readonly type = SynthChainStepType.AudioModule;
    constructor(audioContext: AudioContext) {
        this.updateParams();

    }
    isReady = false;
    //@ts-ignore
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

    scheduleStart = (frequency: number, absoluteStartTime: number, noteParameters: EventParamsBase) => {
        const dummyVoice = createVoice(this);
        dummyVoice.scheduleStart(frequency, absoluteStartTime, noteParameters);
        return dummyVoice;
    };
    schedulePerc = (frequency: number, absoluteStartTime: number, noteParams: EventParamsBase) => {
        const dummyVoice = createVoice(this);
        const { velocity } = noteParams;
        dummyVoice.scheduleStart(frequency, absoluteStartTime, { velocity });
        dummyVoice.scheduleEnd(absoluteStartTime + velocity);
        return dummyVoice;
    };
    stop = () => {
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
    updateParams = () => {
        const parent = this;
        const activate = () => {
            this.enable();
        }
        console.log("update params", this.midiOutputs.length);

        if (!this.midiOutputs.length) {
            this.params = [{
                type: ParamType.infoText,
                displayName: "off",
                get value() {
                    activate()
                    return [
                        "to activate, switch to a different instrument and then back",
                        "it might be possible that your browser doesn't support midi",
                    ].join("\n")
                },
            }, {
                type: ParamType.boolean,
                displayName: "enable",
                get value() { return false },
                set value(n: boolean) {
                    activate();
                },
            }] as SynthParam[];
        }

        let synth = this;
        this.params = [{
            type: ParamType.option,
            selectedMidiOutputIndex: 0,
            get value() {
                return this.selectedMidiOutputIndex;
            },
            set value(n: number) {
                this.selectedMidiOutputIndex = n;
                synth.sendTestChord();
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
            value: [
                "notes:",
                "1. this midi interface doesn't use MPE, but it sends each",
                "\t voice to a different channel, so that each can have their",
                "\t own pitch bend.",
                "\t If you buy me a controller or syhtn with MPE, I promise to ",
                "\t implement it :P",
                "",
                "2. Set your synth's pitch bend range to +- 2 semitones,",
                "\t otherwise the tuning is not going to be accurate",
                "",
                "3. I'm not 100% sure of the accuracy of the tone yet.",
            ].join("\n")
        }] as SynthParam[];
    }
    params = [] as SynthParam[];
    enable = () => {
        //@ts-ignore
        if (!navigator.requestMIDIAccess) return console.warn("no midi access possible");
        (async () => {

            //@ts-ignore
            const midiAccess = await navigator.requestMIDIAccess();
            this.midiOutputs = getMidiOutputsArray(midiAccess);
            this.sendTestChord();

            this.updateParams();
            this.isReady = true;
        })();
    }
    disable = () => { };
}