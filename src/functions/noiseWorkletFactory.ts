import atanProcessorUrl from "./noise.worklet.ts?url";
console.log(atanProcessorUrl)



export async function createNoiseWorklet(
  context: BaseAudioContext,
) {
  try {
    console.log("worklet load");
    return new AudioWorkletNode(context, "noise-generator");
  } catch (err) {
    try {
        await context.audioWorklet.addModule(atanProcessorUrl);
        console.log("worklet load");
        return new AudioWorkletNode(context, "noise-generator");
    } catch (err) {
        throw new Error("Could not load worklet");
    }
  }
}


// const atan = await createWorkletNode(context, "atan-processor", atanProcessorUrl)
// fileInput.addEventListener("change", async (e) => {
//   const files = (e.target as HTMLInputElement).files as FileList;
//   if (files.length > 0) {
//     if (!context) context = new AudioContext();
//     // convert uploaded file to AudioBuffer
//     const buffer = await context.decodeAudioData(await files[0].arrayBuffer());
//     // create source and set buffer
//     const source = context.createBufferSource();
//     source.buffer = buffer;
//     // create atan node
//     // connect everything and automatically start playing
//     source.connect(atan).connect(context.destination);
//     source.start(0);
//   }
// });
