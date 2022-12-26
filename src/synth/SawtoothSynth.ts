import { Voice, Synth } from "./Synth";

class SawtoothVoice implements Voice {
    inUse: boolean;
    audioContext: AudioContext;

    gainNode: GainNode;
    oscillator: OscillatorNode;
    filterNode: BiquadFilterNode;

    constructor(audioContext: AudioContext, destination: AudioNode) {
        this.audioContext = audioContext;
        this.inUse = false;

        this.filterNode = audioContext.createBiquadFilter();
        this.gainNode = audioContext.createGain();
        this.oscillator = this.resetOscillator();

        this.filterNode.connect(this.gainNode);
        this.gainNode.connect(destination);

        this.filterNode.Q.value = 0.7;
        this.filterNode.frequency.value = 2000;
    }

    triggerAttack(now: number, frequency: number, velocity: number) {
        this.scheduleAttack(now, frequency, velocity, now);
    }

    scheduleAttack(now: number, frequency: number, velocity: number, when: number) {
        this.resetOscillator();
        this.gainNode.gain.cancelScheduledValues(now - 0.01);
        this.inUse = true;
        this.oscillator.frequency.value = frequency;
        this.filterNode.frequency.value = frequency;
        // this.gainNode.gain.value = velocity;
        this.gainNode.gain.setValueAtTime(velocity, now);
    }

    resetOscillator() {
        this.oscillator?.stop();
        this.oscillator = this.audioContext.createOscillator();
        this.oscillator.type = "sawtooth";
        this.oscillator.connect(this.filterNode);
        this.oscillator.start();
        // just to make ts happy
        return this.oscillator;
    }

    scheduleEnd(now: number, endTimeSeconds: number) {
        if (typeof endTimeSeconds !== "number") throw new Error("endTimeSeconds is not a number");

        console.log("end in", endTimeSeconds - now);
        this.gainNode.gain.setValueAtTime(0, endTimeSeconds);

        setTimeout(() => {
            this.inUse = false;
        }, endTimeSeconds * 1000 + 40);
    }
}
export class SawtoothSynth implements Synth {

    playNoteEvent: (start: number, duration: number, frequency: number) => void;
    setAudioContext: (audioContext: AudioContext) => void;
    stopAllNotes = () => { };
    constructor() {
        this.playNoteEvent = () => {
            console.warn("audio context has not been started");
        };
        this.setAudioContext = (audioContext) => {

            const voicesMaster = audioContext.createGain();
            voicesMaster.gain.value = 1 / 4;
            voicesMaster.connect(audioContext.destination);
            const voices = [] as Array<SawtoothVoice>;

            /** @returns {SawtoothVoice} */
            const findVoice = () => {
                for (let voice of voices) {
                    if (!voice.inUse) return voice;
                }

                let newVoice = new SawtoothVoice(audioContext, voicesMaster);

                voices.push(newVoice);
                return newVoice;
            }

            this.stopAllNotes = () => {
                for (let voice of voices) {
                    voice.scheduleEnd(audioContext.currentTime, 0);
                }
            }
            this.playNoteEvent = (startTimeSecondsFromNow, durationSeconds, frequency) => {
                console.log("play",
                    startTimeSecondsFromNow,
                    durationSeconds,
                    frequency
                );
                const now = audioContext.currentTime;
                const startSeconds = audioContext.currentTime + startTimeSecondsFromNow;
                const endSeconds = startSeconds + durationSeconds;
                const voice = findVoice();
                voice.scheduleAttack(now, frequency, 1, startSeconds);
                voice.scheduleEnd(now, endSeconds);
            }
        }
    }
}
export default SawtoothSynth;