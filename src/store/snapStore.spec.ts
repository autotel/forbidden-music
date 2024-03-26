import { createPinia, setActivePinia } from 'pinia';
import { describe, expect, it } from 'vitest';
import { useViewStore } from './viewStore';
import { useSnapStore } from './snapStore';
describe('Snaps', () => {
    setActivePinia(createPinia());

    it('can be instanced', () => {
        const snap = useSnapStore();
    });
});