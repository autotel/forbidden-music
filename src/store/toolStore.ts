import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';
import { Tool } from '../dataTypes/Tool';
import { useProjectStore } from './projectStore';
import { useSelectStore } from './selectStore';
import { useSnapStore } from './snapStore';
import { useViewStore } from './viewStore';
import { useThrottleFn } from '@vueuse/core';
import { EditNote } from '../dataTypes/EditNote';
import { Group } from '../dataTypes/Group';

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
    SetActiveGroup,
    SetActiveGroupAndDrag,
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
    const selectRange = ref({
        timeStart: 0,
        timeSize: 0,
        octaveStart: 0,
        octaveSize: 0,
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

    let notesBeingDragged: EditNote[] = [];
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
                if (selection.isEditNoteSelected(noteBeingHovered.value as EditNote)) {
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
                ret = MouseDownActions.SetActiveGroup;
                currentMouseStringHelper.value = "⇱";
            } else {
                ret = MouseDownActions.AreaSelect;
                currentMouseStringHelper.value = "⃞";
            }

        } else if (current.value === Tool.Modulation) {
            if (noteBeingHovered.value) {
                if (selection.isEditNoteSelected(noteBeingHovered.value as EditNote)) {
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
                console.log("A");
                ret = MouseDownActions.Move;
                if(noteBeingHovered.value.group !== currentlyActiveGroup.value){
                    ret = MouseDownActions.SetActiveGroupAndDrag;
                    groupBeingHovered.value = noteBeingHovered.value.group;
                    currentMouseStringHelper.value = "⇱";
                }else if (selection.isEditNoteSelected(noteBeingHovered.value as EditNote)) {
                    console.log("C");
                    ret = MouseDownActions.Move;
                } else {
                    console.log("D");
                    ret = MouseDownActions.SetSelectionAndDrag;
                }
            } else if (groupBeingHovered.value) {
                console.log("E");
                ret = MouseDownActions.SetActiveGroupAndDrag;
                currentMouseStringHelper.value = "⇱";
            } else if (!groupBeingHovered.value && currentlyActiveGroup.value!==null) {
                console.log("F");
                ret = MouseDownActions.UnsetActiveGroup;
                currentMouseStringHelper.value = "⇲";
            } else {
                console.log("G");
                ret = MouseDownActions.Create;
            }
        }
        return ret;
    }

    const _dragStartAction = (mouse: { x: number, y: number }) => {
        noteBeingDragged.value = noteBeingHovered.value;
        if (!noteBeingDragged.value) throw new Error('no noteBeingDragged');

        notesBeingDragged = selection.get();
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
        if (!noteBeingDraggedRightEdge.value) throw new Error('no noteBeingDraggedRightEdge');
        noteBeingDraggedRightEdge.value.dragStart(mouse);
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
                selectRange.value.timeStart = view.pxToTimeWithOffset(x);
                selectRange.value.octaveStart = view.pxToOctaveWithOffset(y);
                selectRange.value.timeSize = 0;
                selectRange.value.octaveSize = 0;
                selectRange.value.active = true;

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
            case MouseDownActions.SetActiveGroup:
                selection.clear();
                currentlyActiveGroup.value = groupBeingHovered.value;
                break;
            case MouseDownActions.SetActiveGroupAndDrag:
                selection.clear();
                currentlyActiveGroup.value = groupBeingHovered.value;
                // _dragStartAction(mouse);
                break;
            case MouseDownActions.UnsetActiveGroup:
                currentlyActiveGroup.value = null;
                selection.clear();
                break;
            case MouseDownActions.None:
                break;
        }
    }

    const applyRangeSelection = useThrottleFn((e: MouseEvent) => {
        if (selectRange.value.active) {
            const x = e.clientX;
            const y = e.clientY;
            selectRange.value.timeSize = view.pxToTimeWithOffset(x) - selectRange.value.timeStart;
            selectRange.value.octaveSize = view.pxToOctaveWithOffset(y) - selectRange.value.octaveStart;

            const range = {
                startTime: selectRange.value.timeStart,
                endTime: selectRange.value.timeStart + selectRange.value.timeSize,
                startOctave: selectRange.value.octaveStart,
                endOctave: selectRange.value.octaveStart + selectRange.value.octaveSize
            }
            selection.selectRange(range, currentlyActiveGroup.value);
        }
    }, 25);

    const updateNoteThatWouldBeCreated = (mouse: { x: number, y: number }) => {
        const { x, y } = mouse;
        // if out of view, false
        if (x < 0 || x > view.viewWidthPx || y < 0 || y > view.viewHeightPx) {
            noteThatWouldBeCreated.value = false;
        } else if (whatWouldMouseDownDo() === MouseDownActions.Create) {
            if (!noteThatWouldBeCreated.value) {
                noteThatWouldBeCreated.value = new EditNote({
                    start: 0, duration: 0, frequency: 0
                }, view);
            }

            noteThatWouldBeCreated.value.start = view.pxToTimeWithOffset(x);
            noteThatWouldBeCreated.value.duration = 0;
            noteThatWouldBeCreated.value.octave = view.pxToOctaveWithOffset(y);

            snap.setFocusedNote(noteThatWouldBeCreated.value as EditNote)
            // snap.resetSnapExplanation();

            const editNote = snap.snap({
                inNote: noteThatWouldBeCreated.value as EditNote,
                targetOctave: view.pxToOctaveWithOffset(y),
                otherNotes: project.score,
                sideEffects: true,
            });

            noteThatWouldBeCreated.value = editNote;

            return;
        } else {
            noteThatWouldBeCreated.value = false;
        }

    }

    const mouseMove = (e: MouseEvent) => {

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
            applyRangeSelection(e);
        } else if (isDragging && current.value === Tool.Modulation) {
            notesBeingDragged.forEach((n) => n.dragMoveVelocity(mouseDelta));
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
        } else if (isDragging && noteBeingDragged.value && selection.isEditNoteSelected(noteBeingDragged.value as EditNote)) {
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
            const timeDragAfterSnap = editNote.start - noteBeingDragged.value.dragStartedTime;

            noteBeingDragged.value.apply(editNote);
            notesBeingDragged.map(editNoteI => {
                if (editNoteI === noteBeingDragged.value) return;
                editNoteI.dragMoveOctaves(octaveDragDeltaAfterSnap);
                editNoteI.dragMoveTimeStart(timeDragAfterSnap);
            });
        } else if (isDragging && noteBeingDraggedRightEdge.value) {
            snap.resetSnapExplanation();
            noteBeingDraggedRightEdge.value.dragLengthMove(mouseDelta);
            const editNote = snap.snap({
                inNote: noteBeingDraggedRightEdge.value as EditNote,
                targetOctave: noteBeingDraggedRightEdge.value.octave,
                otherNotes: view.visibleNotes.filter(n => n !== noteBeingDraggedRightEdge.value),
                skipOctaveSnap: true,
            });
            noteBeingDraggedRightEdge.value.apply(editNote);
        } else {
            updateNoteThatWouldBeCreated({
                x: e.clientX,
                y: e.clientY,
            });
        }
        if (noteBeingDragged.value && noteBeingDragged.value.group) {
            project.updateGroupBounds(noteBeingDragged.value.group)
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
            project.appendNote(...notesBeingCreated.value);
            notesBeingCreated.value = [];
        }
        if (noteBeingDraggedRightEdge.value) {
            noteBeingDraggedRightEdge.value = false;
        }
        if (selectRange.value.active) {
            const x = e.clientX;
            const y = e.clientY;
            selectRange.value.timeSize = view.pxToTime(x) - selectRange.value.timeStart;
            selectRange.value.octaveSize = view.pxToOctave(y) - selectRange.value.octaveStart;
            selectRange.value.active = false;
        }
        noteBeingDragged.value = false;
        noteBeingDraggedRightEdge.value = false;
        noteRightEdgeBeingHovered.value = false;
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