export class StringWorker {
    constructor(workerString: string) {
        // function to be your worker
        function workerFunction() {
            var self = this;
            self.onmessage = function (e) {
                console.log('Received input: ', e.data); // message received from main thread
                self.postMessage("Response back to main thread");
            }
        }


        ///////////////////////////////

        var dataObj = '(' + workerFunction + ')();'; // here is the trick to convert the above fucntion to string
        var blob = new Blob([dataObj.replace('"use strict";', '')]); // firefox adds "use strict"; to any function which might block worker execution so knock it off

        var blobURL = (window.URL ? URL : webkitURL).createObjectURL(blob, {
            type: 'application/javascript; charset=utf-8'
        });


        var worker = new Worker(blobURL); // spawn new worker

        worker.onmessage = function (e) {
            console.log('Worker said: ', e.data); // message received from worker
        };
        worker.postMessage("some input to worker"); // Send data to our worker.

    }
}