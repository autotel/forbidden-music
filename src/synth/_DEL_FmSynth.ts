import AdsrNode from "../functions/AdsrNode";
import { Synth, Voice } from "../synth/Synth";
// maybe use https://github.com/g200kg/audioworklet-adsrnode instead
// transitioning to adsr because the other was a bit bad
/**
 * step 0: enveloped sine synth using adsrenvelope audioNode
 * step 1: sine wave voice with one envelope. The routing of envelope to amplitude is controllable
*/

class Operator {
    input: GainNode;
    output: GainNode;
    trigger = (scheduledTime?: number, ...p: any) => { };
    stop = (scheduledTime?: number, ...p: any) => { };
    constructor(audioContext: AudioContext) {
        this.input = audioContext.createGain();
        this.output = audioContext.createGain();
    }
}

class OscillatorOperator extends Operator {
    private oscillator: OscillatorNode;
    private oscillatorRunning = false;

    constructor(audioContext: AudioContext) {
        super(audioContext);

        const resetOscillator = () => {
            if (this.oscillatorRunning) this.oscillator.stop();
            this.oscillator?.disconnect();
            this.oscillator = audioContext.createOscillator();
            this.oscillator.connect(this.output);
            this.input.connect(this.oscillator.frequency);
            return this.oscillator;
        }

        this.oscillator = resetOscillator();

        this.trigger = (when = audioContext.currentTime, frequency = 440) => {
            resetOscillator();
            this.oscillator.frequency.value = frequency;
            this.oscillator.start(when);
        }
        this.stop = (when = audioContext.currentTime) => {
            this.oscillator.stop(when);
        }
    }
}

class EnvelopeOperator extends Operator {
    private envelope: AdsrNode;

    constructor(audioContext: AudioContext) {
        super(audioContext);

        const resetEnvelope = () => {
            this.envelope?.disconnect();
            this.envelope = new AdsrNode(audioContext, {
                attack: 0.05,
                attackcurve: 0,
                decay: 0.6,
                sustain: 0.01,
                release: 0.8
            });
            this.envelope.connect(this.output);
            // this.input.connect(this.envelope.trigger);
            return this.envelope;
        }

        this.envelope = resetEnvelope();

        this.trigger = (when = audioContext.currentTime, intesity = 1) => {
            resetEnvelope();
            if (when) {
                this.envelope.trigger.setValueAtTime(when, intesity);
            } else {
                this.envelope.trigger.value = intesity;
            }
        }
        this.stop = (when = audioContext.currentTime) => {
            this.trigger(when, 0);
        }
    }
}

class Connector extends GainNode{
    sourceName = "";
    destName = "";
}



class FmVoice implements Voice {

    inUse: boolean;
    audioContext: AudioContext;
    gainNode: GainNode;

    connectors = [] as Connector[];
    connectorsMap = new Map<string, Connector>();

    // patcheable operators
    oscillator = [] as OscillatorOperator[];
    env = [] as EnvelopeOperator[];

    everyOperator = [] as Operator[];

    // patch sources
    key = {};
    offsetVal = 1;

    triggerAttack(frequency: number, velocity = 0, currentTime = this.audioContext.currentTime) {
        this.scheduleAttack(frequency, velocity, 0);
    }

    scheduleAttack(frequency: number, velocity: number, when?: number, currentTime = this.audioContext.currentTime) {
        console.log("trigger attack", frequency);
        // TODO: frequency should only happen times keythrough
        this.oscillator.forEach(o => o.trigger(when, frequency));
        this.env.forEach(e => e.trigger(velocity, when));
        this.inUse = true;
    }

    scheduleEnd(endTimeSeconds: number = 0, playbackTime = this.audioContext.currentTime) {
        console.log("trigger end",endTimeSeconds, playbackTime);
        this.everyOperator.forEach(o => o.stop(playbackTime + endTimeSeconds));
        // to-do: prevent repetition of this timeout by clear timeout
        setTimeout(() => {
            this.inUse = false;
            this.oscillator.forEach(o => o.stop());
        }, (endTimeSeconds + 1) * 1000);
        // todo - the + 1 is for the release time
    }

    constructor(audioContext: AudioContext, destination: AudioNode) {
        this.inUse = false;
        this.audioContext = audioContext;

        this.gainNode = audioContext.createGain();
        this.gainNode.connect(destination);
        this.gainNode.gain.value = 0;

        for (let i = 0; i < 2; i++) {
            const env = new EnvelopeOperator(audioContext);
            const osc = new OscillatorOperator(audioContext);

            this.env.push(env);
            this.oscillator.push(osc);
        }

        // connect each env to each osc frequency
        this.env.forEach((env, envIt) => {
            this.oscillator.forEach((osc, oscIt) => {
                const newConnector = new Connector(audioContext);
                newConnector.sourceName = 'env' + envIt;
                newConnector.destName = 'osc' + oscIt + "Freq";
                this.connectorsMap.set(newConnector.sourceName + ">" + newConnector.destName, newConnector);
                env.output.connect(newConnector);
            });
        });

        // connect each osc to each other osc frequency
        this.oscillator.forEach((osc, oscIt) => {
            this.oscillator.forEach((osc2, oscIt2) => {
                if (oscIt !== oscIt2) {
                    const newConnector = new Connector(audioContext);
                    newConnector.sourceName = 'osc' + oscIt;
                    newConnector.destName = 'osc' + oscIt2 + "Freq";
                    osc.output.connect(newConnector);
                    newConnector.connect(osc2.input);
                    newConnector.gain.value = 0;
                    this.connectorsMap.set(newConnector.sourceName + ">" + newConnector.destName, newConnector);
                }
            });
        });

        this.env.forEach((env, envIt) => {
            const newConnector = new Connector(audioContext);
            newConnector.sourceName = 'env' + envIt;
            newConnector.destName = 'outputGain';
            env.output.connect(newConnector);
            newConnector.connect(this.gainNode.gain);
            newConnector.gain.value = 0;
            this.connectorsMap.set(newConnector.sourceName + ">" + newConnector.destName, newConnector);
        });

        this.oscillator.forEach((osc, oscIt) => {
            const newConnector = new Connector(audioContext);
            newConnector.sourceName = 'osc' + oscIt;
            newConnector.destName = 'outputGain';
            osc.output.connect(newConnector);
            newConnector.connect(this.gainNode);
            newConnector.gain.value = 0.5;
            this.connectorsMap.set(newConnector.sourceName + ">" + newConnector.destName, newConnector);
        });

        this.oscillator.forEach((osc, oscIt) => {
            const newConnector = new Connector(audioContext);
            newConnector.sourceName = 'osc' + oscIt;
            newConnector.destName = 'output';
            osc.output.connect(newConnector);
            newConnector.connect(this.gainNode);
            newConnector.gain.value = 0;
            this.connectorsMap.set(newConnector.sourceName + ">" + newConnector.destName, newConnector);
        });

        this.everyOperator = [...this.oscillator, ...this.env];
        // connect first envelope to main output gain
        const envelopeGainConnector = this.connectorsMap.get('env0>outputGain');
        if(envelopeGainConnector) envelopeGainConnector.gain.value = 1;
        // connect both oscillators to main output gain
        const oscillatorMainConnector = this.connectorsMap.get('osc0>output');
        // const oscillatorMainConnector2 = this.connectorsMap.get('osc0>output');
        if(oscillatorMainConnector) oscillatorMainConnector.gain.value = 1;
        // if(oscillatorMainConnector2) oscillatorMainConnector2.gain.value = 0.5;
        
        if(!envelopeGainConnector || !oscillatorMainConnector) throw new Error("Could not find connectors");
    }
}

export class FmSynth extends Synth {
    constructor() {
        super((audioContext, destination) => new FmVoice(audioContext, destination));
    }
}