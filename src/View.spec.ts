import { describe, it, expect } from 'vitest'
import { useViewStore } from './store/viewStore';
describe('View', () => {
    it('can be instanced', () => {
        const view = useViewStore();
        // view.viewWidthPx = 100;
        // view.viewWidthTime = 10;
        // expect(view.timeToPx(50)).toBe(5);
    });

});