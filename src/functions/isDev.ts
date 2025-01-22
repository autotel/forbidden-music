export default function isDev() {
    return process.env.NODE_ENV === "development";
}
export function ifDev(callback: () => void) {
    if (isDev()) {
        callback();
    }
    return {
        else: (callback: () => void) => {
            if (!isDev()) {
                callback();
            }
        },
        elseLog: (message: string) => {
            if (!isDev()) {
                console.log(message);
            }
        }
    }
}

export function devLog(...args: any[]) {
    if (isDev()) {
        console.log(...args);
    }
}
export function devWarn(...args: any[]) {
    if (isDev()) {
        console.warn(...args);
    }
}