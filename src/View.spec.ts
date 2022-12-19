import { View } from "./View";
import { describe, it, expect } from 'vitest'
describe('View', () => {
    it('converts px to time', () => {
        const view = new View(100, 100, 10, 10);
        expect(view.pxToTime(50)).toBe(5);
    });
    it('converts time to px', () => {
        const view = new View(100, 100, 10, 10);
        expect(view.timeToPx(5)).toBe(50);
    });
    it('converts px to octave', () => {
        const view = new View(100, 100, 10, 10);
        expect(view.pxToOctave(50)).toBe(5);
    });
    it('converts octave to px', () => {
        const view = new View(100, 100, 10, 10);
        expect(view.octaveToPx(5)).toBe(50);
    });
    it('converts octave to frequency', () => {
        const view = new View(100, 100, 10, 10);    
        expect(view.octaveToFrequency(5)).toBe(1760);
    });
    it('converts frequency to octave', () => {
        const view = new View(100, 100, 10, 10);
        expect(view.frequencyToOctave(1760)).toBe(5);
    });
    it('converts px to time with time offset', ()=> {
        const view = new View(100, 100, 10, 10);
        view.timeOffset = 5;
        expect(view.pxToTime(50)).toBe(10);
    });
    it('converts px to frequency with octave offset',()=>{
        const view = new View(100, 100, 10, 10);
        view.octaveOffset = 5;
        expect(view.octaveToFrequency(5)).toBe(7040);
    })
    it('converts px to frequency and back' , () => {
        const view = new View(100, 100, 10, 10);
        expect(view.octaveToFrequency(view.pxToOctave(50))).toBe(1760);
        const view2 = new View(1920, 1080, 256, 4);
        view2.centerFrequency = 261.6255653005986;
        view2.timeOffset = 12;
        view2.octaveOffset = 3;
        expect(view2.octaveToFrequency(view2.pxToOctave(50))).toBe(1760);

    });

});