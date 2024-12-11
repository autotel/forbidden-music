import { SampleFileDefinition } from "@/synth/features/chromaticSampleKitUser";
import requireProperties from "@/functions/requireProperties";
// { library [ kits [ samples ] ]  }

export type SampleType = 'chromatic' | 'atonal' | 'impulse-response';
export type LoadFromType = 'file' | 'http';
/**
 * A list of samples to distribute accross
 * frequencies, with some metadata
 */
export interface SampleKitDefinition {
    type: SampleType;
    name: string,
    exclusive?: boolean;
    onlyLocal?: boolean;
    readme?: string;
    fromLibrary: string;
    loadFrom: LoadFromType;
    samples: SampleFileDefinition[];
}

export const assertSampleKitDefinition = (def: Object): SampleKitDefinition =>  {
    if (def === null) {
        throw new Error('Library definition is null');
    }

    // @ts-ignore
    requireProperties(def, [
        'name', 
        'samples', 
        'fromLibrary', 
        'type',
        'loadFrom'
    ], 'Library definition');

    if (typeof def !== 'object') {
        throw new Error('Library definition must be an object');
    }
    // @ts-ignore
    if (!Array.isArray(def['samples'])) {
        throw new Error('Library definition samples property must be an array');
    }
    // @ts-ignore
    if (def['loadFrom'] !== 'http' && def['loadFrom'] !== 'file') {
        // @ts-ignore
        throw new Error('Library definition loadFrom unknown value ', def['loadFrom']);
    }
    // @ts-ignore
    if (def.samples.some((s: unknown) => typeof s !== 'object')) {
        throw new Error('Library definition samples property must be an array of objects');
    }

    // @ts-ignore
    def.samples.forEach((s: unknown) => {
        if (s === null) {
            // @ts-ignore
            throw new Error('Sample definition is null in ' + def.name);
        }
        if (typeof s !== 'object') {
            throw new Error('Sample definition must be an object');
        }
        // @ts-ignore
        requireProperties(s, ['path', 'name'], def.name);

        // @ts-ignore
        if (def.type === 'chromatic') {
            // @ts-ignore
            requireProperties(s, ['frequency', 'frequencyStart', 'frequencyEnd', 'velocityStart', 'velocityEnd'], def.name);
        }

        if ('frequencyEnd' in s && s.frequencyEnd === null) s.frequencyEnd = Infinity;
        if ('velocityEnd' in s && s.velocityEnd === null) s.velocityEnd = Infinity;
    })
    return def as SampleKitDefinition;
}