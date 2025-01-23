import workletUrl from "./maximizerWorklet.js?url";

export async function createMaximizerWorklet(
  context: AudioContext,
) {
  try {
    let worklet = new AudioWorkletNode(context, "maximizer");
    return worklet;
  } catch (_err) {
    try {
      await context.audioWorklet.addModule(workletUrl);
      const worklet = new AudioWorkletNode(context, "maximizer");
      return worklet;
    } catch (err) {
      console.error(err);
      throw new Error("Could not load worklet");
    }
  }
}

