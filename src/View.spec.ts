import { describe, it, expect } from 'vitest'
import { useViewStore } from './store/viewStore';
describe('View', () => {
    it('can be instanced', () => {
        const view = useViewStore();
    });
    it('converts octave, velocity and time into pixels', () => {
        const view = useViewStore();
        view.octaveOffset = -3;
        view.timeOffset = 0;
        view.viewWidthPx = 1000;
        view.viewWidthTime = 1000;
        view.viewHeightOctaves = 6;
        view.viewHeightPx = 1000;
        view.centerFrequency = 440;
        view._offsetPxX = 500;
        view._offsetPxY = 500;


    });
    it('converts the reverse, producing almost the same values as the initial ones, within a range', () => {
    });

});