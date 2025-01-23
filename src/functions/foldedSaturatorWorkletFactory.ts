import workletUrl from "./foldedSaturatorWorklet.js?url";

export async function createFoldedSaturatorWorklet(
  context: AudioContext,
) {
  try {
    let worklet = new AudioWorkletNode(context, "foldedSaturator");
    return worklet;
  } catch (_err) {
    try {
      await context.audioWorklet.addModule(workletUrl);
      const worklet = new AudioWorkletNode(context, "foldedSaturator");
      return worklet;
    } catch (err) {
      console.error(err);
      throw new Error("Could not load worklet");
    }
  }
}

