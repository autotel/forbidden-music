import workletUrl from "./audioEnvelopeWorklet.js?url";
console.log("using audio worklet", workletUrl)

export async function createAudioEnvelopeWorklet(
  context: AudioContext,
) {
  console.log("createAudioEnvelopeWorklet");
  try {
    let worklet = new AudioWorkletNode(context, "audioEnvelope");
    console.log("worklet already loaded");
    return worklet;
  } catch (_err) {
    try {
      await context.audioWorklet.addModule(workletUrl);
      console.log("worklet loaded");
      const worklet = new AudioWorkletNode(context, "audioEnvelope");
      return worklet;
    } catch (err) {
      console.error(err);
      throw new Error("Could not load worklet");
    }
  }
}

