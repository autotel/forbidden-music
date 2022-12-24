export const weirdFloatToString = (value: number, precision: number = 5) => {
    return value.toFixed(precision).replace(/\.?0+$/, "");
}