import workletUrl from "./foldedSaturatorWorklet.js?url";
console.log("using audio worklet", workletUrl)

export async function createFoldedSaturatorWorklet(
  context: AudioContext,
) {
  console.log("createFoldedSaturatorWorklet");
  try {
    let worklet = new AudioWorkletNode(context, "foldedSaturator");
    console.log("worklet already loaded");
    return worklet;
  } catch (_err) {
    try {
      await context.audioWorklet.addModule(workletUrl);
      console.log("worklet loaded");
      const worklet = new AudioWorkletNode(context, "foldedSaturator");
      return worklet;
    } catch (err) {
      console.error(err);
      throw new Error("Could not load worklet");
    }
  }
}

