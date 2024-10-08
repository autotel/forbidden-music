import { sanitizeTimeRanges } from '@/dataTypes/TimelineItem';
import { tryDecompressAndParseArray } from '@/functions/tryDecompressAndParseArray';
import { compress } from "lzutf8";
import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { Loop, LoopDef, loop, loopDef } from '../dataTypes/Loop';
import { TreeStucture } from '@/dataTypes/TreeStructure';
import { ifDev } from '@/functions/isDev';

export type HierarchicalLoop = TreeStucture<Loop>; 

export const useLoopsStore = defineStore('loops score', () => {

    const list = ref<Loop[]>([]);

    const hierarchical = computed<HierarchicalLoop[]>(() => {
        const returnValue: HierarchicalLoop[] = [];
        const hLoops = [...list.value].sort((a,b)=>{
            if(a.time == b.time) {
                return b.timeEnd-a.timeEnd;
            }
            return a.time-b.time;
        }).map(loop => ({
            value: loop,
            children: [],
        }));
        
        hLoops.forEach(loop => {
            let parent = returnValue;
            let i = 0;
            while(i < parent.length) {
                if(loop.value.time >= parent[i].value.time && loop.value.time < parent[i].value.timeEnd) {
                    parent = parent[i].children;
                    i = 0;
                } else {
                    i++;
                }
            }
            parent.push(loop);
        });
        return returnValue;
    });

    const sort = (loops: Loop[] = list.value) => {
        loops.sort((a, b) => {
            return a.time - b.time;
        });
        ifDev(() => {
            loops.forEach((loop, index) => {
                loop.dev_id = index.toString();
            });
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

    const set = (loops: Loop[]) => {
        list.value = loops;
    }

    const append = (...loop: Loop[]) => {
        list.value.push(...loop);
        sort();
    }
    const returnValue = {
        list,
        append,
        set,
        clear,
        sort,
        serialize,
        deserialize,
        stringify,
        parse,
        setFromDefs,
        hierarchical,
    };
    return returnValue;
});