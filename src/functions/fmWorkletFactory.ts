import workletUrl from "./fmWorklet.js?url";
console.log("using audio worklet", workletUrl)

export async function createFmWorklet(
  context: AudioContext,
) {
  console.log("createFmWorklet");
  try {
    let worklet = new AudioWorkletNode(context, "fm-synth");
    console.log("worklet already loaded");
    return worklet;
  } catch (_err) {
    try {
      await context.audioWorklet.addModule(workletUrl);
      console.log("worklet loaded");
      const worklet = new AudioWorkletNode(context, "fm-synth");
      return worklet;
    } catch (err) {
      console.error(err);
      throw new Error("Could not load worklet");
    }
  }
}
