export const filterMap = <IN, OUT>(arr: (IN)[], fn: (item: IN, index: number) => false | OUT) => {
    const result: OUT[] = [];
    arr.forEach((item, index) => {
        const res = fn(item, index);
        if (res) {
            result.push(res);
        }
    });
    return result;
}