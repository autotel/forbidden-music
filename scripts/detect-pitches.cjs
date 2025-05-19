const fs = require('fs');
const WavDecoder = require('wav-decoder');
const pitchyPromise = import("pitchy");
const path = require('path')
const scriptDir = "./"

const samplesDir = 'audio/';
const renamedSamplesDestination = path.join(scriptDir, samplesDir, 'result');

let promises = [];

const files = fs.readdirSync(path.resolve(samplesDir));

fs.mkdirSync(renamedSamplesDestination);
files.forEach(file => {
    
    promises.push(new Promise(async (resolve, reject) => {
        const pitchy = await pitchyPromise;
        const PitchDetector = pitchy.PitchDetector;

        if (path.extname(file) !== ".wav") {
            console.log("skipping", file)
            return
        }
        try {
            const filepath = path.join(samplesDir, file)
            const buffer = fs.readFileSync(filepath)
            const decoded = await WavDecoder.decode(buffer) // get audio data from file using `wav-decoder`
            const float64Array = decoded.channelData[0] // get a single channel of sound
            const pitch = PitchDetector.forFloat64Array(float64Array.length) // All detectors are using float64Array internally, but you can also give an ordinary array of numbers
            const [detectedValue, confidence] = pitch.findPitch(float64Array, decoded.sampleRate);
            console.log(`|| ${file}`, `|| \n\t\t${detectedValue.toFixed(3)} Hz`)
            const pitchThreeDecimal = detectedValue.toFixed(3)
            const basename = path.basename(file);
            const newFilePath = path.join(renamedSamplesDestination, `${basename}_${pitchThreeDecimal}.wav`)
            // console.log(`|| ${filepath}`, `|| \n\t\t${newFilePath}`)
            if (pitch < 40 || pitch > 20000) {
                console.log(`skipping ${file} because pitch is ${pitch}`)
                return
            }
            fs.renameSync(filepath, newFilePath)
            // create file to indicate that process has been done already 
            fs.writeFileSync(path.join(container, alreadyProcessedFn), "")

            resolve()
        } catch (e) {
            reject(`problem processing ${file}: ${e} `)
        }
    }))
});

Promise.all(promises).then(() => {
    console.log("done")
}).catch((e) => {
    console.log(e)
})
