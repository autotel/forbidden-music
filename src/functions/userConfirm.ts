/**
 * set callbacks for accept or cancel user confirm
 * and then ask user for confirm
 */
export const userConfirm = (message: string) => {
    let acceptCallback = () => { }
    let cancelCallback = () => { }
    let promptImmediate: ReturnType<typeof setTimeout> | false = false;

    const prompt = async () => {
        const answer = confirm(message)
        if (answer) {
            acceptCallback()
        } else {
            cancelCallback()
        }
    }

    const schedulePromt = () => {
        if(promptImmediate) {
            return;
        }
        promptImmediate = setTimeout(() => {
            prompt()
        }, 0);
    }

    return {
        accepted: (callback: () => void) => {
            acceptCallback = callback;
            schedulePromt();
        },
        cancelled: (callback: () => void) => {
            cancelCallback = callback;
            schedulePromt();
        },
    }
}