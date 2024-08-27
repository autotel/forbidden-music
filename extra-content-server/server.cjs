const express = require('express')
const path = require('path')
const generateSamplesList = require('./functions/generateManifest')
const fs = require('fs')
const app = express()
const port = 3010
const cors = require('cors')

const publicPath = path.join(__dirname, 'public')
const myUrl = 'http://localhost:' + port

app.get('/samples', (req, res) => {
    const jsonContents = require(path.join(publicPath, 'samples.json'))
    res.send(jsonContents)
});

app.get('/generate-samples', cors({ origin: '*' }), (req, res) => {
    try {
        const namings = require('./public/namings.json')
        res.json(generateSamplesList(namings, myUrl));
    } catch (e) {
        res.json({ error: e.message });
    }
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