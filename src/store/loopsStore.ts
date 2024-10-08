import { sanitizeTimeRanges } from '@/dataTypes/TimelineItem';
import { Loop, LoopDef, loop, loopDef } from '../dataTypes/Loop';
import { compress } from "lzutf8";
import { defineStore } from "pinia";
import { ref } from "vue";
import { tryDecompressAndParseArray } from '@/functions/tryDecompressAndParseArray';
import { ProjectTraceContentsStore } from '@/dataTypes/ProjectContentsStore';

export const useLoopsStore = defineStore('loops score', () => {

    const list = ref<Loop[]>([]);

    const sort = (loops: Loop[] = list.value) => {
        loops.sort((a, b) => {
            return a.time - b.time;
        });
    }
    /** Convert loops to loop defs */
    const serialize = (loops: Loop[] = list.value) => loops.filter(
        l => ((l.timeEnd - l.time > 0) && (l.count > 0))
    ).map(loopDef);

    const stringify = (loops: Loop[] = list.value, zip: boolean = false) => {
        let str = JSON.stringify(serialize(loops));
        if (zip) str = compress(str, { outputEncoding: "Base64" });
        return str;
    }
    /** Convert loop defs to loops */
    const deserialize = (loopDefs: LoopDef[]) => loopDefs.map(loop);

    const setFromDefs = (loopDefs: LoopDef[]) => {
        list.value = deserialize(loopDefs);
        sort();
    }

    const parse = (str: string): Loop[] => {
        let loopDefs = tryDecompressAndParseArray<LoopDef>(str, (maybeLoop) => {
            if (typeof maybeLoop !== "object") return false;
            if (null === maybeLoop) return false;
            if (!('timeEnd' in maybeLoop)) return false;
            if (!('time' in maybeLoop)) return false;
            if (!('count' in maybeLoop)) return false;
            return true;
        });
        const loops = loopDefs.map(loop)
        sanitizeTimeRanges(...loops);
        return loops;
    }

    const clear = () => {
        list.value = [];
    }

    const append = (...loop: Loop[]) => {
        list.value.push(...loop);
        sort();
    }
    const returnValue = {
        list,
        append,
        clear,
        sort,
        serialize,
        deserialize,
        stringify,
        parse,
        setFromDefs,
    };
    return returnValue;
});