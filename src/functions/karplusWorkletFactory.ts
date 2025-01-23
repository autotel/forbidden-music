import workletUrl from "./karplusWorklet.js?url";

export async function createKarplusWorklet(
  context: AudioContext,
) {
  try {
    let worklet = new AudioWorkletNode(context, "karplus");
    return worklet;
  } catch (_err) {
    try {
      await context.audioWorklet.addModule(workletUrl);
      const worklet = new AudioWorkletNode(context, "karplus");
      return worklet;
    } catch (err) {
      console.error(err);
      throw new Error("Could not load worklet");
    }
  }
}

