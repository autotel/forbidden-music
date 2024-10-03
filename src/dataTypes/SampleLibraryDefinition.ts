import requireProperties from "@/functions/requireProperties";
import { assertSampleKitDefinition, SampleKitDefinition } from "./SampleKitDefinition";

export type SamplesLibraryDefinition = {
    url: string;
    name: string;
    error?: string;
    content: SampleKitDefinition[];
}


export const assertSampleLibraryDefinition = (def: Object): SamplesLibraryDefinition => {
    requireProperties(def, ['url', 'name', 'content'], 'Library definition');
    if (typeof def !== 'object') {
        throw new Error('Library definition must be an object');
    }
    // @ts-ignore
    if (!Array.isArray(def['content'])) {
        throw new Error('Library definition content property must be an array');
    }
    // @ts-ignore
    if (def.content.some((s: unknown) => typeof s !== 'object')) {
        throw new Error('Library definition content property must be an array of objects');
    }
    // @ts-ignore
    def.content.forEach(assertSampleKitDefinition); 
    return def as SamplesLibraryDefinition;
}
