
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

        // Use setTimeout as fallback if rAF doesn't fire (common in test environments)
        let lastStepTime = startTime;
        let rafFired = false;

        const step = () => {
            rafFired = true;
            const now = Date.now();
            const value = start + range * ((now - startTime) / duration);
            if (now < endTime) {
                callback(value);
                lastStepTime = now;
                requestAnimationFrame(step);

                // Safety: if rAF doesn't fire within 32ms, use setTimeout instead
                setTimeout(() => {
                    if (Date.now() - lastStepTime > 32 && now < endTime) {
                        step();
                    }
                }, 32);
            } else {
                callback(end);
                resolve(null);
            }
        };

        step();

        // Fallback: if rAF never fires, use setTimeout-based animation
        setTimeout(() => {
            if (!rafFired) {
                const intervalId = setInterval(() => {
                    const now = Date.now();
                    const value = start + range * ((now - startTime) / duration);
                    if (now < endTime) {
                        callback(value);
                    } else {
                        callback(end);
                        clearInterval(intervalId);
                        resolve(null);
                    }
                }, 16);
            }
        }, 50);
    });
}

type MouseEventName = "mousemove" | "mousedown" | "mouseup" | "click" | "mouseenter" | "mouseleave" | "mouseover" | "mouseout";

function evt(target: HTMLElement, name: MouseEventName, { x, y }: { x: number, y: number }) {
    const evt = new MouseEvent(name, {
        clientX: x,
        clientY: y,

        bubbles: true,
    });
    target.dispatchEvent(evt);
}

function mouseEntered(target: Element, { x, y }: { x: number, y: number }) {
    /**
     * 
            evt(target,'mousemove',x,y)
            evt(target,'mouseover',x,y)
            evt(target,'mouseenter',x,y)
     */
    evt(target as HTMLElement, "mousemove", { x, y });
    evt(target as HTMLElement, "mouseover", { x, y });
    evt(target as HTMLElement, "mouseenter", { x, y });
}
function mouseLeft(target: Element, { x, y }: { x: number, y: number }) {
    evt(target as HTMLElement, "mouseout", { x, y });
    evt(target as HTMLElement, "mouseleave", { x, y });
}

export class RoboMouse {
    currentPosition = { x: 0, y: 0 };
    lastEnteredElement: Element | null = null;
    eventTarget: HTMLElement | null = null;
    inTween = false;
    displayIcon: HTMLElement;
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

        if (!this.eventTarget) throw new Error("eventTarget is " + this.eventTarget);

        if(to.x > this.eventTarget.clientWidth || to.y > this.eventTarget.clientHeight) {
            console.warn("mouse target coordinates are outside of eventTarget");
        }

        const tween = tweener(0, 1, duration, (value) => {

            if (!this.eventTarget) throw new Error("eventTarget is " + this.eventTarget);

            const x = from.x + (range.x * value);
            const y = from.y + (range.y * value);
            Object.assign(this.currentPosition, { x, y });

            const hoveredElement = document.elementFromPoint(x, y);

            evt(this.eventTarget, "mousemove", { x, y });
            this.displayIcon.style.left = x + "px";
            this.displayIcon.style.top = y + "px";

            if (hoveredElement !== this.lastEnteredElement) {
                // console.log("entering", hoveredElement, "leaving", this.lastEnteredElement);
                this.lastEnteredElement ? mouseLeft(this.lastEnteredElement, { x, y }) : null;
                hoveredElement ? mouseEntered(hoveredElement, { x, y }) : null;
                this.lastEnteredElement = hoveredElement;
            }

        });

        const cleanup = () => {
            this.inTween = false;
        };

        tween.then(cleanup).catch(cleanup);

        // Safety timeout: ensure inTween gets reset even if requestAnimationFrame fails
        setTimeout(cleanup, duration + 100);

        return tween;
    }
    mousedown = () => {
        if (!this.eventTarget) throw new Error("eventTarget is " + this.eventTarget);

        evt(this.eventTarget, "mousedown", this.currentPosition);
    }
    mouseup = () => {
        if (!this.eventTarget) throw new Error("eventTarget is " + this.eventTarget);

        evt(this.eventTarget, "mouseup", this.currentPosition);
    }
    click = () => {
        if (!this.eventTarget) throw new Error("eventTarget is " + this.eventTarget);
        evt(this.eventTarget, "mousedown", this.currentPosition);
        evt(this.eventTarget, "mouseup", this.currentPosition);
        evt(this.eventTarget, "click", this.currentPosition);
    }
    constructor() {
        this.displayIcon = document.createElement("div");
        this.displayIcon.style.position = "fixed";
        this.displayIcon.style.width = "10px";
        this.displayIcon.style.height = "10px";
        this.displayIcon.style.backgroundColor = "white";
        this.displayIcon.style.borderTop = "1px solid black";
        this.displayIcon.style.borderLeft = "1px solid black";
        this.displayIcon.style.zIndex = "9";
        this.displayIcon.style.pointerEvents = "none";
        document.body.appendChild(this.displayIcon);
    }
}

export const wait = (time: number) => {
    return new Promise<void>((resolve) => {
        setTimeout(() => {
            resolve();
        }, time);
    });
}