import workletUrl from "./karplusWorklet.js?url";
console.log("using audio worklet", workletUrl)

export async function createKarplusWorklet(
  context: AudioContext,
) {
  console.log("createKarplusWorklet");
  try {
    let worklet = new AudioWorkletNode(context, "karplus");
    console.log("worklet already loaded");
    return worklet;
  } catch (_err) {
    try {
      await context.audioWorklet.addModule(workletUrl);
      console.log("worklet loaded");
      const worklet = new AudioWorkletNode(context, "karplus");
      return worklet;
    } catch (err) {
      console.error(err);
      throw new Error("Could not load worklet");
    }
  }
}

