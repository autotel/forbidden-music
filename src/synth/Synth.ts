export interface Voice {
    inUse: boolean;
    audioContext: AudioContext;

    gainNode: GainNode;
    oscillator: OscillatorNode;

    
    triggerAttack: (now: number, frequency: number, velocity: number) => void;
    scheduleAttack: (now: number, frequency: number, velocity: number, when: number) => void;
    resetOscillator: () => OscillatorNode;
    scheduleEnd: (now: number, endTimeSeconds: number) => void;
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
