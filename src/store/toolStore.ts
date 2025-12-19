import { clamp, useThrottleFn } from '@vueuse/core';
import { defineStore, Store } from 'pinia';
import { computed, reactive, ref, watch } from 'vue';
import { AutomationLane } from '../dataTypes/AutomationLane';
import { AutomationPoint, automationPoint } from '../dataTypes/AutomationPoint';
import { dragEnd, dragStart } from '../dataTypes/Draggable';
import { Loop, loop } from '../dataTypes/Loop';
import { Note, note } from '../dataTypes/Note';
import { ScreenCoord } from '../dataTypes/ScreenCoord';
import { OctaveRange, TimeRange, VelocityRange, getDuration, sanitizeTimeRanges } from '../dataTypes/TimelineItem';
import { Tool } from '../dataTypes/Tool';
import { Trace, TraceType, cloneTrace, traceTypeSafetyCheck } from '../dataTypes/Trace';
import { useAutomationLaneStore } from './automationLanesStore';
import { useProjectStore } from './projectStore';
import { SelectableRange, useSelectStore } from './selectStore';
import { useSnapStore } from './snapStore';
import { useViewStore } from './viewStore';
import { findTraceInRange, getTracesInRange } from '@/functions/getEventsInRange';
import { useLoopsStore } from './loopsStore';
import { useNotesStore } from './notesStore';
import { useLayerStore } from './layerStore';

type SnapStore = ReturnType<typeof useSnapStore>;
type ViewStore = ReturnType<typeof useViewStore>;
type ProjectStore = ReturnType<typeof useProjectStore>;
type NotesStore = ReturnType<typeof useNotesStore>;
type SelectStore = ReturnType<typeof useSelectStore>;
type AutomationLaneStore = ReturnType<typeof useAutomationLaneStore>;
type LayersStore = ReturnType<typeof useLayerStore>;
type Reference<T> = { value: T };

type PolyfillTrace = (OctaveRange & VelocityRange & TimeRange) & (Trace) & { duration: number };

interface ToolMouse {
    drag?: {
        start: {
            x: number,
            y: number,
        },
        delta: {
            x: number,
            y: number,
        },
        alreadyDuplicated: boolean,
        isLeftEdge: boolean,
        isRightEdge: boolean,
        traces: Trace[],
        /** Maybe could be removed */
        trace: Trace | false,
        tracesWhenDragStarted: PolyfillTrace[],
        traceWhenDragStarted: PolyfillTrace | false,
    },
    disallowOctaveChange: boolean,
    disallowTimeChange: boolean,
    hovered?: {
        trace?: Trace,
        traceRightEdge?: Trace,
        traceLeftEdge?: Trace,
    },
    tracesBeingCreated: Trace[],
    pos: {
        x: number,
        y: number,
    },
    currentAction: MouseDownActions,
}

interface Stores {
    project: ProjectStore,
    notes: NotesStore,
    snap: SnapStore,
    view: ViewStore,
    selection: SelectStore,
    lanes: AutomationLaneStore,
    layers: LayersStore,
}

const polyfillTrace = (trace: Trace): PolyfillTrace => {
    return Object.assign({
        octave: 0,
        octaveEnd: 0,
        time: 0,
        timeEnd: 0,
        velocity: 0,
        velocityEnd: 0,
        duration: getDuration(trace),
    }, trace);
}

const mouseDuplicateTraces = ({
    drag,
}: ToolMouse, {
    snap, project, selection,
}: Stores
) => {
    if (!drag) throw new Error('misused drag handler');
    if (Math.abs(drag.delta.x) > 30 || Math.abs(drag.delta.y) > 30) {
        snap.resetSnapExplanation();
        drag.alreadyDuplicated = true;
        const prevDraggableTraces = drag.traces;
        const cloned: Trace[] = [];

        prevDraggableTraces.forEach(trace => {
            const newTrace = cloneTrace(trace);
            cloned.push(newTrace);
            dragStart(newTrace, drag.start);
        });

        if (!drag.trace) throw new Error('no drag.trace');
        project.append(...cloned);
        selection.select(...cloned);
        drag.traceWhenDragStarted = polyfillTrace(drag.trace);
        drag.tracesWhenDragStarted = cloned.map(polyfillTrace);
        drag.traces = [...cloned];
        drag.trace = cloned[0];
        snap.focusedTrace = drag.trace;
    }
    // refresh = true;
}

const mouseDragSelectedTraces = ({
    drag, disallowOctaveChange, disallowTimeChange
}: ToolMouse, {
    view, snap, notes, lanes, layers
}: Stores) => {
    if (!drag) throw new Error('misused drag handler');
    if (!drag.traceWhenDragStarted) throw new Error('no drag.traceWhenDragStarted');

    snap.resetSnapExplanation();

    const octaveDragDelta = view.pxToOctave(drag.delta.y);
    const timeDragDelta = view.pxToTime(drag.delta.x);
    const octaveWhenDragStarted = 'octave' in drag.traceWhenDragStarted ? drag.traceWhenDragStarted.octave : 0;
    const preSnapDragTrace = cloneTrace(drag.traceWhenDragStarted);

    preSnapDragTrace.octave = octaveWhenDragStarted + octaveDragDelta;
    preSnapDragTrace.time = drag.traceWhenDragStarted.time + timeDragDelta;
    preSnapDragTrace.timeEnd = drag.traceWhenDragStarted.timeEnd + timeDragDelta;

    const snappedTrace = snap.snapIfSnappable(
        preSnapDragTrace,
        notes.list.filter(n => {
            let ret = n !== drag.trace
            ret &&= !drag.traces.includes(n);
            return ret;
        }),
        true)
    const timeDeltaAfterSnap = snappedTrace.time - drag.traceWhenDragStarted.time;

    let octaveDeltaAfterSnap = 0;
    if ('octave' in snappedTrace) {
        octaveDeltaAfterSnap = snappedTrace.octave - octaveWhenDragStarted
    }
    drag.traces.map((draggedTrace, index) => {
        if(layers.isTraceLocked(draggedTrace)) return;

        const correlativeDragStartClone = drag.tracesWhenDragStarted[index];
        if (!correlativeDragStartClone) throw new Error('no correlativeDragStartClone');

        if (!disallowTimeChange) {
            draggedTrace.time = timeDeltaAfterSnap + correlativeDragStartClone.time;
        }

        if ('timeEnd' in draggedTrace) {
            draggedTrace.timeEnd = timeDeltaAfterSnap + correlativeDragStartClone.timeEnd;
        }

        if ('octave' in draggedTrace && (!disallowOctaveChange)) {
            if (!('octave' in correlativeDragStartClone)) throw new Error('no octave in correlativeDragStartClone');
            draggedTrace.octave = octaveDeltaAfterSnap + correlativeDragStartClone.octave;
        }

    });
}


const mouseDragModulationSelectedTraces = (
    { drag }: ToolMouse,
    { view, layers }: Stores,
    /** provide this reference in order to set de initial velocity for new traces */
    lastVelocitySet: Reference<number> = { value: 0 }
) => {
    if (!drag) throw new Error('misused drag handler');
    if (!drag.traceWhenDragStarted) return;
    // negative y bc. inverted by offset, but in this case we don't want the offset amt, only sign
    const velocityDelta = view.pxToVelocity(-drag.delta.y);
    drag.traces.forEach((trace, index) => {
        if(layers.isTraceLocked(trace)) return;
        if (trace.type !== TraceType.Note) return;
        const traceWhenDragStarted = drag.tracesWhenDragStarted[index];
        if (!traceWhenDragStarted) throw new Error('no traceWhenDragStarted');
        if (!('velocity' in traceWhenDragStarted)) throw new Error('no traceWhenDragStarted.velocity');
        const velocityWhenDragStarted = traceWhenDragStarted.velocity;
        trace.velocity = clamp(velocityWhenDragStarted + velocityDelta, 0, 1);
        lastVelocitySet.value = trace.velocity;
    });
}


const mouseDragAutomationSelectedTraces = (
    { drag }: ToolMouse,
    { view, snap, project, lanes }: Stores,
) => {
    if (!drag) throw new Error('misused drag handler');
    if (!drag.traceWhenDragStarted) return;

    const valueDelta = view.pxToValue(-drag.delta.y);
    const timeDelta = view.pxToTime(drag.delta.x);

    drag.traces.forEach((trace, index) => {
        if (trace.type !== TraceType.AutomationPoint) return;
        const traceWhenDragStarted = drag.tracesWhenDragStarted[index];
        if (!traceWhenDragStarted) throw new Error('no traceWhenDragStarted');
        if (!('value' in traceWhenDragStarted)) throw new Error('no traceWhenDragStarted.value');
        const valueWhenDragStarted = traceWhenDragStarted.value;
        trace.value = valueWhenDragStarted + valueDelta;
        trace.time = traceWhenDragStarted.time + timeDelta;

        if (trace.prev?.time && trace.prev?.time > trace.time) {
            trace.time = trace.prev.time;
            // trace.prev.time = trace.time;
        }
        if (trace.next?.time && trace.next?.time < trace.time) {
            trace.time = trace.next.time;
            // trace.next.time = trace.time;
        }

    });
}
const mouseDragTracesRightEdge = ({ drag }: ToolMouse, { view, snap, notes, selection, layers }: Stores) => {
    if (!drag) throw new Error('misused drag handler');
    if (!drag.trace) throw new Error('no drag.trace');
    if (!('timeEnd' in drag.trace)) return;

    const traceWithTimeEnd = drag.trace as Trace & TimeRange;
    snap.resetSnapExplanation();

    if (!drag.traceWhenDragStarted) throw new Error('no drag.traceWhenDragStarted');
    const timeMovement = view.pxToTime(drag.delta.x);
    traceWithTimeEnd.timeEnd = drag.traceWhenDragStarted.timeEnd + timeMovement;
    const snapped = snap.snapIfSnappable(
        traceWithTimeEnd,
        notes.list,
        true,
    );

    const durationAfterSnap = getDuration(snapped);
    drag.trace.timeEnd = drag.trace.time + durationAfterSnap;
    const durationDeltaAfterSnap = durationAfterSnap - drag.traceWhenDragStarted.duration;

    const selectedTraces = selection.getTraces();
    selectedTraces.forEach((trace, index) => {
        if(layers.isTraceLocked(trace)) return;
        if (!('timeEnd' in trace)) return;
        const correlativeDragStartClone = drag.tracesWhenDragStarted[index];
        if (trace === drag.trace) return;
        trace.timeEnd = correlativeDragStartClone.timeEnd + durationDeltaAfterSnap;
    });
    const selectedTimeRanges = selectedTraces.filter((t) => 'timeEnd' in t) as TimeRange[];
    sanitizeTimeRanges(...selectedTimeRanges);
}
const mouseDragTracesLeftEdge = ({ drag }: ToolMouse, { view, snap, notes, selection }: Stores) => {
    if (!drag) throw new Error('misused drag handler');
    if (!drag.trace) throw new Error('no drag.trace');
    if (!('timeEnd' in drag.trace)) return;

    const traceWithTimeEnd = drag.trace as Trace & TimeRange;
    snap.resetSnapExplanation();

    if (!drag.traceWhenDragStarted) throw new Error('no drag.traceWhenDragStarted');
    const timeMovement = view.pxToTime(drag.delta.x);

    traceWithTimeEnd.timeEnd = drag.traceWhenDragStarted.timeEnd;
    traceWithTimeEnd.time = drag.traceWhenDragStarted.time + timeMovement;

    const snapped = snap.snapIfSnappable(
        traceWithTimeEnd,
        notes.list,
        true,
    );
    const timeAfterSnap = snapped.time;
    const afterSnapTimeChange = timeAfterSnap - drag.traceWhenDragStarted.time;
    drag.trace.time = timeAfterSnap;

    const selectedTraces = selection.getTraces();
    selectedTraces.forEach((trace, index) => {
        // no trace whose left edge is draggable could be part of a lockable layer
        const correlativeDragStartClone = drag.tracesWhenDragStarted[index];
        if (trace === drag.trace) return;
        trace.time = correlativeDragStartClone.time + afterSnapTimeChange;
    });
    const selectedTimeRanges = selectedTraces.filter((t) => 'timeEnd' in t) as TimeRange[];
    sanitizeTimeRanges(...selectedTimeRanges);
}
const mouseErase = ({ pos }: ToolMouse, { view, notes, layers }: Stores) => {
    const pxRange = 5;
    const time = view.pxToTimeWithOffset(pos.x - pxRange);
    const timeEnd = view.pxToTimeWithOffset(pos.x + pxRange);
    const octave = view.pxToOctaveWithOffset(pos.y + pxRange);
    const octaveEnd = view.pxToOctaveWithOffset(pos.y - pxRange);
    const visibleTraces = view.visibleNotes;
    const note = findTraceInRange<Note>(visibleTraces, {
        time, timeEnd, octave, octaveEnd
    });

    if (note) {
        if(layers.isTraceLocked(note)) return;
        note.velocity -= 0.05;
        if (note.velocity <= 0) {
            const projectNoteIndex = note ? notes.list.indexOf(note) : -1;
            if (projectNoteIndex !== -1) {
                console.log("erase note", note);
                notes.list.splice(projectNoteIndex, 1);
            }
        }
    }
}
export enum MouseDownActions {
    None,
    AddToSelection,
    SetSelection,
    RemoveFromSelection,
    AddToSelectionAndDrag,
    SetSelectionAndDrag,
    RemoveFromSelectionAndDrag,
    CreateNote,
    CreateLoop,
    CreateAutomationPoint,
    LengthenTrace,
    LengthenAndMoveTrace,
    DragNoteVelocity,
    CopyNote,
    AreaSelectNotes,
    AdditiveAreaSelectNotes,
    MoveTraces,
    LengthenItem,
    MoveItem,
    Erase,
}

// maybe doesn't need to be a store, but something else
export const useToolStore = defineStore("tool", () => {
    // hmm.. I might be not so good at choosing where stuff goes..
    const selection = useSelectStore();
    const view = useViewStore();
    const project = useProjectStore();
    const notes = useNotesStore(); const snap = useSnapStore();
    const lanes = useAutomationLaneStore();
    const layers = useLayerStore();
    const ftRec = ref(false);
    const loops = useLoopsStore();
    // TODO: should rename into currentMode and currentTool instead of current and currentLeftHand
    /** current tool: the current main tool, what the user is focusing on atm */
    const current = ref(Tool.Edit);
    /** tool that might have been activated temporarily by holding a key */
    const currentLeftHand = ref(Tool.None);
    const simplify = ref(0.1);
    const copyOnDrag = ref(false);
    // TODO: rename to velocityForNewNotes
    /** Last velocity set, which is used as velocity on new notes (makes things easier in general) */
    let lastVelocitySet = { value: 0.7 };
    type ToolRange = SelectableRange & OctaveRange & TimeRange & { active: boolean };
    const currentLayerNumber = ref(0);

    /** which parameter is currenly being shown on screen for automation */
    const laneBeingEdited = ref<AutomationLane | undefined>(undefined);

    const selectRange = ref<ToolRange>({
        time: 0,
        timeEnd: 0,
        octave: 0,
        octaveEnd: 0,
        active: false
    });

    const showReferenceKeyboard = ref(false)
    const currentMouseStringHelper = ref("");


    // TODO: add a enum to select different abstractions of tone.
    // so, if using 12 tet, the text in the note is going to be semitones
    // if even hz, it displays hz, if log, it displays octaves
    // and if rational hz, it would display hz and relationships
    // etc..
    // const notesBeingCreated = ref<Array<Note>>([]);
    // const loopsBeingCreated = ref<Array<Loop>>([]);

    const noteThatWouldBeCreated = ref<Note | false>(false);
    const loopThatWouldBeCreated = ref<Loop | false>(false);
    const automationPointThatWouldBeCreated = ref<AutomationPoint | false>(false);

    let erasing = false;

    let mouse: ToolMouse = reactive({
        tracesBeingCreated: [] as Trace[],
        currentAction: MouseDownActions.None,
        disallowOctaveChange: false,
        disallowTimeChange: false,
        pos: {
            x: 0,
            y: 0,
        },
    });

    const registerDragStart = (coords: ScreenCoord) => {
        const mouseAction = whatWouldMouseDownDo();
        mouse.currentAction = mouseAction;

        let traceWhenDragStarted = false as PolyfillTrace | false;
        let trace = false as Trace | false;
        let isRightEdge = false;
        let isLeftEdge = false;

        if (mouse.hovered?.traceRightEdge) {
            trace = mouse.hovered?.traceRightEdge;
            isRightEdge = true;
        } else if (mouse.hovered?.traceLeftEdge) {
            trace = mouse.hovered?.traceLeftEdge;
            isLeftEdge = true;
        } else if (mouse.hovered?.trace) {
            trace = mouse.hovered?.trace;
        }

        if (trace) {
            traceTypeSafetyCheck(trace);
            traceWhenDragStarted = polyfillTrace(trace);
        }

        mouse.drag = {
            start: coords,
            delta: {
                x: 0,
                y: 0,
            },
            isRightEdge,
            isLeftEdge,
            traces: selection.getTraces(),
            trace,
            traceWhenDragStarted,
            tracesWhenDragStarted: selection.getTraces().map(polyfillTrace),
            alreadyDuplicated: false,
        };
        // TODO: maybe unnecessary
        mouse.drag.traces.forEach(trace => {
            dragStart(trace, coords);
        });
    }


    const registerMouseMove = (pos: ScreenCoord) => {
        mouse.pos = pos;
        if (mouse.drag) {
            mouse.drag.delta = {
                x: pos.x - mouse.drag.start.x,
                y: pos.y - mouse.drag.start.y,
            }
        }
    }

    const cursor = computed(() => {
        let mouseDo = mouse.currentAction ? mouse.currentAction : whatWouldMouseDownDo();
        switch (mouseDo) {
            case MouseDownActions.LengthenTrace:
            case MouseDownActions.LengthenItem:
                return 'cursor-note-length';
            case MouseDownActions.AddToSelection:
            case MouseDownActions.SetSelection:
            case MouseDownActions.SetSelectionAndDrag:
            case MouseDownActions.RemoveFromSelectionAndDrag:
            case MouseDownActions.MoveTraces:
            case MouseDownActions.MoveItem: {
                if (mouse.drag && mouse.drag.trace) {
                    return 'cursor-grabbing';
                } else {
                    return 'cursor-grab';
                }
            }
            case MouseDownActions.AreaSelectNotes:
            case MouseDownActions.AdditiveAreaSelectNotes:
                return 'cursor-area-select';
            case MouseDownActions.Erase:
                return 'cursor-eraser';
            case MouseDownActions.CreateNote:
            case MouseDownActions.CreateAutomationPoint:
            case MouseDownActions.CreateLoop:
            default:
                return 'cursor-draw';
        }
    });

    const timelineItemMouseEnter = (trace: Trace) => {
        traceTypeSafetyCheck(trace);
        loopThatWouldBeCreated.value = false;
        noteThatWouldBeCreated.value = false;
        automationPointThatWouldBeCreated.value = false;
        mouse.hovered = {
            trace: trace,
        }
    }

    const timelineItemRightEdgeMouseEnter = (trace: Trace) => {
        // unhover all other but don't unhover item body
        loopThatWouldBeCreated.value = false;
        noteThatWouldBeCreated.value = false;
        mouse.hovered = {
            trace: trace,
            traceRightEdge: trace
        }
    }

    const timelineItemLeftEdgeMouseEnter = (trace: Trace) => {
        // unhover all other but don't unhover item body
        loopThatWouldBeCreated.value = false;
        noteThatWouldBeCreated.value = false;
        mouse.hovered = {
            trace: trace,
            traceLeftEdge: trace
        }
    }

    const timelineItemMouseLeave = () => {
        if (!mouse.hovered) return;
        if (!mouse.hovered.traceRightEdge) {
            delete mouse.hovered;
        } else if (!mouse.hovered.traceLeftEdge) {
            delete mouse.hovered;
        } else {
            delete mouse.hovered.trace;
        }
    }

    const timelineItemRightEdgeMouseLeave = () => {
        if (!mouse.hovered) return;
        if (mouse.hovered.trace) {
            timelineItemMouseEnter(mouse.hovered.trace);
        }
        delete mouse.hovered.traceRightEdge;
    }
    const timelineItemLeftEdgeMouseLeave = () => {
        if (!mouse.hovered) return;
        if (mouse.hovered.trace) {
            timelineItemMouseEnter(mouse.hovered.trace);
        }
        delete mouse.hovered.traceLeftEdge;
    }

    const whatWouldMouseDownDo = () => {
        let ret = MouseDownActions.None as MouseDownActions;
        currentMouseStringHelper.value = "";

        if (
            current.value === Tool.Select ||
            current.value === Tool.SelectAdditive ||
            currentLeftHand.value === Tool.Select ||
            currentLeftHand.value === Tool.SelectAdditive
        ) {
            if (mouse.hovered?.trace) {
                if (selection.isSelected(mouse.hovered?.trace)) {
                    ret = MouseDownActions.RemoveFromSelection;
                    currentMouseStringHelper.value = "-";
                } else {
                    ret = MouseDownActions.AddToSelection;
                    currentMouseStringHelper.value = "+";
                    if (current.value === Tool.Edit) {
                        ret = MouseDownActions.AddToSelectionAndDrag;
                    }
                }
            } else {
                if (current.value === Tool.SelectAdditive || currentLeftHand.value === Tool.SelectAdditive) {
                    ret = MouseDownActions.AdditiveAreaSelectNotes;
                    currentMouseStringHelper.value = "⃞+";
                } else {
                    ret = MouseDownActions.AreaSelectNotes;
                    currentMouseStringHelper.value = "⃞";
                }
            }
        } else if (current.value === Tool.Eraser) {
            ret = MouseDownActions.Erase;
        } else if (current.value === Tool.Modulation) {
            if (mouse.hovered?.trace) {
                if (selection.isSelected(mouse.hovered.trace)) {
                    ret = MouseDownActions.DragNoteVelocity;
                } else {
                    ret = MouseDownActions.SetSelectionAndDrag;
                }
            }
            currentMouseStringHelper.value = "⇅";
        } else if (
            current.value === Tool.Edit
            || current.value === Tool.Loop
            || current.value === Tool.Automation
        ) {
            if (mouse.hovered?.traceRightEdge) {
                ret = MouseDownActions.LengthenTrace;
                if (selection.selected.size > 1) {
                    currentMouseStringHelper.value = "⟺";
                } else {
                    currentMouseStringHelper.value = "⟷";
                }
            } else if (mouse.hovered?.traceLeftEdge) {
                ret = MouseDownActions.LengthenAndMoveTrace;
                if (selection.selected.size > 1) {
                    currentMouseStringHelper.value = "⟺";
                } else {
                    currentMouseStringHelper.value = "⟷";
                }
            } else if (mouse.hovered?.trace) {
                ret = MouseDownActions.MoveTraces;
                if (selection.isSelected(mouse.hovered?.trace)) {
                    ret = MouseDownActions.MoveTraces;
                } else {
                    ret = MouseDownActions.SetSelectionAndDrag;
                }
            } else if (current.value === Tool.Loop) {
                ret = MouseDownActions.CreateLoop;
            } else if (current.value === Tool.Automation) {
                ret = MouseDownActions.CreateAutomationPoint;
            } else {
                ret = MouseDownActions.CreateNote;
            }
        }
        return ret;
    }

    const resetState = () => {
        delete mouse.drag;
        delete mouse.hovered;
        mouse.tracesBeingCreated = [];
        mouse.currentAction = MouseDownActions.None;
        snap.resetSnapExplanation();
    }

    let dblTapMaxInterval = 300;
    let lastTapTime = 0;

    const touchDown = (touch: { clientX: number, clientY: number }) => {
        const now = Date.now();
        const interval = now - lastTapTime;
        if (whatWouldMouseDownDo() === MouseDownActions.Erase) {
            mouseDown(touch);
        } else if (interval < dblTapMaxInterval) {
            mouseDown(touch);
        }
        lastTapTime = Date.now();
    }

    const touchUp = (touch: { clientX: number, clientY: number }) => {
        mouseUp(touch);
    }

    const touchMove = (touch: { clientX: number, clientY: number }) => {
        mouseMove(touch);
    }

    const mouseDown = (e: { clientX: number, clientY: number }) => {
        registerDragStart({
            x: e.clientX,
            y: e.clientY,
        });
        switch (mouse.currentAction) {
            case MouseDownActions.AreaSelectNotes: {
                selection.clear();
                // No break!
            }
            case MouseDownActions.AdditiveAreaSelectNotes: {
                const x = e.clientX;
                const y = e.clientY;

                const clickTime = view.pxToTimeWithOffset(x);
                const clickOctave = view.pxToOctaveWithOffset(y);

                const zeroedRange = {
                    time: clickTime,
                    timeEnd: clickTime,
                    octave: clickOctave,
                    octaveEnd: clickOctave,
                    active: true,
                } as ToolRange;

                if (current.value === Tool.Modulation) {
                    const clickVelocity = view.pxToVelocityWithOffset(y);
                    Object.assign(zeroedRange, {
                        velocity: clickVelocity,
                        velocityEnd: clickVelocity,
                    });
                }

                selectRange.value = zeroedRange;
                break;
            }
            case MouseDownActions.LengthenItem:
            case MouseDownActions.LengthenTrace:
                if (!mouse.hovered?.traceRightEdge) throw new Error('mouse.hovered is' + mouse.hovered?.traceRightEdge);
                if (!selection.isSelected(mouse.hovered?.traceRightEdge)) {
                    if(layers.isTraceLocked(mouse.hovered.traceRightEdge)) return;
                    selection.select(mouse.hovered?.traceRightEdge);
                }
                break;
            case MouseDownActions.LengthenAndMoveTrace:
                if (!mouse.hovered?.traceLeftEdge) throw new Error('mouse.hovered is' + mouse.hovered?.traceLeftEdge);
                if (!selection.isSelected(mouse.hovered?.traceLeftEdge)) {
                    if(layers.isTraceLocked(mouse.hovered.traceLeftEdge)) return;
                    selection.select(mouse.hovered?.traceLeftEdge);
                }
                break;
            case MouseDownActions.AddToSelection:
                if (!(mouse.hovered?.trace)) throw new Error('no traceBeingHovered');
                selection.add(mouse.hovered?.trace);
                if ('layer' in mouse.hovered?.trace) {
                    currentLayerNumber.value = mouse.hovered?.trace.layer;
                }
                break;
            case MouseDownActions.AddToSelectionAndDrag:
                if (!mouse.hovered?.trace) throw new Error('no traceBeingHovered');
                selection.add(mouse.hovered?.trace);
                if ('layer' in mouse.hovered?.trace) {
                    currentLayerNumber.value = mouse.hovered?.trace.layer;
                }
                break;
            case MouseDownActions.DragNoteVelocity:
            case MouseDownActions.MoveItem:
            case MouseDownActions.MoveTraces:
                if (mouse.drag?.trace) {
                    snap.resetSnapExplanation();
                    snap.focusedTrace = mouse.drag.trace;
                }
                break;
            case MouseDownActions.SetSelectionAndDrag: {
                if (!mouse.drag?.trace) throw new Error('no trace dragged');
                if(layers.isTraceLocked(mouse.drag.trace)) return;
                selection.select(mouse.drag.trace);
                snap.resetSnapExplanation();
                snap.focusedTrace = mouse.drag.trace;

                if (mouse.drag) {
                    mouse.drag.traces = [mouse.drag.trace];
                    mouse.drag.tracesWhenDragStarted = [polyfillTrace(mouse.drag.trace)];
                } else {
                    console.warn("no mouse.drag");
                }
                break;
            }
            case MouseDownActions.RemoveFromSelection:
                if (!mouse.hovered?.trace) throw new Error('no traceBeingHovered');
                selection.remove(mouse.hovered?.trace);
                break;
            case MouseDownActions.CreateLoop: {
                if (!loopThatWouldBeCreated.value) throw new Error('no noteThatWouldBeCreated');
                selection.clear();
                const cloned = cloneTrace(loopThatWouldBeCreated.value);
                mouse.tracesBeingCreated = [cloned];
                if (!mouse.drag) throw new Error('no mouse.drag');
                mouse.drag.trace = cloned;
                mouse.drag.isRightEdge = true;
                break;
            }
            case MouseDownActions.CreateNote: {
                if (!noteThatWouldBeCreated.value) throw new Error('no noteThatWouldBeCreated');
                if(layers.isTraceLocked(noteThatWouldBeCreated.value)) return; // hence not creating on locked layer
                selection.clear();
                const cloned = cloneTrace(noteThatWouldBeCreated.value);
                mouse.tracesBeingCreated = [cloned];
                if (!mouse.drag) throw new Error('no mouse.drag');
                mouse.drag.trace = cloned;
                mouse.drag.isRightEdge = true;
                break;
            }
            case MouseDownActions.CreateAutomationPoint: {
                if (!automationPointThatWouldBeCreated.value) throw new Error('no automationPointThatWouldBeCreated');
                selection.clear();
                laneBeingEdited.value?.content.push(
                    automationPointThatWouldBeCreated.value
                );
                break;
            }
            case MouseDownActions.Erase: {
                console.log("start erasing");
                break;
            }
            default:
                console.log("-?- ", MouseDownActions[mouse.currentAction]);
        }
    }

    const refreshAndApplyRangeSelection = useThrottleFn((e: { clientX: number, clientY: number }) => {
        const x = e.clientX;
        const y = e.clientY;

        selectRange.value.timeEnd = view.pxToTimeWithOffset(x);
        selectRange.value.octaveEnd = view.pxToOctaveWithOffset(y);

        const timesInOrder = [selectRange.value.time, selectRange.value.timeEnd].sort((a, b) => a - b);
        const octavesInOrder = [selectRange.value.octave, selectRange.value.octaveEnd].sort((a, b) => a - b);

        const sortedRange = {
            time: timesInOrder[0],
            timeEnd: timesInOrder[1],
            octave: octavesInOrder[0],
            octaveEnd: octavesInOrder[1],
        } as any;

        if ('velocity' in selectRange.value) {
            selectRange.value.velocityEnd = view.pxToVelocityWithOffset(y);

            const velocitiesInOrder = [
                selectRange.value.velocity,
                selectRange.value.velocityEnd
            ].sort((a, b) => a - b);

            sortedRange.velocity = velocitiesInOrder[0];
            sortedRange.velocityEnd = velocitiesInOrder[1];
        }

        selection.selectRange(
            sortedRange,
            current.value === Tool.Edit || current.value === Tool.Modulation,
            current.value === Tool.Automation,
            current.value === Tool.Edit || current.value === Tool.Loop,
            current.value === Tool.SelectAdditive || currentLeftHand.value === Tool.SelectAdditive
        );
    }, 25);

    /** apply snaps modifying the target loop */
    const applySnapToLoop = (targetLoop: Loop, otherTraces: Trace[]) => {
        const snappedLoop: Loop = snap.snapTimeRange(
            targetLoop,
            notes.list,
            true,
        );
        if (snappedLoop.timeEnd < snappedLoop.time) {
            snappedLoop.timeEnd = snappedLoop.time;
        }

        Object.assign(targetLoop, snappedLoop);
    }

    const updateItemThatWouldBeCreated = (mouse: { x: number, y: number }) => {
        const { x, y } = mouse;
        let keepNote = false;
        let keepLoop = false;
        let keepAutomationPoint = false;

        // if out of view, false
        if (x < 0 || x > view.viewWidthPx || y < 0 || y > view.viewHeightPx) {

        } else if (whatWouldMouseDownDo() === MouseDownActions.CreateNote) {
            const mouseTime = view.pxToTimeWithOffset(x);
            const theNote = note({
                time: mouseTime,
                timeEnd: mouseTime,
                octave: view.pxToOctaveWithOffset(y),
                velocity: lastVelocitySet.value,
                layer: currentLayerNumber.value,
            });
            snap.resetSnapExplanation();

            const snapNote = snap.filteredSnap(
                theNote,
                notes.list,
                true,
            );

            snapNote.timeEnd = snapNote.time;
            snap.focusedTrace = snapNote;

            noteThatWouldBeCreated.value = snapNote;
            keepNote = true;

        } else if (whatWouldMouseDownDo() === MouseDownActions.CreateLoop) {

            const t = view.pxToTimeWithOffset(x);
            if (!loopThatWouldBeCreated.value) {
                loopThatWouldBeCreated.value = loop({ time: 0, timeEnd: 0 });
            }
            loopThatWouldBeCreated.value.time = t;
            loopThatWouldBeCreated.value.timeEnd = t;
            applySnapToLoop(loopThatWouldBeCreated.value, loops.list);

            keepLoop = true;
        } else if (whatWouldMouseDownDo() === MouseDownActions.CreateAutomationPoint) {
            const mouseTime = view.pxToTimeWithOffset(x);
            const thePoint = automationPoint({
                time: mouseTime,
                value: view.pxToValueWithOffset(y),
                layer: currentLayerNumber.value,
            });
            automationPointThatWouldBeCreated.value = thePoint;
            keepAutomationPoint = true;
        }


        if (!keepNote) noteThatWouldBeCreated.value = false;
        if (!keepLoop) loopThatWouldBeCreated.value = false;
        if (!keepAutomationPoint) automationPointThatWouldBeCreated.value = false;
    }


    const storesPill: Stores = {
        project,
        snap,
        view,
        selection,
        lanes,
        layers,
        notes,
    };

    const mouseMove = (e: { clientX: number, clientY: number }) => {
        registerMouseMove({
            x: e.clientX,
            y: e.clientY,
        });

        let refresh = false;

        if ((
            current.value === Tool.Select ||
            currentLeftHand.value === Tool.Select ||
            currentLeftHand.value === Tool.SelectAdditive
        ) && selectRange.value.active) {
            refreshAndApplyRangeSelection(e);
        } else if (mouse.drag) {
            let localDelta = mouse.drag?.delta;
            if (mouse.disallowOctaveChange && current.value !== Tool.Modulation) {
                localDelta.y = 0;
            }
            if (mouse.disallowTimeChange) {
                localDelta.x = 0;
            }
                       
            if (mouse.currentAction === MouseDownActions.Erase) {
                mouseErase(mouse, storesPill);
            } else if (current.value === Tool.Modulation) {
                mouseDragModulationSelectedTraces(
                    mouse, storesPill, lastVelocitySet
                );
            } else if (current.value === Tool.Automation) {
                mouseDragAutomationSelectedTraces(
                    mouse, storesPill
                );
            } else if (
                mouse.tracesBeingCreated.length === 1
                && !mouse.drag.traceWhenDragStarted
            ) {
                mouse.drag.traces = mouse.tracesBeingCreated;
                mouse.drag.tracesWhenDragStarted = mouse.drag.traces.map(polyfillTrace);
                mouse.drag.traceWhenDragStarted = polyfillTrace(mouse.tracesBeingCreated[0]);
                mouseDragTracesRightEdge(mouse, storesPill);
            } else
                // first mouse drag tick, when it's copying; a special event bc. notes have to be duplicated only
                // once, and under these very specific conditions
                // sets a threshold of movement before copying 
                if (mouse.drag.trace && copyOnDrag.value && !mouse.drag.alreadyDuplicated) {
                    mouseDuplicateTraces(
                        mouse, storesPill
                    );
                } else if (mouse.drag.trace && mouse.drag.isRightEdge) {
                    mouseDragTracesRightEdge(
                        mouse, storesPill
                    );
                } else if (mouse.drag.trace && mouse.drag.isLeftEdge) {
                    mouseDragTracesLeftEdge(
                        mouse, storesPill
                    );
                } else if (
                    mouse.currentAction === MouseDownActions.MoveTraces
                    || mouse.currentAction === MouseDownActions.MoveItem
                    || mouse.currentAction === MouseDownActions.SetSelectionAndDrag

                ) {
                    mouseDragSelectedTraces(
                        mouse, storesPill
                    );
                } else {
                    console.log(" No mouse drag action defined for ", MouseDownActions[mouse.currentAction]);
                }
        } else {
            updateItemThatWouldBeCreated(mouse.pos);
        }
        if (refresh) {
            view.forceRefreshVisibleNotes();
        }
    }

    const mouseUp = (e: any) => {
        if (mouse.drag) {
            mouse.drag.traces.forEach(editNote => {
                // prolly unneeded
                dragEnd(editNote);
            });
        }
        if (mouse.tracesBeingCreated.length && e.button !== 1) {
            project.append(...mouse.tracesBeingCreated);
            mouse.tracesBeingCreated = [];
        }
        if (selectRange.value.active) {
            selectRange.value.active = false;
        }
        mouse.currentAction = MouseDownActions.None;
        delete mouse.drag;
    }

    watch(() => current, () => {
        if (whatWouldMouseDownDo() !== MouseDownActions.CreateNote) {
            noteThatWouldBeCreated.value = false;
        }
        if (whatWouldMouseDownDo() !== MouseDownActions.CreateLoop) {
            loopThatWouldBeCreated.value = false;
        }
        if (whatWouldMouseDownDo() !== MouseDownActions.CreateAutomationPoint) {
            automationPointThatWouldBeCreated.value = false;
        }
    })
    return {
        mouseDown,
        mouseMove,
        mouseUp,

        timelineItemMouseEnter,
        timelineItemRightEdgeMouseEnter,
        timelineItemLeftEdgeMouseEnter,
        timelineItemMouseLeave,
        timelineItemRightEdgeMouseLeave,
        timelineItemLeftEdgeMouseLeave,

        laneBeingEdited,

        resetState,

        cursor,
        whatWouldMouseDownDo,
        currentMouseStringHelper,
        applySnapToLoop,

        current, currentLeftHand,
        simplify,
        copyOnDrag,
        showReferenceKeyboard,

        selectRange,

        mouse,

        currentLayerNumber,

        noteThatWouldBeCreated,
        loopThatWouldBeCreated,
        automationPointThatWouldBeCreated,

        loopsBeingCreated: computed(() => mouse.tracesBeingCreated.filter(n => n.type === TraceType.Loop) as Loop[]),
        notesBeingCreated: computed(() => mouse.tracesBeingCreated.filter(n => n.type === TraceType.Note) as Note[]),

        ftRec,
        touchDown, touchUp, touchMove,
    }
})