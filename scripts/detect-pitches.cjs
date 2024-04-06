const fs = require('fs')
const WavDecoder = require('wav-decoder')
const { YIN } = require('node-pitchfinder')
const path = require('path')
const scriptDir = "./"

const samplesRelativetoSrc = 'audio';
const samplesDir = path.join(scriptDir, "/public", samplesRelativetoSrc);
const samplePacks = fs.readdirSync(samplesDir);

// see below for option parameters.
const detectPitch = YIN({ sampleRate: 44100 })



/**
 * make sure that the script is being called from one dir up
 */
if (!samplePacks) {
    throw new Error("run this script from the root of the project");
}


let promises = [];

samplePacks.forEach(containerDir => {
    const container = path.join(samplesDir, containerDir)

    //for each wav file in the directory
    const files = fs.readdirSync(container)

    const alreadyProcessedFn = "_already_processed"

    // if "_already_processed" file exists, skip
    if (fs.existsSync(path.join(container, alreadyProcessedFn))) {
        console.log(`already processed. delete ${alreadyProcessedFn} file to reprocess`)
        return
    }
    files.forEach(file => {

        promises.push(new Promise(async (resolve, reject) => {
            if (path.extname(file) !== ".wav") {
                console.log("skipping", file)
                return
            }
            try {
                const filepath = path.join(container, file)
                const buffer = fs.readFileSync(filepath)
                const decoded = await WavDecoder.decode(buffer) // get audio data from file using `wav-decoder`
                const float64Array = decoded.channelData[0] // get a single channel of sound
                const pitch = detectPitch(float64Array) // All detectors are using float64Array internally, but you can also give an ordinary array of numbers
                const pitchThreeDecimal = pitch.toFixed(3)
                const newFilePath = path.join(container, `${pitchThreeDecimal}.wav`)
                // console.log(`|| ${filepath}`, `|| \n\t\t${newFilePath}`)
                if(pitch < 40 || pitch > 20000) {
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
    })
})

Promise.all(promises).then(() => {
    console.log("done")
}).catch((e) => {    
    console.log(e)
})
