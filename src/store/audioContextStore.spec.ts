import { createPinia, setActivePinia } from 'pinia';
import { describe, expect, it } from 'vitest';
import { useAudioContextStore } from './audioContextStore';
describe('AudioContextStore', () => {
    setActivePinia(createPinia());

    it('can be instanced', () => {
        const audioContextStore = useAudioContextStore();
    });
    // would need us to click the window to resolve the promise
    // it('resolves audio context promise with a running context after interaction', async () => {
        // const audioContextStore = useAudioContextStore();
        // window.dispatchEvent(new MouseEvent("click"));
        // await audioContextStore.audioContextPromise;
        // expect(audioContextStore.audioContext.state).toBe("running");
    // });

});