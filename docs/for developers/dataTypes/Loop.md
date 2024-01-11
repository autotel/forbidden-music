# Loop

Definition of a time period in the timeline which should be repeated *n* times.

Extends [Trace](./Trace.md), [Selectable](./Selectable.md) and [Draggable](./Draggable.md).

## Creating a loop 

Example 1: Create a loop of unspecified (infinite) repetitions

```typescript
const loop = loop({
    time: 1,
    timeEnd: 3,
})
```

Example 2: Create a loop that repeats twice

```typescript
const loop = loop({
    time: 1,
    duration: 2;
    count: 2;
})
```

