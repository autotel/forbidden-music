# Draggables

Elements which can be dragged in the screen. A Draggable might be [Selectable](./Selectable.md) too.

``` typescript
export default interface Draggable {
    dragStarted?: { x: number; y: number };
}
``` 
## Draggable manipulation functions

### DragStart

Registers a drag start. Position is stored in the object, so that it can be used later to calculate the distance from the mouse, and thus apply the relative movement.

The presence of the dragStarted property can be used as a flag to determine whether a draggable is being dragged.

``` typescript
export const dragStart = (draggable: Draggable, { x, y }: ScreenCoord): Draggable => {
    draggable.dragStarted = { x, y };
    return draggable;
}
``` 

### DragEnd

Deletes the drag start position.

``` typescript
export const dragEnd = (draggable: Draggable): Draggable => {
    delete draggable.dragStarted;
    return draggable;
}
``` 

### DragDelta

Calculates the distance from the drag start position and the provided coordinates.

``` typescript
export const dragDelta = (draggable: Draggable, { x, y }: ScreenCoord): ScreenCoord => {
    if (!draggable.dragStarted) {
        return { x: 0, y: 0 };
    }
    return { x: x - draggable.dragStarted.x, y: y - draggable.dragStarted.y };
}
``` 
