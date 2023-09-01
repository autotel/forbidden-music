import { useThrottleFn } from '@vueuse/core';
import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';
import { EditNote } from '../dataTypes/EditNote';
import { OctaveRange, TimeRange, TimelineItem } from '../dataTypes/TimelineItem';
import { Tool } from '../dataTypes/Tool';
import { Loop, useProjectStore } from './projectStore';
import { SelectableRange, useSelectStore } from './selectStore';
import { useSnapStore } from './snapStore';
import { useViewStore } from './viewStore';

const clampToZero = (n: number) => n < 0 ? 0 : n;

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
    let lastVelocitySet = 0.7;
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
    const notesBeingCreated = ref<Array<EditNote>>([]);
    const loopsBeingCreated = ref<Array<Loop>>([]);

    const noteThatWouldBeCreated = ref<EditNote | false>(false);
    const loopThatWouldBeCreated = ref<Loop | false>(false);

    let engagedMouseAction = ref<MouseDownActions | false>(false);

    let mouseDragStart = {
        x: 0,
        y: 0,
    };

    let timelineItemWhenDragStrted: TimelineItem | false = false;

    // TODO: many of these probably don't need to be ref

    let isDragging = false;
    // for single item edits
    let noteBeingHovered = ref<EditNote | false>(false);
    let noteRightEdgeBeingHovered = ref<EditNote | false>(false);
    let noteBeingDragged = ref<EditNote | false>(false);
    let noteBeingDraggedRightEdge = ref<EditNote | false>(false);

    let timelineItemBeingHovered = ref<TimelineItem | false>(false);
    let timelineItemRightEdgeBeingHovered = ref<TimelineItem | false>(false);
    let timelineItemBeingDragged = ref<TimelineItem | false>(false);
    let timelineItemBeingDraggedRightEdge = ref<TimelineItem | false>(false);

    // for multi-item edits
    let notesBeingDragged: EditNote[] = [];
    let notesBeingDraggedRightEdge: EditNote[] = [];

    let alreadyDuplicatedForThisDrag = false;

    const cursor = computed(() => {
        let mouseDo = engagedMouseAction.value ? engagedMouseAction.value : whatWouldMouseDownDo();
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
                if (noteBeingDragged.value || timelineItemBeingDragged.value) {
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


        // if (noteRightEdgeBeingHovered.value) return 'cursor-note-length';
        // if (noteBeingDraggedRightEdge.value) return 'cursor-note-length';
        // if (noteBeingDragged.value) return 'cursor-grabbing';
        // if (noteBeingHovered.value) return 'cursor-grab';
        // if (timelineItemBeingDragged.value) return 'cursor-grabbing';
        // if (timelineItemBeingDraggedRightEdge.value) return 'cursor-note-length';
        // if (current.value === Tool.Edit) return 'cursor-draw';
    });


    const noteMouseEnter = (editNote: EditNote) => {
        // unhover all other including right edge
        timelineItemBeingHovered.value = false;
        timelineItemRightEdgeBeingHovered.value = false;
        noteRightEdgeBeingHovered.value = false;


        noteBeingHovered.value = editNote;
        noteThatWouldBeCreated.value = false;
    }
    const noteRightEdgeMouseEnter = (editNote: EditNote) => {
        // unhover all other but don't unhover note body
        timelineItemBeingHovered.value = false;
        timelineItemRightEdgeBeingHovered.value = false;

        noteRightEdgeBeingHovered.value = editNote;
        noteThatWouldBeCreated.value = false;
    }
    const noteMouseLeave = () => {
        noteRightEdgeBeingHovered.value = false;
        noteBeingHovered.value = false;
    }
    const noteRightEdgeMouseLeave = () => {
        noteRightEdgeBeingHovered.value = false;
        if (noteBeingHovered.value) {
            noteMouseEnter(noteBeingHovered.value);
        }
    }


    const timelineItemMouseEnter = (editNote: TimelineItem) => {
        console.log("timelineItemMouseEnter");
        // unhover all other including right edge
        noteBeingHovered.value = false;
        noteRightEdgeBeingHovered.value = false;
        timelineItemRightEdgeBeingHovered.value = false;

        loopThatWouldBeCreated.value = false;

        timelineItemBeingHovered.value = editNote;
    }
    const timelineItemRightEdgeMouseEnter = (editNote: TimelineItem) => {
        // unhover all other but don't unhover item body
        noteBeingHovered.value = false;
        noteRightEdgeBeingHovered.value = false;

        loopThatWouldBeCreated.value = false;

        timelineItemRightEdgeBeingHovered.value = editNote;
    }
    const timelineItemMouseLeave = () => {
        console.log("timelineItemMouseLeave");
        timelineItemRightEdgeBeingHovered.value = false;
        timelineItemBeingHovered.value = false;
    }
    const timelineItemRightEdgeMouseLeave = () => {
        timelineItemRightEdgeBeingHovered.value = false;
        if (timelineItemBeingHovered.value) {
            timelineItemMouseEnter(timelineItemBeingHovered.value);
        }
    }

    const whatWouldMouseDownDo = () => {
        let ret = MouseDownActions.None as MouseDownActions;
        currentMouseStringHelper.value = "";

        if (
            current.value === Tool.Select ||
            currentLeftHand.value === Tool.Select
        ) {
            if (noteBeingHovered.value) {
                if (selection.isSelected(noteBeingHovered.value)) {
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
            if (noteBeingHovered.value) {
                if (selection.isSelected(noteBeingHovered.value)) {
                    ret = MouseDownActions.DragNoteVelocity;
                } else {
                    // thus far no distinction needed
                    ret = MouseDownActions.SetSelectionAndDrag;
                }
            }
            currentMouseStringHelper.value = "⇅";
        } else if (current.value === Tool.Edit) {
            if (timelineItemRightEdgeBeingHovered.value) {
                ret = MouseDownActions.LengthenItem;
                currentMouseStringHelper.value = "⟷ i";
            } else if (timelineItemBeingHovered.value) {
                // ret = MouseDownActions.MoveItem;
                ret = MouseDownActions.MoveItem;
            } else if (noteRightEdgeBeingHovered.value) {
                ret = MouseDownActions.LengthenNote;
                if (selection.selected.size > 1) {
                    currentMouseStringHelper.value = "⟺";
                } else {
                    currentMouseStringHelper.value = "⟷";
                }
            } else if (noteBeingHovered.value) {
                ret = MouseDownActions.MoveNotes;
                if (selection.isSelected(noteBeingHovered.value)) {
                    ret = MouseDownActions.MoveNotes;
                } else {
                    ret = MouseDownActions.SetSelectionAndDrag;
                }
            } else {
                ret = MouseDownActions.CreateNote;
            }
        } else if (current.value === Tool.Loop) {
            if (timelineItemRightEdgeBeingHovered.value) {
                ret = MouseDownActions.LengthenItem;
                currentMouseStringHelper.value = "⟷ i";
            } else if (timelineItemBeingHovered.value) {
                ret = MouseDownActions.MoveItem;
            } else {
                ret = MouseDownActions.CreateLoop;
                currentMouseStringHelper.value = "loop";
            }
        }
        return ret;
    }

    const _dragStartAction = (mouse: { x: number, y: number }) => {
        // TODO: the hierarchy of what is selected on click is re-defined here. 
        // It was first defined by whatWouldMouseDownDo
        // ideally the precedence should be consequential and not coincidental

        if (timelineItemBeingHovered.value) {
            const subject = timelineItemBeingDragged.value = timelineItemBeingHovered.value;
            if (!timelineItemBeingDragged.value) throw new Error('no timelineItemBeingDragged');
            const copyOfTimelineItem = {
                time: subject.time,
                timeEnd: subject.timeEnd,
            } as { [key: string]: number };

            if ('octave' in subject) {
                copyOfTimelineItem.octave = subject.octave;
            }
            if ('octaveEnd' in subject) {
                copyOfTimelineItem.octaveEnd = subject.octaveEnd;
            }

            timelineItemWhenDragStrted = copyOfTimelineItem as unknown as TimelineItem;

            mouseDragStart = mouse;
            isDragging = true;

        } else if (noteBeingHovered.value) {
            noteBeingDragged.value = noteBeingHovered.value;
            if (!noteBeingDragged.value) throw new Error('no noteBeingDragged');

            notesBeingDragged = selection.getNotes();
            notesBeingDragged.forEach(editNote => {
                editNote.dragStart(mouse);
            });

            snap.setFocusedNote(noteBeingDragged.value);
            mouseDragStart = mouse;
            isDragging = true;
        }
    }

    const _lengthenDragStartAction = (mouse: { x: number, y: number }) => {
        timelineItemBeingDragged.value = false;
        noteBeingDragged.value = false;

        // TODO: the hierarchy of what is selected on click is re-defined here. 
        // It was first defined by whatWouldMouseDownDo
        // ideally the precedence should be consequential and not coincidental
        if (timelineItemRightEdgeBeingHovered.value) {
            const subject = timelineItemBeingDraggedRightEdge.value = timelineItemRightEdgeBeingHovered.value;
            if (!subject) throw new Error('no timelineItemBeingDraggedRightEdge');

            const copyOfTimelineItem = {
                time: subject.time,
                timeEnd: subject.timeEnd,
            } as { [key: string]: number };

            if ('octave' in subject) {
                copyOfTimelineItem.octave = subject.octave;
            }
            if ('octaveEnd' in subject) {
                copyOfTimelineItem.octaveEnd = subject.octaveEnd;
            }

            timelineItemWhenDragStrted = copyOfTimelineItem as unknown as TimelineItem;

            mouseDragStart = mouse;
            isDragging = true;
        } else if (noteRightEdgeBeingHovered.value) {
            const subject = noteBeingDraggedRightEdge.value = noteRightEdgeBeingHovered.value;
            notesBeingDraggedRightEdge = selection.getNotes();

            // if I select one note and then lengthen another, it feels unexpected to lengthen the first one
            // without selecting the dragged one
            if (
                subject &&
                (!notesBeingDraggedRightEdge.includes(subject))
            ) {
                // if one note only is selected, one tends to expect that selection gets replaced
                if (notesBeingDraggedRightEdge.length === 1) {
                    notesBeingDraggedRightEdge = [];
                    selection.clear();
                }
                // but if more, one expects that selection gets overwritten
                // but that tends to be annoying, so I just add it instead.
                if (subject) selection.add(subject);
            }

            if (!subject) throw new Error('no noteBeingDraggedRightEdge');
            subject.dragStart(mouse);
            notesBeingDraggedRightEdge.forEach(editNote => {
                editNote.dragStart(mouse);
            });
            snap.setFocusedNote(subject as EditNote);

            mouseDragStart = mouse;
            isDragging = true;
        }
    }

    const resetState = () => {
        noteBeingDragged.value = false;
        noteBeingDraggedRightEdge.value = false;
        noteBeingHovered.value = false;
        noteRightEdgeBeingHovered.value = false;

        timelineItemBeingDragged.value = false;
        timelineItemBeingDraggedRightEdge.value = false;
        timelineItemBeingHovered.value = false;
        timelineItemRightEdgeBeingHovered.value = false;

        notesBeingDragged = [];
        notesBeingDraggedRightEdge = [];
        isDragging = false;
        alreadyDuplicatedForThisDrag = false;
        notesBeingCreated.value = [];
        snap.resetSnapExplanation();
    }

    const mouseDown = (e: MouseEvent) => {
        const mouseAction = whatWouldMouseDownDo();
        engagedMouseAction.value = mouseAction;
        const mouse = {
            x: e.clientX,
            y: e.clientY,
        }
        switch (mouseAction) {
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
                _dragStartAction(mouse);
                break;
            case MouseDownActions.LengthenItem: // no break
            case MouseDownActions.LengthenNote:
                _lengthenDragStartAction(mouse);
                break;
            case MouseDownActions.AddToSelection:
                if (!noteBeingHovered.value) throw new Error('no noteBeingHovered');
                selection.add(noteBeingHovered.value);
                currentLayerNumber.value = noteBeingHovered.value.layer;
                break;
            case MouseDownActions.AddToSelectionAndDrag:
                if (!noteBeingHovered.value) throw new Error('no noteBeingHovered');
                selection.add(noteBeingHovered.value);
                currentLayerNumber.value = noteBeingHovered.value.layer;
                _dragStartAction(mouse);
                break;
            case MouseDownActions.SetSelectionAndDrag:
                if (!noteBeingHovered.value) throw new Error('no noteBeingHovered');
                selection.select(noteBeingHovered.value);
                currentLayerNumber.value = noteBeingHovered.value.layer;
                _dragStartAction(mouse);
                break;
            case MouseDownActions.RemoveFromSelection:
                if (!noteBeingHovered.value) throw new Error('no noteBeingHovered');
                selection.remove(noteBeingHovered.value);
                break;
            case MouseDownActions.MoveItem:
            case MouseDownActions.MoveNotes:
                _dragStartAction(mouse);
                break;
            case MouseDownActions.CreateNote:
                if (!noteThatWouldBeCreated.value) throw new Error('no noteThatWouldBeCreated');
                newLoopDragX = e.clientX;
                const cloned = noteThatWouldBeCreated.value.clone();
                notesBeingCreated.value = [cloned];
                noteBeingDraggedRightEdge.value = cloned;
                noteRightEdgeBeingHovered.value = cloned;
                _lengthenDragStartAction(mouse);
                break;
            case MouseDownActions.CreateLoop:
                if (!loopThatWouldBeCreated.value) throw new Error('no loopThatWouldBeCreated');
                newLoopDragX = e.clientX;
                const clonedLoop = { ...loopThatWouldBeCreated.value };
                loopsBeingCreated.value = [clonedLoop];
                timelineItemBeingDraggedRightEdge.value = clonedLoop;
                timelineItemRightEdgeBeingHovered.value = clonedLoop;
                _lengthenDragStartAction(mouse);
                break;



            case MouseDownActions.None:
                break;
        }
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
            const freeNote = new EditNote({
                time: view.pxToTimeWithOffset(x),
                duration: 0,
                octave: view.pxToOctaveWithOffset(y),
                velocity: lastVelocitySet,
                layer: currentLayerNumber.value,
            }, view);

            snap.setFocusedNote(freeNote)

            const snapNote = snap.snap({
                inNote: freeNote,
                targetOctave: view.pxToOctaveWithOffset(y),
                otherNotes: project.score,
                sideEffects: true,
            });

            noteThatWouldBeCreated.value = snapNote;

            // so that it displays the lines towards the snapped pos and not the mouse pos
            freeNote.apply(snapNote);

            return;
        } else if (whatWouldMouseDownDo() === MouseDownActions.CreateLoop) {
            const t = view.pxToTimeWithOffset(x);
            const freeLoop = {
                time: t,
                timeEnd: t,
                count: 1,
            } as Loop;

            const snappedLoop:Loop = snap.snapTimeRange({
                inTimeRange: freeLoop,
                otherNotes: project.score,
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

    const mouseMove = (e: MouseEvent) => {
        let refresh = false;
        const mouseDelta = {
            x: e.clientX - mouseDragStart.x,
            y: e.clientY - mouseDragStart.y,
        };
        if (disallowOctaveChange.value && current.value !== Tool.Modulation) {
            mouseDelta.y = 0;
        }
        if (disallowTimeChange.value) {
            mouseDelta.x = 0;
        }
        if ((
            current.value === Tool.Select ||
            currentLeftHand.value === Tool.Select
        ) && selectRange.value.active) {
            refreshAndApplyRangeSelection(e);
        } else if (isDragging && current.value === Tool.Modulation) {
            notesBeingDragged.forEach((n) => n.dragMoveVelocity(mouseDelta));
            lastVelocitySet = notesBeingDragged.reduce((acc, n) => acc + n.velocity, 0) / notesBeingDragged.length;
        } else if (notesBeingCreated.value.length === 1) {
            snap.resetSnapExplanation();
            const deltaX = e.clientX - newLoopDragX;
            notesBeingCreated.value[0].duration = clampToZero(view.pxToTime(deltaX));
            const editNote = snap.snap({
                inNote: notesBeingCreated.value[0] as EditNote,
                targetOctave: notesBeingCreated.value[0].octave,
                otherNotes: project.score.filter(n => n !== notesBeingCreated.value[0])
            });
            notesBeingCreated.value[0].apply(editNote);
        } else
            // first mouse drag tick, when it's copying; a special event bc. notes have to be duplicated only
            // once, and under these very specific conditions
            // sets a threshold of movement before copying 
            if (isDragging && noteBeingDragged.value && copyOnDrag.value && !alreadyDuplicatedForThisDrag) {

                if (Math.abs(mouseDelta.x) > 30 || Math.abs(mouseDelta.y) > 30) {
                    snap.resetSnapExplanation();
                    alreadyDuplicatedForThisDrag = true;
                    const prevDraggableNotes = notesBeingDragged;
                    const cloned: EditNote[] = [];

                    prevDraggableNotes.forEach(editNote => {
                        const newNote = editNote.clone();
                        project.appendNote(newNote);
                        cloned.push(newNote);
                        newNote.dragStart(mouseDragStart);
                        // newNote.layer = currentLayerNumber.value;
                        editNote.dragCancel();
                    });
                    selection.select(...cloned);
                    notesBeingDragged = [...cloned];
                    noteBeingDragged.value = cloned[0];
                    snap.setFocusedNote(noteBeingDragged.value as EditNote);
                }
                refresh = true;
            } else if (isDragging && noteBeingDragged.value && selection.isSelected(noteBeingDragged.value)) {

                snap.resetSnapExplanation();
                noteBeingDragged.value.dragMove(mouseDelta);

                const editNote = snap.snap({
                    inNote: noteBeingDragged.value as EditNote,
                    targetOctave: noteBeingDragged.value.octave,
                    otherNotes: project.score.filter(n => {
                        let ret = n !== noteBeingDragged.value
                        ret &&= !notesBeingDragged.includes(n);
                        return ret;
                    }),
                    sideEffects: true,
                    skipOctaveSnap: disallowOctaveChange.value,
                    skipTimeSnap: disallowTimeChange.value,
                })


                const octaveDragDeltaAfterSnap = editNote.octave - noteBeingDragged.value.dragStartedOctave;
                const timeDragAfterSnap = editNote.time - noteBeingDragged.value.dragStartedTime;

                noteBeingDragged.value.apply(editNote);
                notesBeingDragged.map(editNoteI => {
                    if (editNoteI === noteBeingDragged.value) return;
                    editNoteI.dragMoveOctaves(octaveDragDeltaAfterSnap);
                    editNoteI.dragMoveTime(timeDragAfterSnap);
                });
                refresh = true;
            } else if (isDragging && noteBeingDraggedRightEdge.value) {

                snap.resetSnapExplanation();
                noteBeingDraggedRightEdge.value.dragLengthMove(mouseDelta);
                notesBeingDraggedRightEdge.forEach(editNote => {
                    editNote.dragLengthMove(mouseDelta);
                });
                const snapped = snap.snap({
                    inNote: noteBeingDraggedRightEdge.value as EditNote,
                    targetOctave: noteBeingDraggedRightEdge.value.octave,
                    otherNotes: project.score.filter(n => n !== noteBeingDraggedRightEdge.value),
                    skipOctaveSnap: true,
                });
                noteBeingDraggedRightEdge.value.apply(snapped);
                refresh = true;
            } else if (isDragging && timelineItemBeingDragged.value) {
                snap.resetSnapExplanation();
                if (!timelineItemWhenDragStrted) throw new Error('no timelineItemWhenDragStrted');
                const timeMovement = view.pxToTime(mouseDelta.x);
                const originalLength = timelineItemWhenDragStrted.timeEnd - timelineItemWhenDragStrted.time;
                timelineItemBeingDragged.value.time = timelineItemWhenDragStrted.time + timeMovement;

                const snapped = snap.snapTimeRange({
                    inTimeRange: timelineItemBeingDragged.value,
                    otherNotes: project.score,
                    sideEffects: true,
                });

                snapped.timeEnd = snapped.time + originalLength;
                Object.assign(timelineItemBeingDragged.value, snapped);

            } else if (isDragging && timelineItemBeingDraggedRightEdge.value) {
                snap.resetSnapExplanation();
                if (!timelineItemWhenDragStrted) throw new Error('no timelineItemWhenDragStrted');
                const timeMovement = view.pxToTime(mouseDelta.x);

                console.log("lenghtening loop");

                timelineItemBeingDraggedRightEdge.value.timeEnd = timelineItemWhenDragStrted.timeEnd + timeMovement;

                const snapped = snap.snapTimeRange({
                    inTimeRange: timelineItemBeingDraggedRightEdge.value,
                    otherNotes: project.score,
                    sideEffects: true,
                });
                
                timelineItemBeingDraggedRightEdge.value.timeEnd = timelineItemBeingDraggedRightEdge.value.time + snapped.duration;
            } else {
                updateItemThatWouldBeCreated({
                    x: e.clientX,
                    y: e.clientY,
                });
            }
        if (refresh) {
            view.forceRefreshVisibleNotes();
        }
    }

    const mouseUp = (e: MouseEvent) => {
        engagedMouseAction.value = false;
        alreadyDuplicatedForThisDrag = false;
        isDragging = false;
        const mouse = {
            x: e.clientX,
            y: e.clientY,
        }
        notesBeingDragged.forEach(editNote => {
            editNote.dragEnd(mouse);
        });
        if (notesBeingCreated.value.length && e.button !== 1) {
            project.appendNote(...notesBeingCreated.value);
            notesBeingCreated.value = [];
        }
        if (loopsBeingCreated.value.length && e.button !== 1) {
            project.loops.push(...loopsBeingCreated.value);
            loopsBeingCreated.value = [];
        }
        if (noteBeingDraggedRightEdge.value) {
            noteBeingDraggedRightEdge.value = false;
        }
        if (selectRange.value.active) {
            selectRange.value.active = false;
        }
        noteBeingDragged.value = false;
        noteBeingDraggedRightEdge.value = false;
        notesBeingDraggedRightEdge = [];
        timelineItemBeingDragged.value = false;
        timelineItemBeingDraggedRightEdge.value = false;
    }

    watch(() => current, () => {
        if (whatWouldMouseDownDo() !== MouseDownActions.CreateNote) {
            noteThatWouldBeCreated.value = false;
        }
        if(whatWouldMouseDownDo() !== MouseDownActions.CreateLoop) {
            loopThatWouldBeCreated.value = false;
        }
    })

    return {
        mouseDown,
        mouseMove,
        mouseUp,

        noteMouseEnter,
        noteRightEdgeMouseEnter,
        noteMouseLeave,
        noteRightEdgeMouseLeave,

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
        
        noteThatWouldBeCreated,
        notesBeingCreated,
        notesBeingDragged,
        noteBeingHovered,
        
        loopThatWouldBeCreated,
        loopsBeingCreated,

        currentLayerNumber,

        tooltip,
        tooltipOwner,
    }
})