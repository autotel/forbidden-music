import { ScreenCoord } from "./ScreenCoord";

export default interface Draggable {
    dragStarted?: { x: number; y: number };
}

export const dragStart = (draggable: Draggable, { x, y }: ScreenCoord): Draggable => {
    draggable.dragStarted = { x, y };
    return draggable;
}

export const dragEnd = (draggable: Draggable): Draggable => {
    delete draggable.dragStarted;
    return draggable;
}

export const dragDelta = (draggable: Draggable, { x, y }: ScreenCoord): ScreenCoord => {
    if (!draggable.dragStarted) {
        return { x: 0, y: 0 };
    }
    return { x: x - draggable.dragStarted.x, y: y - draggable.dragStarted.y };
}

