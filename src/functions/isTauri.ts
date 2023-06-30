export default function isTauri() {
    // @ts-ignore
    return window.__TAURI__;
}
export function ifTauri(callback: () => void) {
    if (isTauri()) {
        callback();
    }
    return {
        else: (callback: () => void) => {
            if (!isTauri()) {
                callback();
            }
        },
        elseLog: (message: string) => {
            if (!isTauri()) {
                console.log(message);
            }
        }
    }
}