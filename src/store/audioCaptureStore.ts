import { defineStore } from "pinia";
import { useAudioContextStore } from "./audioContextStore";

export const useAudioCaptureStore = defineStore('audio-capture', () => {
    const audioContextStore = useAudioContextStore();

    let alreadyResolved = false;
    let resolveAudioCapturePromise: (stream: MediaStream) => void;
    let inputNode = audioContextStore.audioContext.createGain();

    const audioCapturePromise = new Promise<MediaStream>(async (resolve) => {
        resolveAudioCapturePromise = resolve;
    });

    let requestAudioCapture = () => {
        if (alreadyResolved) return audioCapturePromise;

        navigator.mediaDevices.getUserMedia({ audio: true }).then((stream)=>{
            console.log("audio capture stream", stream);
            let audioSource = audioContextStore.audioContext.createMediaStreamSource(stream);
            audioSource.connect(inputNode);
            resolveAudioCapturePromise(stream);
            alreadyResolved = true;
        }).catch((error)=>{
            console.error("Error starting audio capture", error);
        });
        return audioCapturePromise;
    }
    
    return {
        audioCapturePromise,
        requestAudioCapture,
        inputNode,
    }
});