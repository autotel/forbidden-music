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



// const atan = await createWorkletNode(context, "atan-processor", workletUrl)
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
