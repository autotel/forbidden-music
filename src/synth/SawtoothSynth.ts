class Voice {
    inUse: boolean;
    audioContext: AudioContext;

    gainNode: GainNode;
    oscillator: OscillatorNode;

    constructor(audioContext: AudioContext, destination: AudioNode) {
        this.audioContext = audioContext;
        this.inUse = false;
        this.gainNode = audioContext.createGain();
        this.oscillator = this.resetOscillator();
        this.gainNode.connect(destination);

    }

    triggerAttack(frequency: number, velocity: number) {
        this.scheduleAttack(frequency, velocity, this.audioContext.currentTime);
    }

    scheduleAttack(frequency: number, velocity: number, when: number) {
        this.gainNode.gain.cancelScheduledValues(this.audioContext.currentTime);
        this.inUse = true;
        this.oscillator.frequency.value = frequency;
        this.gainNode.gain.value = velocity;
    }
    
    resetOscillator() {
        this.oscillator?.stop();
        this.oscillator = this.audioContext.createOscillator();
        this.oscillator.type = "sawtooth";
        this.oscillator.connect(this.gainNode);
        this.oscillator.start();
        // just to make ts happy
        return this.oscillator;
    }

    scheduleRelease(when: number) {
        // TODO: this is not accurate
        this.gainNode.gain.exponentialRampToValueAtTime(0.001, when);
        setTimeout(() => {
            this.inUse = false;
        },(when - this.audioContext.currentTime) / 1000);
    }
}
export class SawtoothSynth {

    playNoteEvent: (start: number, duration: number, frequency: number) => void;
    setAudioContext: (audioContext: AudioContext) => void;

    constructor() {
        this.playNoteEvent = () => {
            console.warn("audio context has not been started");
        };
        this.setAudioContext = (audioContext) => {

            const voicesMaster = audioContext.createGain();
            voicesMaster.connect(audioContext.destination);
            const voices = [] as Array<Voice>;

            /** @returns {Voice} */
            const findVoice = () => {
                for (let voice of voices) {
                    if (!voice.inUse) return voice;
                }

                let newVoice = new Voice(audioContext, voicesMaster);

                voices.push(newVoice);
                return newVoice;
            }


            this.playNoteEvent = (startTimeSecondsFromNow, duration, frequency) => {
                // frequency = 440;
                const startSeconds = audioContext.currentTime + startTimeSecondsFromNow;
                const voice = findVoice();
                voice.scheduleAttack(frequency, 1, startSeconds);
                voice.scheduleRelease(startSeconds + duration);
            }
        }
    }
}
export default SawtoothSynth;