export interface Voice {
    inUse: boolean;
    audioContext: AudioContext;
    gainNode: GainNode;

    triggerAttack: (frequency: number, velocity: number, now?: number) => void;
    scheduleAttack: (frequency: number, velocity: number, when?: number, now?: number) => void;
    resetOscillator?: () => OscillatorNode;
    scheduleEnd: (endTimeSeconds: number, now?: number) => void;
    // constructor must be
    // constructor(audioContext: AudioContext, destination: AudioNode)
    // but could not find a way to type using interface
}


export interface Synth {

    playNoteEvent: (start: number, duration: number, frequency: number) => void;
    setAudioContext: (audioContext: AudioContext) => void;
    stopAllNotes: () => void;

    // constructor must be
    // constructor()
    // but could not find a way to type using interface
}


export class Synth implements Synth {

    playNoteEvent: (start: number, duration: number, frequency: number) => void;
    setAudioContext: (audioContext: AudioContext) => void;
    stopAllNotes = () => { };

    constructor(voiceFactory: (a: AudioContext, b: AudioNode) => Voice) {
        this.playNoteEvent = () => {
            console.warn("audio context has not been started");
        };
        this.setAudioContext = (audioContext) => {
            if(Synth.audioContext) {
                throw new Error("audio context already set");
            }
            const voicesMaster = audioContext.createGain();
            voicesMaster.gain.value = 1 / 4;
            voicesMaster.connect(audioContext.destination);
            const voices = [] as Array<Voice>;

            const findVoice = (): Voice => {
                for (let voice of voices) {
                    if (!voice.inUse) return voice;
                }

                let newVoice = voiceFactory(audioContext, voicesMaster);
                voices.push(newVoice);
                console.log("max poly", voices.length);
                return newVoice;
            }

            this.stopAllNotes = () => {
                for (let voice of voices) {
                    voice.scheduleEnd(audioContext.currentTime, 0);
                }
            }
            this.playNoteEvent = (startTimeSecondsFromNow, durationSeconds, frequency) => {
                const now = audioContext.currentTime;
                const startSeconds = audioContext.currentTime + startTimeSecondsFromNow;
                const endSeconds = startSeconds + durationSeconds;
                const voice = findVoice();
                voice.scheduleAttack(frequency, 1, startSeconds, now);
                voice.scheduleEnd(endSeconds, now);
            }
        }
    }
    static audioContext?: AudioContext;
}