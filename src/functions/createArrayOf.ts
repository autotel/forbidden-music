export const createArrayOf = <T>(
    length: number, 
    fn: (index: number) => T
) => {
    const result: T[] = [];
    for (let i = 0; i < length; i++) {
        result.push(fn(i));
    }
    return result;
}
export const createFilteredArrayOf = <T>(
    length: number, 
    fn: (index: number) => (T | undefined | false | null)
) => {
    const result: T[] = [];
    for (let i = 0; i < length; i++) {
        const r = fn(i);
        if(r) result.push();
    }
    return result;
}
