
export const rangeScale = (val: number, min: number, max: number) => {
    const range = max - min;
    return (val - min) / range;
}

export const normalize = (val: number, min: number, max: number) => {
    const range = max - min;
    return (val - min) / range;
}

export const denormalize = (val: number, min: number, max: number) => {
    const range = max - min;
    return (val * range) + min;
}
