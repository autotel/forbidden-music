import { useThrottleFn } from '@vueuse/core';
import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';
import { dragEnd, dragStart } from '../dataTypes/Draggable';
import { Loop } from '../dataTypes/Loop';
import { Note, note } from '../dataTypes/Note';
import { ScreenCoord } from '../dataTypes/ScreenCoord';
import { OctaveRange, TimeRange, VelocityRange } from '../dataTypes/TimelineItem';
import { Tool } from '../dataTypes/Tool';
import { Trace, TraceType, cloneTrace } from '../dataTypes/Trace';
import { useProjectStore } from './projectStore';
import { SelectableRange, useSelectStore } from './selectStore';
import { useSnapStore } from './snapStore';
import { useViewStore } from './viewStore';

const clampToZero = (n: number) => n < 0 ? 0 : n;
type SnapStore = ReturnType<typeof useSnapStore>;
type ViewStore = ReturnType<typeof useViewStore>;
type ProjectStore = ReturnType<typeof useProjectStore>;
type SelectStore = ReturnType<typeof useSelectStore>;
type Reference<T> = { value: T };

type PolyfillTrace = (OctaveRange & VelocityRange & TimeRange) & { type: TraceType };

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
        isRightEdge: boolean,
        traces: Trace[],
        trace: Trace | false,
        tracesWhenDragStarted: Trace[],
        traceWhenDragStarted: PolyfillTrace | false,
    },
    hovered?: {
        trace?: Trace,
        traceRightEdge?: Trace,
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
    snap: SnapStore,
    view: ViewStore,
    selection: SelectStore,
}


const mouseDragModulation = ({
    drag
}: ToolMouse, {
    view,
}: Stores,
    lastVelocitySet: Reference<number>,
) => {
    if (!drag) throw new Error('misused drag handler');
    if (!drag.traceWhenDragStarted) return;
    if (drag.traceWhenDragStarted.type !== TraceType.Note) return;

    const velocityWhenDragStarted = drag.traceWhenDragStarted.velocity;
    const velocityDelta = view.pxToVelocity(drag.delta.y);
    drag.traces.forEach((n) => {
        if (n.type !== TraceType.Note) return;
        n.velocity = clampToZero(velocityWhenDragStarted + velocityDelta);
        lastVelocitySet.value = n.velocity;
    });
}

const mouseDragNotesBeingCreated = ({
    drag,
    tracesBeingCreated,
}: ToolMouse, {
    view, snap, project, selection,
}: Stores
) => {
    if (!drag) throw new Error('misused drag handler');
    snap.resetSnapExplanation();
    // const deltaX = e.clientX - newLoopDragX;
    // const newDuration = clampToZero(view.pxToTime(deltaX));
    const newDuration = clampToZero(view.pxToTime(drag.delta.x));
    tracesBeingCreated[0].timeEnd = tracesBeingCreated[0].time + newDuration;
    const noteZero = tracesBeingCreated.find(n => n.type === TraceType.Note) as Note;

    const editNote = snap.snap({
        inNote: noteZero,
        targetOctave: noteZero.octave,
        otherTraces: project.score.filter(n => n !== tracesBeingCreated[0])
    });

    Object.assign(tracesBeingCreated[0], editNote);
}

const mouseDuplicateNotes = ({
    drag,
    tracesBeingCreated,
}: ToolMouse, {
    view, snap, project, selection,
}: Stores
) => {
    if (!drag) throw new Error('misused drag handler');
    if (Math.abs(drag.delta.x) > 30 || Math.abs(drag.delta.y) > 30) {
        snap.resetSnapExplanation();
        drag.alreadyDuplicated = true;
        const prevDraggableTraces = drag.traces;
        const cloned: Note[] = [];

        prevDraggableTraces.forEach(trace => {
            // TODO: I can see that groups could be easily inc
            if (trace.type !== TraceType.Note) return;
            const newNote = cloneTrace(trace);
            project.appendNote(newNote);
            cloned.push(newNote);
            dragStart(newNote, drag.start);
            // dragEnd(trace);
        });

        selection.select(...cloned);
        drag.traces = [...cloned];
        drag.trace = cloned[0];
        snap.setFocusedTrace(drag.trace as Note);
    }
    // refresh = true;
}

const mouseDragSelectedTraces = ({
    drag
}: ToolMouse, {
    view, snap, project
}: Stores,
    disallowOctaveChange: Reference<boolean>, disallowTimeChange: Reference<boolean>
) => {
    if (!drag) throw new Error('misused drag handler');
    if (!drag.traceWhenDragStarted) throw new Error('no drag.traceWhenDragStarted');

    snap.resetSnapExplanation();
    // mouse.drag.trace.dragMove(mouseDelta);
    const octaveDragDelta = view.pxToOctave(drag.delta.y);
    const timeDragDelta = view.pxToTime(drag.delta.x);
    const octaveWhenDragStarted = 'octave' in drag.traceWhenDragStarted ? drag.traceWhenDragStarted.octave : 0;

    const snapOptions = {
        inNote: drag.trace as Note,
        otherTraces: project.score.filter(n => {
            let ret = n !== drag.trace
            ret &&= !drag.traces.includes(n);
            return ret;
        }),
        sideEffects: true,
        skipOctaveSnap: disallowOctaveChange.value,
        skipTimeSnap: disallowTimeChange.value,
    } as typeof snap.snap.arguments[0];

    if (!drag.trace) throw new Error('no drag.trace');

    drag.trace.time = drag.traceWhenDragStarted.time + timeDragDelta;
    drag.trace.timeEnd = drag.traceWhenDragStarted.timeEnd + timeDragDelta;

    if ('octave' in drag.trace) {
        drag.trace.octave = octaveWhenDragStarted + octaveDragDelta;
        snapOptions.targetOctave = drag.trace.octave;
    }

    const snappedNote = snap.snap(snapOptions)
    const timeDeltaAfterSnap = snappedNote.time - drag.traceWhenDragStarted.time;

    let octaveDeltaAfterSnap = 0;
    if ('octave' in snappedNote) {
        octaveDeltaAfterSnap = snappedNote.octave - octaveWhenDragStarted
    }

    Object.assign(drag.trace, snappedNote);

    drag.traces.map((editNoteI, index) => {
        const correlativeDragStartClone = drag.tracesWhenDragStarted[index];
        // if (editNoteI === drag.trace) return;
        editNoteI.time = timeDeltaAfterSnap + correlativeDragStartClone.time;
        editNoteI.timeEnd = timeDeltaAfterSnap + correlativeDragStartClone.timeEnd;

        if ('octave' in editNoteI) {
            if (!('octave' in correlativeDragStartClone)) throw new Error('no octave in correlativeDragStartClone');
            editNoteI.octave = octaveDeltaAfterSnap + correlativeDragStartClone.octave;
        }
    });
    // refresh = true;
}

const mouseDragTraceRightEdge = ({
    drag,
    tracesBeingCreated,
}: ToolMouse, {
    view, snap, project, selection,
}: Stores,
    disallowOctaveChange: Reference<boolean>, disallowTimeChange: Reference<boolean>
) => {
    if (!drag) throw new Error('misused drag handler');
    if (!drag.trace) throw new Error('no drag.trace');

    snap.resetSnapExplanation();
    if (!drag.traceWhenDragStarted) throw new Error('no drag.traceWhenDragStarted');
    const timeMovement = view.pxToTime(drag.delta.x);
    drag.trace.timeEnd = drag.traceWhenDragStarted.timeEnd + timeMovement;

    const snapped = snap.snapTimeRange({
        inTimeRange: drag.trace,
        otherTraces: project.score,
        sideEffects: true,
    });

    drag.trace.timeEnd = drag.trace.time + snapped.duration;
}

const mouseDragTrace = ({
    drag,
    tracesBeingCreated,
}: ToolMouse, {
    view, snap, project, selection,
}: Stores,
    disallowOctaveChange: Reference<boolean>, disallowTimeChange: Reference<boolean>
) => {
    if (!drag) throw new Error('misused drag handler');
    snap.resetSnapExplanation();
    if (!drag.traceWhenDragStarted) throw new Error('no drag.traceWhenDragStarted');
    if (!drag.trace) throw new Error('no drag.trace');

    const timeMovement = view.pxToTime(drag.delta.x);
    const originalLength = drag.traceWhenDragStarted.timeEnd - drag.traceWhenDragStarted.time;
    drag.trace.time = drag.traceWhenDragStarted.time + timeMovement;

    const snapped = snap.snapTimeRange({
        inTimeRange: drag.trace,
        otherTraces: project.score,
        sideEffects: true,
    });

    snapped.timeEnd = snapped.time + originalLength;
    Object.assign(drag.trace, snapped);

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
    LengthenNote,
    DragNoteVelocity,
    CopyNote,
    AreaSelectNotes,
    MoveNotes,
    LengthenItem,
    MoveItem,
}

// maybe doesn't need to be a store, but something else
export const useToolStore = defineStore("tool", () => {
    // hmm.. I might be not so good at choosing where stuff goes..
    const selection = useSelectStore();
    const view = useViewStore();
    const project = useProjectStore();
    const snap = useSnapStore();
    const tooltip = ref("");
    const tooltipOwner = ref<HTMLElement | SVGElement | null>(null);
    // TODO: probably not all these need to be refs
    /** current tool: the current main tool, what the user is focusing on atm */
    const current = ref(Tool.Edit);
    /** tool that might have been activated temporarily by holding a key */
    const currentLeftHand = ref(Tool.None);
    const simplify = ref(0.1);
    const copyOnDrag = ref(false);
    let lastVelocitySet = { value: 0.7 };
    type ToolRange = SelectableRange & OctaveRange & TimeRange & { active: boolean };

    const currentLayerNumber = ref(0);

    const selectRange = ref<ToolRange>({
        time: 0,
        timeEnd: 0,
        octave: 0,
        octaveEnd: 0,
        active: false
    });

    const showReferenceKeyboard = ref(false)
    const disallowOctaveChange = ref(false);
    const disallowTimeChange = ref(false);
    const currentMouseStringHelper = ref("");

    let newLoopDragX = 0;

    // TODO: add a enum to select different abstractions of tone.
    // so, if using 12 tet, the text in the note is going to be semitones
    // if even hz, it displays hz, if log, it displays octaves
    // and if rational hz, it would display hz and relationships
    // etc..
    // const notesBeingCreated = ref<Array<Note>>([]);
    // const loopsBeingCreated = ref<Array<Loop>>([]);

    const noteThatWouldBeCreated = ref<Note | false>(false);
    const loopThatWouldBeCreated = ref<Loop | false>(false);

    let mouse: ToolMouse = {
        tracesBeingCreated: [] as Trace[],
        currentAction: MouseDownActions.None,
        pos: {
            x: 0,
            y: 0,
        },
    };

    const registerDragStart = (coords: ScreenCoord) => {
        const mouseAction = whatWouldMouseDownDo();
        mouse.currentAction = mouseAction;

        let traceWhenDragStarted = false as PolyfillTrace | false;
        let trace = false as Trace | false;
        let isRightEdge = false;

        if (mouse.hovered?.traceRightEdge) {
            trace = mouse.hovered?.traceRightEdge;
            isRightEdge = true;
        } else if (mouse.hovered?.trace) {
            trace = mouse.hovered?.trace;
        }

        if (trace) {
            let polyfillTrace = {
                octave: 0, octaveEnd: 0,
                time: 0, timeEnd: 0,
                velocity: 0, velocityEnd: 0,
            } as PolyfillTrace;

            polyfillTrace = {
                ...polyfillTrace,
                ...trace,
            } as Trace & PolyfillTrace;

            traceWhenDragStarted = { ...polyfillTrace } as PolyfillTrace;
        }

        mouse.drag = {
            start: coords,
            delta: {
                x: 0,
                y: 0,
            },
            isRightEdge,
            traces: selection.getTraces(),
            trace,
            traceWhenDragStarted,
            tracesWhenDragStarted: selection.getTraces().map(cloneTrace),
            alreadyDuplicated: false,
        };

        mouse.drag.traces.forEach(trace => {
            dragStart(trace, coords);
        });
    }


    const cursor = computed(() => {
        let mouseDo = mouse.currentAction ? mouse.currentAction : whatWouldMouseDownDo();
        switch (mouseDo) {
            case MouseDownActions.LengthenNote:
            case MouseDownActions.LengthenItem:
                return 'cursor-note-length';
            case MouseDownActions.AddToSelection:
            case MouseDownActions.SetSelection:
            case MouseDownActions.SetSelectionAndDrag:
            case MouseDownActions.RemoveFromSelectionAndDrag:
            case MouseDownActions.MoveNotes:
            case MouseDownActions.MoveItem: {
                if (mouse.drag && mouse.drag.trace) {
                    return 'cursor-grabbing';
                } else {
                    return 'cursor-grab';
                }
            }
            case MouseDownActions.AreaSelectNotes:
                return 'cursor-area-select';
            case MouseDownActions.CreateNote:
            case MouseDownActions.CreateLoop:
            default:
                return 'cursor-draw';
        }
    });

    const timelineItemMouseEnter = (editNote: Trace) => {
        loopThatWouldBeCreated.value = false;
        mouse.hovered = {
            trace: editNote,
        }
    }

    const timelineItemRightEdgeMouseEnter = (editNote: Trace) => {
        // unhover all other but don't unhover item body
        loopThatWouldBeCreated.value = false;
        mouse.hovered = {
            trace: editNote,
            traceRightEdge: editNote
        }
    }

    const timelineItemMouseLeave = () => {
        if (!mouse.hovered) return;
        if (!mouse.hovered.traceRightEdge) {
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

    const whatWouldMouseDownDo = () => {
        let ret = MouseDownActions.None as MouseDownActions;
        currentMouseStringHelper.value = "";

        if (
            current.value === Tool.Select ||
            currentLeftHand.value === Tool.Select
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
                ret = MouseDownActions.AreaSelectNotes;
                currentMouseStringHelper.value = "⃞";
            }

        } else if (current.value === Tool.Modulation) {
            if (mouse.drag?.trace) {
                if (selection.isSelected(mouse.drag.trace)) {
                    ret = MouseDownActions.DragNoteVelocity;
                } else {
                    // thus far no distinction needed
                    ret = MouseDownActions.SetSelectionAndDrag;
                    console.log("modulation");
                }
            }
            currentMouseStringHelper.value = "⇅";
        } else if (current.value === Tool.Edit) {
            if (mouse.hovered?.traceRightEdge) {
                ret = MouseDownActions.LengthenNote;
                if (selection.selected.size > 1) {
                    currentMouseStringHelper.value = "⟺";
                } else {
                    currentMouseStringHelper.value = "⟷";
                }
            } else if (mouse.hovered?.trace) {
                ret = MouseDownActions.MoveNotes;
                if (selection.isSelected(mouse.hovered?.trace)) {
                    ret = MouseDownActions.MoveNotes;
                } else {
                    ret = MouseDownActions.SetSelectionAndDrag;
                }
            } else {
                ret = MouseDownActions.CreateNote;
            }
        } else if (current.value === Tool.Loop) {
            if (mouse.hovered?.traceRightEdge) {
                ret = MouseDownActions.LengthenItem;
                currentMouseStringHelper.value = "⟷ i";
            } else if (mouse.hovered?.trace) {
                ret = MouseDownActions.MoveItem;
            } else {
                ret = MouseDownActions.CreateLoop;
                currentMouseStringHelper.value = "loop";
            }
        }
        console.log(MouseDownActions[ret]);
        return ret;
    }

    const resetState = () => {
        delete mouse.drag;
        delete mouse.hovered;
        mouse.tracesBeingCreated = [];
        snap.resetSnapExplanation();
    }

    const mouseDown = (e: MouseEvent) => {
        registerDragStart({
            x: e.clientX,
            y: e.clientY,
        });
        switch (mouse.currentAction) {
            case MouseDownActions.AreaSelectNotes: {
                selection.clear();
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
            case MouseDownActions.DragNoteVelocity:
                break;
            case MouseDownActions.LengthenItem: // no break
            case MouseDownActions.LengthenNote:
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
            case MouseDownActions.SetSelectionAndDrag: {
                if (!mouse.hovered?.trace) throw new Error('no traceBeingHovered');
                const hovered = mouse.hovered?.trace;
                selection.select(hovered);
                if (mouse.drag) {
                    mouse.drag.traces = [];
                    mouse.drag.trace = hovered;
                } else {
                    console.warn("no mouse.drag");
                }
                if ('layer' in mouse.hovered?.trace) {
                    currentLayerNumber.value = mouse.hovered?.trace.layer;
                }
                break;
            }
            case MouseDownActions.RemoveFromSelection:
                if (!mouse.hovered?.trace) throw new Error('no traceBeingHovered');
                selection.remove(mouse.hovered?.trace);
                break;
            case MouseDownActions.MoveItem:
            case MouseDownActions.MoveNotes:
                break;
            case MouseDownActions.CreateLoop:
            case MouseDownActions.CreateNote:
                if (!noteThatWouldBeCreated.value) throw new Error('no noteThatWouldBeCreated');
                newLoopDragX = e.clientX;
                selection.clear();
                const cloned = cloneTrace(noteThatWouldBeCreated.value);
                mouse.tracesBeingCreated = [cloned];
                if (!mouse.drag) throw new Error('no mouse.drag');
                mouse.drag.trace = cloned;
                mouse.drag.isRightEdge = true;
                break;
            case MouseDownActions.None:
                break;
        }
        console.log("mouse down conclusion", MouseDownActions[mouse.currentAction], mouse.drag?.traces, mouse.drag?.trace);
    }

    const refreshAndApplyRangeSelection = useThrottleFn((e: MouseEvent) => {
        if (selectRange.value.active) {
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
                const velocitiesInOrder = [selectRange.value.velocity, selectRange.value.velocityEnd].sort((a, b) => a - b);
                sortedRange.velocity = velocitiesInOrder[0];
                sortedRange.velocityEnd = velocitiesInOrder[1];
            }

            selection.selectRange(sortedRange);
        }
    }, 25);

    const updateItemThatWouldBeCreated = (mouse: { x: number, y: number }) => {
        const { x, y } = mouse;
        // if out of view, false
        if (x < 0 || x > view.viewWidthPx || y < 0 || y > view.viewHeightPx) {
            noteThatWouldBeCreated.value = false;
        } else if (whatWouldMouseDownDo() === MouseDownActions.CreateNote) {
            // TODO: there should be more shared groudn beteween note and loop that would be created
            // but this requires refactoring snap to accept either
            // Additionally, I'd like to make editNotes an object like the loops,
            // or the other way around
            const freeNote = note({
                time: view.pxToTimeWithOffset(x),
                duration: 0,
                octave: view.pxToOctaveWithOffset(y),
                velocity: lastVelocitySet.value,
                layer: currentLayerNumber.value,
            });

            snap.setFocusedTrace(freeNote)

            const snapNote = snap.snap({
                inNote: freeNote,
                targetOctave: view.pxToOctaveWithOffset(y),
                otherTraces: project.score,
                sideEffects: true,
            });

            switch (snapNote.type) {
                case TraceType.Note:
                    noteThatWouldBeCreated.value = snapNote;
                    break;
                case TraceType.Loop:
                    loopThatWouldBeCreated.value = snapNote;
                    break;
            }


            // so that it displays the lines towards the snapped pos and not the mouse pos
            // TODO: should not be needed
            Object.assign(freeNote, snapNote);

            return;
        } else if (whatWouldMouseDownDo() === MouseDownActions.CreateLoop) {
            const t = view.pxToTimeWithOffset(x);
            const freeLoop = {
                time: t,
                timeEnd: t,
                count: 1,
            } as Loop;

            const snappedLoop: Loop = snap.snapTimeRange({
                inTimeRange: freeLoop,
                otherTraces: project.score,
                sideEffects: true,
            });

            loopThatWouldBeCreated.value = snappedLoop;

            // so that it displays the lines towards the snapped pos and not the mouse pos
            Object.assign(freeLoop, snappedLoop);

            return;
        } else {
            noteThatWouldBeCreated.value = false;
            loopThatWouldBeCreated.value = false;
        }
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

    const storesPill = {
        project,
        snap,
        view,
        selection,
    } as Stores;

    const mouseMove = (e: MouseEvent) => {
        registerMouseMove({
            x: e.clientX,
            y: e.clientY,
        });

        let refresh = false;



        if ((
            current.value === Tool.Select ||
            currentLeftHand.value === Tool.Select
        ) && selectRange.value.active) {
            refreshAndApplyRangeSelection(e);
        } else if (mouse.drag) {
            let localDelta = mouse.drag?.delta;
            if (disallowOctaveChange.value && current.value !== Tool.Modulation) {
                localDelta.y = 0;
            }
            if (disallowTimeChange.value) {
                localDelta.x = 0;
            }

            if (current.value === Tool.Modulation) {
                console.log("mouseDragModulation");
                mouseDragModulation(
                    mouse, storesPill, lastVelocitySet
                );
            } else if (mouse.tracesBeingCreated.length === 1) {
                console.log("mouseDragNotesBeingCreated");
                mouseDragNotesBeingCreated(
                    mouse, storesPill
                );
            } else
                // first mouse drag tick, when it's copying; a special event bc. notes have to be duplicated only
                // once, and under these very specific conditions
                // sets a threshold of movement before copying 
                if (mouse.drag.trace && copyOnDrag.value && !mouse.drag.alreadyDuplicated) {
                    console.log("mouseDuplicateNotes");
                    mouseDuplicateNotes(
                        mouse, storesPill
                    );
                } else if (mouse.drag.trace && mouse.drag.isRightEdge) {
                    console.log("mouseDragTraceRightEdge");
                    mouseDragTraceRightEdge(
                        mouse, storesPill, disallowOctaveChange, disallowTimeChange
                    );
                } else if (mouse.drag.trace && selection.isSelected(mouse.drag.trace)) {
                    console.log("mouseDragSelectedTraces");
                    mouseDragSelectedTraces(
                        mouse, storesPill, disallowOctaveChange, disallowTimeChange
                    );
                } else if (mouse.currentAction === MouseDownActions.MoveNotes) {
                    console.log("mouseDragTrace");
                    mouseDragTrace(
                        mouse, storesPill, disallowOctaveChange, disallowTimeChange
                    );
                } else {
                    console.log(" ??? ");
                }
        } else {
            updateItemThatWouldBeCreated(mouse.pos);
        }
        if (refresh) {
            view.forceRefreshVisibleNotes();
        }
    }

    const mouseUp = (e: MouseEvent) => {
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
    })

    return {
        mouseDown,
        mouseMove,
        mouseUp,

        timelineItemMouseEnter,
        timelineItemRightEdgeMouseEnter,
        timelineItemMouseLeave,
        timelineItemRightEdgeMouseLeave,

        resetState,

        cursor,
        whatWouldMouseDownDo,
        currentMouseStringHelper,

        current, currentLeftHand,
        simplify,
        copyOnDrag,
        disallowOctaveChange,
        disallowTimeChange,
        showReferenceKeyboard,

        selectRange,

        mouse,

        currentLayerNumber,

        tooltip,
        tooltipOwner,

        noteThatWouldBeCreated,
        loopThatWouldBeCreated,

        loopsBeingCreated: computed(() => mouse.tracesBeingCreated.filter(n => n.type === TraceType.Loop)),
        notesBeingCreated: computed(() => mouse.tracesBeingCreated.filter(n => n.type === TraceType.Note)),
    }
})