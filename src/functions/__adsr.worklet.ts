

class AdsrNode extends AudioWorkletNode {
  attack: AudioParam;
  attackcurve: AudioParam;
  decay: AudioParam;
  sustain: AudioParam;
  release: AudioParam;
  trigger: AudioParam;
  parameters = new Map();

  constructor(
    actx: AudioContext,
    options: Record<string, number> | undefined
  ) {
    super(actx, 'webaudio-adsr', {
      numberOfInputs: 0,
      numberOfOutputs: 1,
      channelCount: 1,
      parameterData: options,
    });

    this.attack = this.parameters.get('attack');
    this.attackcurve = this.parameters.get('attackcurve');
    this.decay = this.parameters.get('decay');
    this.sustain = this.parameters.get('sustain');
    this.release = this.parameters.get('release');
    this.trigger = this.parameters.get('trigger');
  }
  static Initialize(actx: AudioContext) {
    const adsrproc = `
      registerProcessor('webaudio-adsr', 
      });
      `;
    return actx.audioWorklet.addModule('data:text/javascript,' + encodeURI(adsrproc));
  }
}

export { };