/**
 * Stores which contain data that can be saved as part to a project
 */

import { Trace } from "./Trace";


export interface ProjectContentsStore {
    stringify: () => string
    parse: (str: string) => void
}

export interface ProjectTraceContentsStore<T extends Trace> extends ProjectContentsStore {
    list: Array<T>
    append: (...items: T[]) => void
    clear: () => void
    set: (items: T[]) => void
}