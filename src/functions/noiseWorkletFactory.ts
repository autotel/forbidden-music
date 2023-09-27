import workletUrl from "./noise.worklet.ts?url";
console.log("using audio worklet",workletUrl)



export async function createNoiseWorklet(
  context: BaseAudioContext,
) {
  try {
    let worklet = new AudioWorkletNode(context, "noise-generator");
    console.log("worklet already loaded");
    return worklet;
  } catch (err) {
    try {
        await context.audioWorklet.addModule(workletUrl);
        console.log("worklet load");
        let worklet = new AudioWorkletNode(context, "noise-generator");
        return worklet;
    } catch (err) {
        throw new Error("Could not load worklet");
    }
  }
}

