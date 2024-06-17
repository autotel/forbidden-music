
export const probe = (...params: any[]) => {
    console.log(...params);
    return params[0];
}