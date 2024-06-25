
export const probe = <P1>(p1: P1, ...params: any[]) => {
    console.log(p1,...params);
    return p1
}