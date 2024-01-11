# Automation point

A point in the timeline that determines the animation of a sound parameter. While playing, the playback store selects the upcoming points in the timeline, and schedules a parameter change animation providing the the time to the point, and the value.

Automation points extend [Trace](./Trace.md), [Selectable](./Selectable.md) and [Draggable](./Draggable.md).

Usage of automation points in playback loop, on the playback store.

``` typescript
getAutomationsForTime(scoreTimeFrameStart, scoreTimeFrameEnd, catchUp)
    .forEach((automation) => {
        const { param, point } = automation;
        // Map the automation point values (0 to 1) into the range of the parameter
        const mappedValue = automationRangeToParamRange(point.value, {
            min: param.min, max: param.max
        })
        let eventStartAbsolute = tickTime + musicalTimeToWebAudioTime(point.time - scoreTimeFrameStart);
        if (eventStartAbsolute < 0) {
            eventStartAbsolute = 0;
        }
        try {
            param.animate?.(mappedValue, eventStartAbsolute);
        } catch (e) {
            console.error("could not schedule event", point, e);
        }
    });

```

## Automation point manipulation functions

### AutomationPoint

Creates an automation point, or in other words, converts an automation point definition into an automation point. It can also be used to clone an automation point

``` typescript
const point = automationPoint({
    time: 1,
    value: 0.5,
    layer: 0
})
```

### AutomationPointDef

Creates an automation point definition.

``` typescript
const def = automationPointDef(point)
```

### Range conversion

The automation point value is a number between 0 and 1, but the parameters which are controlled by said point might have a different range. The following functions can be used to convert between the two ranges.

``` typescript
type MinMax = { max: number, min: number }

paramRangeToAutomationRange(value: number, paramRange: MinMax): number
automationRangeToParamRange(value: number, paramRange: MinMax): number
```

Note that some SynthParams are compatible replacement of MinMax interface. From `SynthInterface.ts`:

``` typescript
interface NumberSynthParam extends SynthParamMinimum<number> {
    type: ParamType.number,
    value: number,
    displayName: string,
    min: number,
    max: number,
    default?: number,
    schedule?: (destTime: number, destValue: number) => void,
    animate?: (destTime: number, destValue: number) => void,
    curve?: 'linear' | 'log',
}
```