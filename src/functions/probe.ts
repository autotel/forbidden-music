import { devLog } from "./isDev";

export const probe = <P1>(p1: P1, ...params: any[]) => {
    devLog(p1,...params);
    return p1
}