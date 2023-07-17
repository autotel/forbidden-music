import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';
import { Tool } from '../dataTypes/Tool';
import { useProjectStore } from './projectStore';
import { OctaveRange, TimeRange } from '../dataTypes/TimelineItem';
import { useSnapStore } from './snapStore';
import { useViewStore } from './viewStore';
import { useThrottleFn } from '@vueuse/core';
import { EditNote } from '../dataTypes/EditNote';
import { Group } from '../dataTypes/Group';
import { SelectableRange, useSelectStore } from './selectStore';

const clampToZero = (n: number) => n < 0 ? 0 : n;

export enum MouseDownActions {
    None,
    AddToSelection,
    SetSelection,
    RemoveFromSelection,
    AddToSelectionAndDrag,
    SetSelectionAndDrag,
    RemoveFromSelectionAndDrag,
    Create,
    Lengthen,
    DragVelocity,
    Copy,
    AreaSelect,
    Move,
    UnsetActiveGroup,
    EnterIntoGroup,
}


// maybe doesn't need to be a store, but something else
export const useToolStore = defineStore("edit", () => {
    // hmm.. I might be not so good at choosing where stuff goes..
    const selection = useSelectStore();
    const view = useViewStore();
    const project = useProjectStore();
    const snap = useSnapStore();

    // TODO: probably not all these need to be refs
    /** current tool: the current main tool, what the user is focusing on atm */
    const current = ref(Tool.Edit);
    /** tool that might have been activated temporarily by holding a key */
    const currentLeftHand = ref(Tool.None);
    const simplify = ref(0.1);
    const copyOnDrag = ref(false);
    let lastVelocitySet = 0.7;
    type ToolRange = SelectableRange & OctaveRange & TimeRange & { active: boolean };

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
    const currentlyActiveGroup = ref<Group | null>(null);
    const currentMouseStringHelper = ref("");

    let newNoteDragX = 0;

    // TODO: add a enum to select different abstractions of tone.
    // so, if using 12 tet, the text in the note is going to be semitones
    // if even hz, it displays hz, if log, it displays octaves
    // and if rational hz, it would display hz and relationships
    // etc..
    const notesBeingCreated = ref<Array<EditNote>>([]);

    const noteThatWouldBeCreated = ref<EditNote | false>(false);

    let mouseDragStart = {
        x: 0,
        y: 0,
    };

    // TODO: many of these probably don't need to be ref
    let isDragging = false;
    let noteBeingHovered = ref<EditNote | false>(false);
    let noteRightEdgeBeingHovered = ref<EditNote | false>(false);
    let noteBeingDragged = ref<EditNote | false>(false);
    let noteBeingDraggedRightEdge = ref<EditNote | false>(false);

    let groupBeingHovered = ref<Group | null>(null);
    let groupBeingDragged = ref<Group | false>(false);

    /** 
     * only holds reference to notes in score 
     */
    let notesBeingDragged: EditNote[] = [];
    let notesBeingDraggedRightEdge: EditNote[] = [];
    let groupsBeingDragged: Group[] = [];
    let alreadyDuplicatedForThisDrag = false;

    const cursor = computed(() => {
        if (noteRightEdgeBeingHovered.value) return 'cursor-note-length';
        if (noteBeingDraggedRightEdge.value) return 'cursor-note-length';
        if (noteBeingDragged.value) return 'cursor-grabbing';
        if (noteBeingHovered.value) return 'cursor-grab';
        if (current.value === Tool.Edit) return 'cursor-draw';
    });

    const noteMouseEnter = (editNote: EditNote) => {
        noteBeingHovered.value = editNote;
        noteThatWouldBeCreated.value = false;
        noteRightEdgeBeingHovered.value = false;
    }
    const noteRightEdgeMouseEnter = (editNote: EditNote) => {
        if (editNote.group !== currentlyActiveGroup.value) return;
        noteThatWouldBeCreated.value = false;
        noteRightEdgeBeingHovered.value = editNote;
        noteBeingHovered.value = false;
    }
    const noteMouseLeave = () => {
        noteRightEdgeBeingHovered.value = false;
        noteBeingHovered.value = false;
    }
    const noteRightEdgeMouseLeave = () => {
        noteRightEdgeBeingHovered.value = false;
    }

    const groupMouseEnter = (group: Group) => {
        groupBeingHovered.value = group;
    }
    const groupMouseLeave = () => {
        groupBeingHovered.value = null;
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
            } else if (groupBeingHovered.value) {
                ret = MouseDownActions.EnterIntoGroup;
                currentMouseStringHelper.value = "⇱";
            } else {
                ret = MouseDownActions.AreaSelect;
                currentMouseStringHelper.value = "⃞";
            }

        } else if (current.value === Tool.Modulation) {
            if (noteBeingHovered.value) {
                if (selection.isSelected(noteBeingHovered.value)) {
                    ret = MouseDownActions.DragVelocity;
                } else {
                    // thus far no distinction needed
                    ret = MouseDownActions.SetSelectionAndDrag;
                }
            }
            currentMouseStringHelper.value = "⇅";
        } else if (current.value === Tool.Edit) {
            if (
                noteRightEdgeBeingHovered.value 
                && noteRightEdgeBeingHovered.value.group === currentlyActiveGroup.value
            ) {
                ret = MouseDownActions.Lengthen;
                currentMouseStringHelper.value = "⟷";
            } else if (noteBeingHovered.value) {
                ret = MouseDownActions.Move;
                if (noteBeingHovered.value.group !== currentlyActiveGroup.value) {
                    ret = MouseDownActions.EnterIntoGroup;
                    groupBeingHovered.value = noteBeingHovered.value.group;
                    currentMouseStringHelper.value = "⇱";
                } else if (selection.isSelected(noteBeingHovered.value)) {
                    ret = MouseDownActions.Move;
                } else {
                    ret = MouseDownActions.SetSelectionAndDrag;
                }
            } else if (groupBeingHovered.value) {
                ret = MouseDownActions.EnterIntoGroup;
                currentMouseStringHelper.value = "⇱";
            } else if (!groupBeingHovered.value && currentlyActiveGroup.value !== null) {
                ret = MouseDownActions.UnsetActiveGroup;
                currentMouseStringHelper.value = "⇲";
            } else {
                ret = MouseDownActions.Create;
            }
        }
        return ret;
    }

    const _dragStartAction = (mouse: { x: number, y: number }) => {
        noteBeingDragged.value = noteBeingHovered.value;
        if (!noteBeingDragged.value) throw new Error('no noteBeingDragged');

        notesBeingDragged = selection.getNotes();
        notesBeingDragged.forEach(editNote => {
            editNote.dragStart(mouse);
        });
        // TS is insane sometimes
        snap.setFocusedNote(noteBeingDragged.value as EditNote);
        mouseDragStart = mouse;
        isDragging = true;
    }

    const _lengthenDragStartAction = (mouse: { x: number, y: number }) => {
        noteBeingDraggedRightEdge.value = noteRightEdgeBeingHovered.value;
        notesBeingDraggedRightEdge = selection.getNotes();
        if (!noteBeingDraggedRightEdge.value) throw new Error('no noteBeingDraggedRightEdge');
        noteBeingDraggedRightEdge.value.dragStart(mouse);
        notesBeingDraggedRightEdge.forEach(editNote => {
            editNote.dragStart(mouse);
        });
        snap.setFocusedNote(noteBeingDraggedRightEdge.value as EditNote);

        mouseDragStart = mouse;
        isDragging = true;
    }

    const resetState = () => {
        noteBeingDragged.value = false;
        noteBeingDraggedRightEdge.value = false;
        noteBeingHovered.value = false;
        noteRightEdgeBeingHovered.value = false;
        notesBeingDragged = [];
        notesBeingDraggedRightEdge = [];
        isDragging = false;
        alreadyDuplicatedForThisDrag = false;
        notesBeingCreated.value = [];
        snap.resetSnapExplanation();
    }

    const mouseDown = (e: MouseEvent) => {
        const mouseAction = whatWouldMouseDownDo();
        const mouse = {
            x: e.clientX,
            y: e.clientY,
        }
        switch (mouseAction) {
            case MouseDownActions.AreaSelect: {
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
            case MouseDownActions.DragVelocity:
                _dragStartAction(mouse);
                break;
            case MouseDownActions.Lengthen:
                _lengthenDragStartAction(mouse);
                break;
            case MouseDownActions.AddToSelection:
                if (!noteBeingHovered.value) throw new Error('no noteBeingHovered');
                selection.add(noteBeingHovered.value);
                break;
            case MouseDownActions.AddToSelectionAndDrag:
                if (!noteBeingHovered.value) throw new Error('no noteBeingHovered');
                selection.add(noteBeingHovered.value);
                _dragStartAction(mouse);
                break;
            case MouseDownActions.SetSelectionAndDrag:
                if (!noteBeingHovered.value) throw new Error('no noteBeingHovered');
                selection.select(noteBeingHovered.value);
                _dragStartAction(mouse);
                break;
            case MouseDownActions.RemoveFromSelection:
                if (!noteBeingHovered.value) throw new Error('no noteBeingHovered');
                selection.remove(noteBeingHovered.value);
                break;
            case MouseDownActions.Move:
                _dragStartAction(mouse);
                break;
            case MouseDownActions.Create:
                if (!noteThatWouldBeCreated.value) throw new Error('no noteThatWouldBeCreated');
                newNoteDragX = e.clientX;
                const cloned = noteThatWouldBeCreated.value.clone();
                notesBeingCreated.value = [cloned];
                noteBeingDraggedRightEdge.value = cloned;
                noteRightEdgeBeingHovered.value = cloned;
                _lengthenDragStartAction(mouse);
                break;
            case MouseDownActions.EnterIntoGroup:
                selection.clear();
                currentlyActiveGroup.value = groupBeingHovered.value;
                break;
            case MouseDownActions.UnsetActiveGroup:
                currentlyActiveGroup.value = null;
                selection.clear();
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

            selection.selectRange(sortedRange, currentlyActiveGroup.value);
        }
    }, 25);

    const updateNoteThatWouldBeCreated = (mouse: { x: number, y: number }) => {
        const { x, y } = mouse;
        // if out of view, false
        if (x < 0 || x > view.viewWidthPx || y < 0 || y > view.viewHeightPx) {
            noteThatWouldBeCreated.value = false;
        } else if (whatWouldMouseDownDo() === MouseDownActions.Create) {
            const freeNote = new EditNote({
                time: view.pxToTimeWithOffset(x),
                duration: 0,
                octave: view.pxToOctaveWithOffset(y),
                velocity: lastVelocitySet,
            }, view);

            snap.setFocusedNote(freeNote)

            const snapNote = snap.snap({
                inNote: freeNote,
                targetOctave: view.pxToOctaveWithOffset(y),
                otherNotes: view.visibleNotes,
                sideEffects: true,
            });

            noteThatWouldBeCreated.value = snapNote;

            // so that it displays the lines towards the snapped pos and not the mouse pos
            freeNote.apply(snapNote);

            return;
        } else {
            noteThatWouldBeCreated.value = false;
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
            const deltaX = e.clientX - newNoteDragX;
            notesBeingCreated.value[0].duration = clampToZero(view.pxToTime(deltaX));
            const editNote = snap.snap({
                inNote: notesBeingCreated.value[0] as EditNote,
                targetOctave: notesBeingCreated.value[0].octave,
                otherNotes: view.visibleNotes.filter(n => n !== notesBeingCreated.value[0])
            });
            notesBeingCreated.value[0].apply(editNote);
        } else if (isDragging && noteBeingDragged && copyOnDrag.value && !alreadyDuplicatedForThisDrag) {
            // first mouse drag tick, when it's copying; a special event bc. notes have to be duplicated only
            // once, and under these very specific conditions
            // sets a threshold of movement before copying 
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
                otherNotes: view.visibleNotes.filter(n => {
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
            const editNote = snap.snap({
                inNote: noteBeingDraggedRightEdge.value as EditNote,
                targetOctave: noteBeingDraggedRightEdge.value.octave,
                otherNotes: view.visibleNotes.filter(n => n !== noteBeingDraggedRightEdge.value),
                skipOctaveSnap: true,
            });
            noteBeingDraggedRightEdge.value.apply(editNote);
            refresh = true;
        } else {
            updateNoteThatWouldBeCreated({
                x: e.clientX,
                y: e.clientY,
            });
        }
        if (noteBeingDragged.value && noteBeingDragged.value.group) {
            project.updateGroupBounds(noteBeingDragged.value.group)
        }
        if (refresh) {
            view.forceRefreshVisibleNotes();
        }
    }

    const mouseUp = (e: MouseEvent) => {
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
            // store them to store
            if (currentlyActiveGroup.value) {
                notesBeingCreated.value.forEach(note => {
                    note.group = currentlyActiveGroup.value;
                });
            }
            project.appendNote(...notesBeingCreated.value);
            notesBeingCreated.value = [];
        }
        if (noteBeingDraggedRightEdge.value) {
            noteBeingDraggedRightEdge.value = false;
        }
        if (selectRange.value.active) {
            selectRange.value.active = false;
        }
        noteBeingDragged.value = false;
        noteBeingDraggedRightEdge.value = false;
        noteRightEdgeBeingHovered.value = false;
        notesBeingDraggedRightEdge = [];
    }

    watch(() => current, () => {
        if (whatWouldMouseDownDo() !== MouseDownActions.Create) {
            noteThatWouldBeCreated.value = false;
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
        resetState,

        cursor,
        whatWouldMouseDownDo,
        noteThatWouldBeCreated,
        currentMouseStringHelper,

        current, currentLeftHand,
        simplify,
        copyOnDrag,
        disallowOctaveChange,
        disallowTimeChange,
        showReferenceKeyboard,

        selectRange,

        notesBeingCreated,
        notesBeingDragged,
        noteBeingHovered,

        groupMouseEnter,
        groupMouseLeave,

        currentlyActiveGroup,
    }
})