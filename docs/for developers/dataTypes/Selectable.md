# Selectable

Simple interface that defines a selectable element. It introduces a `selected` property.

```typescript
export default interface Selectable {
    selected?: true;
}

export const setSelection = (
    sl: Selectable,
    selected: boolean
): Selectable => {
    if (selected) {
        sl.selected = true;
    } else {
        delete sl.selected;
    }
    return sl;
}
```