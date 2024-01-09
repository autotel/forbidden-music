import { describe, expect, it } from 'vitest';
import { denormalize, normalize, paramRangeToAutomationRange, rangeScale } from './rangeScale';
describe('range scaler', () => {
    it('scales range correclty 1', () => {
        expect(
            rangeScale(1, 0, 2)
        ).toBe(0.5)
    });
    it('scales range correclty 2', () => {
        expect(
            rangeScale(3, 1, 11)
        ).toBe(0.2)
    });
    it('works in negative 1', () => {
        expect(
            rangeScale(1, 0, -2)
        ).toBe(-0.5)
    });
    it('works in negative 2', () => {
        expect(
            rangeScale(-1, 0, 2)
        ).toBe(-0.5)
    });
    it('works in negative 3', () => {
        expect(
            rangeScale(-1, 0, -2)
        ).toBe(0.5)
    });

    it('works in negative 4', () => {
        expect(
            rangeScale(0, 1, 11)
        ).toBe(-0.1)
    });

    it('works in negative 5', () => {
        expect(
            rangeScale(0, -1.5, 1.5)
        ).toBe(0.5)
    });


    it('normalizes', () => {
        expect(
            normalize(15, 0, 30)
        ).toBe(
            0.5
        )
        expect(
            normalize(-2, 0, 10)
        ).toBe(
            -0.2
        )
        expect(
            normalize(2, 0, 100)
        ).toBe(
            0.02
        )
        expect(
            normalize(0, -1, 1)
        ).toBe(
            0.5
        )
        expect(
            normalize(1, -1, 1)
        ).toBe(
            1
        )
    })

    it('denormalizes', () => {
        expect(
            denormalize(0.5, 0, 30)
        ).toBe(
            15
        )
        expect(
            denormalize(-0.2, 0, 10)
        ).toBe(
            -2
        )
        expect(
            denormalize(0.02, 0, 100)
        ).toBe(
            2
        )
        expect(
            denormalize(0, -1, 1)
        ).toBe(
            -1
        )
    })
    it('converts param to automation lane range 1', () => {
        expect(
            paramRangeToAutomationRange(0, { min: -1.5, max: 1.5 })
        ).toBe(
            0.5
        )
    })
    it('converts param to automation lane range 2', () => {
        expect(
            paramRangeToAutomationRange(-1, { min: -1.5, max: 1.5 })
        ).toBe(
            1/6
        )
    })
    it('converts automation lane range to param  1', () => {
        expect(
            paramRangeToAutomationRange(1.5, { min: -1.5, max: 1.5 })
        ).toBe(
            1
        )
    })
    it('converts automation lane range to param  2', () => {
        expect(
            paramRangeToAutomationRange(-1.5, { min: -1.5, max: 1.5 })
        ).toBe(
            0
        )
    })


});