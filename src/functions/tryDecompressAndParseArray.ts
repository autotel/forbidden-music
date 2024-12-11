import { decompress } from "lzutf8";
import { ifDev } from "./isDev";

type ItmFilter<T> = (itm: unknown | T) => boolean;
export const tryDecompressAndParseArray = <T>(str: string, testFn: ItmFilter<T>): T[] => {
    let json = str;
    try {
        json = decompress(str, { inputEncoding: "Base64" });
    } catch (_e) {
        ifDev(() => console.log("cannot be decompressed"));
        return [];
    }

    try {
        const parsed = JSON.parse(json);
        if (!('length' in parsed)) {
            console.warn("invalid notes string", str);
            return [];
        } else {
            return parsed.filter(testFn) as T[];
        }
    } catch (_e) {
        ifDev(() => console.log("cannot be parsed"));
        return [];
    }
}
