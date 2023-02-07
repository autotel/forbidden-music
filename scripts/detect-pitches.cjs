const fs = require('fs')
const WavDecoder = require('wav-decoder')
const { YIN } = require('node-pitchfinder')
const path = require('path')

// see below for option parameters.
const detectPitch = YIN({ sampleRate: 44100 })


const container = path.resolve('./public/audio/tarane468-celtic-harp-ii')

//for each wav file in the directory
const files = fs.readdirSync(container)
files.forEach(file => {
    if(path.extname(file) !== ".wav") return
    try{
        const buffer = fs.readFileSync(path.join(container,file))
        const decoded = WavDecoder.decode(buffer) // get audio data from file using `wav-decoder`
        const float64Array = decoded.channelData[0] // get a single channel of sound
        const pitch = detectPitch(float64Array) // All detectors are using float64Array internally, but you can also give an ordinary array of numbers
        console.log(file, pitch)
    }catch(e){
        console.error(file,"unreadable",e)
    }
})