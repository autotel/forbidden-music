const express = require('express')
const path = require('path')
const generateSamplesList = require('../scripts/functions/generateManifest.cjs')
const app = express()
const port = 3010
const cors = require('cors')

const publicPath = path.join(__dirname, 'public')
const myUrl = 'http://localhost:' + port

// Create a list of sample librariy descriptors. These contain the paths to samples, and how
// to parse the filenames to extract frequency, velocity and other data.
const namings = require('./public/namings.json')

app.get('/samples', cors({ origin: '*' }), (req, res) => {
    const generatedSamplesList = generateSamplesList(namings, 'public', myUrl, 'autotel extra samples')
    res.json(generatedSamplesList);
});

app.use(cors({ origin: '*' }))
app.use(express.static(publicPath))

app.listen(port, () => {
    console.log('Server is running on ' + myUrl)
    console.log('publicPath')
});

// server.on('request', (req, res) => {
//     console.log("autoclose in 3 seconds")
//     setTimeout(function () {
//         server.close();
//     }, 3000)
// });

module.exports = {
    accessUrl: `http://localhost:${port}`,
}