import workletUrl from "./audioEnvelopeWorklet.js?url";

export async function createAudioEnvelopeWorklet(
  context: AudioContext,
) {
  try {
    let worklet = new AudioWorkletNode(context, "audioEnvelope");
    return worklet;
  } catch (_err) {
    try {
      await context.audioWorklet.addModule(workletUrl);
      const worklet = new AudioWorkletNode(context, "audioEnvelope");
      return worklet;
    } catch (err) {
      console.error(err);
      throw new Error("Could not load worklet");
    }
  }
}

