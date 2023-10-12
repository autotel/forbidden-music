import { createPinia, setActivePinia } from 'pinia';
import { describe, expect, it, vi } from 'vitest';
import { useCustomSettingsStore } from './customSettingsStore';
describe('AudioContextStore', () => {
    setActivePinia(createPinia());

    it('nothing', () => {
        expect(true).toBe(true);
    });
});