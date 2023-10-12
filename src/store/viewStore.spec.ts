import { createPinia, setActivePinia } from 'pinia';
import { describe, expect, it } from 'vitest';
import { useViewStore } from './viewStore';
describe('View', () => {
    setActivePinia(createPinia());

    it('can be instanced', () => {
        const view = useViewStore();
    });
    it('converts octave, velocity and time into pixels', () => {
        const view = useViewStore();
        view.octaveOffset = -2;
        view.timeOffset = 2;
        view.viewWidthPx = 1000;
        view.viewWidthTime = 10;
        view.viewHeightOctaves = 2;
        view.viewHeightPx = 1000;
        view.centerFrequency = 440;
        view._offsetPxX = 500;
        view._offsetPxY = 500;
        expect(view.octaveToPx(1)).toBe(-500);
        expect(view.octaveToPx(2)).toBe(-1000);
        expect(view.octaveToPxWithOffset(1)).toBe(1000);

        expect(view.timeToPx(0)).toBe(0);
        expect(view.timeToPx(1)).toBe(100);
        expect(view.timeToPxWithOffset(1)).toBe(-100);

    });
    it('converts the reverse, producing almost the same values as the initial ones, within a range', () => {
        const view = useViewStore();
        view.octaveOffset = -2;
        view.timeOffset = 2;
        view.viewWidthPx = 1000;
        view.viewWidthTime = 10;
        view.viewHeightOctaves = 2;
        view.viewHeightPx = 1000;
        view.centerFrequency = 440;
        view._offsetPxX = 500;
        view._offsetPxY = 500;
        for (let octave = -5; octave < 5; octave++) {
            for (let time = 0; time < 10; time++) {
                const pxX = view.octaveToPx(octave);
                const pxY = view.timeToPx(time);
                const octave2 = view.pxToOctave(pxX);
                const time2 = view.pxToTime(pxY);
                expect(octave2).toBe(octave);
                expect(time2).toBe(time);
            }
        }
    });

});