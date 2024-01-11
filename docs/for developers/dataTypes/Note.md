# Note

Definition of a time period in the timeline which should be repeated *n* times.

Extends [Trace](./Trace.md), [Selectable](./Selectable.md) and [Draggable](./Draggable.md).

## Creating a note 

Example 1: Create a note of unspecified (infinite) repetitions

```typescript
const note = note({
    time: 1,
    timeEnd: 3,
})
```

Example 2: Create a note that repeats twice

```typescript
const note = note({
    time: 1,
    duration: 2;
    count: 2;
})
```

## Converting from and to note definition

A note definition is a json-serializable json object. The differences between notedefinition and note are these:

* Notes are stored in the project score, and operate as the 'living' notes. Note definitions are intended for storing and loading.
* A note definition can take few different shapes; for example a note definition can either define octave or frequency, but a note strictly defines octave.
* Note can be provided as argument to note-manipulation functions across this program, whereas note definitions might be incompatible

Example of casting to note definition
    
```typescript
const def = noteDef(note)
```

Example of converting a note definition to note

```typescript
const note = note({
    time: 1,
    duration: 2;
    octave: 4;
})
```

Example of converting note to JSON and back
    
```typescript
const note = note({
    time: 1,
    duration: 2;
    octave: 4;
})

const string = JSON.stringify(
    noteDef(note)
)

const note2 = note(
    JSON.parse(string)
)
```

### Possible definition parameters

* time: number *mandatory*
* duration or timeEnd: *mandatory, but you need to provide only one of the two*
* octave or frequency: *mandatory, but you need to provide only one of the two*
* velocity: number *optional*
* mute: boolean *optional*
* layer: number *optional*

```typescript
interface timeDefA {
  time: number;
  duration: number;
}

interface timeDefB {
  time: number;
  timeEnd: number;
}

interface toneDefA {
  octave: number;
}

interface toneDefB {
  frequency: number;
}

interface othersDef {
  velocity?: number;
  mute?: boolean;
  layer?: number;
}

export type NoteDef = othersDef & (timeDefA | timeDefB) & (toneDefA | toneDefB);

```