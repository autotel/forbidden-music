import workletUrl from "./maximizerWorklet.js?url";
console.log("using audio worklet", workletUrl)

export async function createMaximizerWorklet(
  context: AudioContext,
) {
  console.log("createMaximizerWorklet");
  try {
    let worklet = new AudioWorkletNode(context, "maximizer");
    console.log("worklet already loaded");
    return worklet;
  } catch (_err) {
    try {
      await context.audioWorklet.addModule(workletUrl);
      console.log("worklet loaded");
      const worklet = new AudioWorkletNode(context, "maximizer");
      return worklet;
    } catch (err) {
      console.error(err);
      throw new Error("Could not load worklet");
    }
  }
}

