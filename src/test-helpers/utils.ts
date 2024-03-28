
export const tweener = (
    start: number, end: number, duration: number, callback: (value: number) => void
) => {
    return new Promise((resolve) => {
        if (duration === 0) {
            callback(end);
            resolve(null);
            return;
        }
        const startTime = Date.now();
        const endTime = startTime + duration;
        const range = end - start;
        const step = () => {
            const now = Date.now();
            const value = start + range * ((now - startTime) / duration);
            if (now < endTime) {
                callback(value);
                requestAnimationFrame(step);
            } else {
                callback(end);
                resolve(null);
            }
        };
        step();
    });
}

export class RoboMouse {
    currentPosition = { x: 0, y: 0 };
    eventTarget: HTMLElement;
    inTween = false;
    moveTo = (
        to: { x: number, y: number },
        duration: number
    ) => {
        if (this.inTween) throw new Error("already in tween");
        this.inTween = true;
        const from = { ...this.currentPosition }
        const range = {
            x: to.x - from.x,
            y: to.y - from.y
        };

        const tween = tweener(0, 1, duration, (value) => {
            const x = from.x + (range.x * value);
            const y = from.y + (range.y * value);
            Object.assign(this.currentPosition, { x, y });
            this.eventTarget.dispatchEvent(new MouseEvent("mousemove", {
                clientX: x,
                clientY: y,
                bubbles: true,
            }));
        });
        tween.then(() => {
            this.inTween = false;
        })
        return tween;
    }
    mousedown = () => {
        this.eventTarget.dispatchEvent(new MouseEvent("mousedown", {
            clientX: this.currentPosition.x,
            clientY: this.currentPosition.y,
            bubbles: true,
        }));
    }
    mouseup = () => {
        this.eventTarget.dispatchEvent(new MouseEvent("mouseup", {
            clientX: this.currentPosition.x,
            clientY: this.currentPosition.y,
            bubbles: true,
        }));
    }
    constructor(eventTarget: HTMLElement) {
        this.eventTarget = eventTarget;
    }
}

export const wait = (time: number) => {
    return new Promise<void>((resolve) => {
        setTimeout(() => {
            resolve();
        }, time);
    });
}