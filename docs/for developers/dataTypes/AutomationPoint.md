# Automation point

A point in the timeline that determines the animation of a sound parameter. While playing, the playback store selects the upcoming points in the timeline, and schedules a parameter change animation providing the the time to the point, and the value.

Automation points extend [Trace](./Trace.md), [Selectable](./Selectable.md) and [Draggable](./Draggable.md).

Usage of automation points in playback loop, on the playback store.

``` typescript
const automationsInTime = automation.getAutomationsForTime(scoreTimeFrameStart, scoreTimeFrameEnd, catchUp);
for(let [lane, contents] of automationsInTime){
    const param = lane.targetParameter;
    if (!param) continue;
    for(let point of contents){
        const mappedValue = automationRangeToParamRange(point.value, {
            min: param.min, max: param.max
        });
        let animationEndAbsolute = tickTime + musicalTimeToWebAudioTime(point.time - scoreTimeFrameStart);
        // only if my new point happens later than the last scheduled
        if ((param.currentTween?.timeEnd || 0) < animationEndAbsolute) {
            addAutomationDestinationPoint(param, animationEndAbsolute, mappedValue);
        }
    }
}
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

Note that some SynthParams are compatible replacement of MinMax interface. From `SynthBase.ts`:

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