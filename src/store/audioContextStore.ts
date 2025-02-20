import { defineStore } from "pinia";

export const useAudioContextStore = defineStore('audio-context', () => {
    let audioContext = new AudioContext();

    let audioContextListenerAlreadyStarted = false;

    const startContextListener = async () => {
        if (audioContextListenerAlreadyStarted) return;
        audioContextListenerAlreadyStarted = true;
        await audioContext.resume();
        console.log("audio is ready");
        if (audioContext.state === "running") {
            window.removeEventListener("mousedown", startContextListener);
        }
    }

    const retryAudioContext = async () => {
        audioContext.resume();
        console.log("audio context state", audioContext.state);
    }

    // if context is allowed to start without interaction, start it now
    const audioContextPromise = new Promise<AudioContext>(async (resolve) => {
        startContextListener().then(() => {
            resolve(audioContext);
        });
        if (audioContext.state === "running") {
        } else {
            window.addEventListener("mousedown", () => {
                audioContext.resume();
            });
        }
    });

    // otherwise, wait for interaction
    window.addEventListener("mousedown", startContextListener);


    return {
        retryAudioContext,
        audioContextPromise,
        audioContext,

    }
});