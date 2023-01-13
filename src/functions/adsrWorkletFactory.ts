import workleturl from "./adsr.worklet.ts?url";
console.log("using audio worklet", workleturl)

export async function createAdsrWorklet(
  context: BaseAudioContext,
  options: { [key: string]: number },
) {
  try {
    let worklet = new AudioWorkletNode(context, "adsr-generator");
    console.log("worklet already loaded");
    return worklet as any;
  } catch (err) {
    try {
      await context.audioWorklet.addModule(workleturl);
      console.log("worklet load");
      let worklet = new AudioWorkletNode(context, "adsr-generator", options);
      return worklet as any;
    } catch (err) {
      console.error(err);
      throw new Error("Could not load worklet");
    }
  }
}
