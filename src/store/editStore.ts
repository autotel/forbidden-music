import { defineStore } from 'pinia'
import { computed, getCurrentInstance, ref, Ref, watchEffect } from 'vue';
import { EditNote } from '../dataTypes/EditNote.js';
import { useScoreStore } from './scoreStore.js';
import { useSelectStore } from './selectStore.js';
import { useViewStore, View } from './viewStore.js';
import { useToolStore } from './toolStore';
import { useSnapStore } from './snapStore.js';
import { useEditNotesStore } from './editNotesStore.js';
import { i } from 'vitest/dist/index-c3f83a58.js';

const clampToZero = (n: number) => n < 0 ? 0 : n;
const forceRedraw = (el: { udpateFlag: string }) => {
    el.udpateFlag = Math.random().toString(36).slice(2);
}

// maybe doesn't need to be a store, but something else
export const useEditStore = defineStore("edit", () => {
    // hmm.. I might be not so good at choosing where stuff goes..
    const selection = useSelectStore();
    const score = useScoreStore();
    const view = useViewStore();
    const tool = useToolStore();
    const editNotes = useEditNotesStore();
    const snap = useSnapStore();

    let newNoteDragX = 0;

    // TODO: add a enum to select different abstractions of tone.
    // so, if using 12 tet, the text in the note is going to be semitones
    // if even hz, it displays hz, if log, it displays octaves
    // and if rational hz, it would display hz and relationships
    // etc..
    const noteBeingCreated: Ref<EditNote | false> = ref(false);

    let mouseDragStart = {
        x: 0,
        y: 0,
    };
    let isDragging = false;
    let noteBeingHovered: EditNote | false = false;
    let noteRightEdgeBeingHovered: EditNote | false = false;
    let noteBeingDragged: EditNote | false = false;
    let noteBeingDraggedRightEdge: EditNote | false = false;

    const noteMouseEnter = (editNote: EditNote) => {
        noteRightEdgeBeingHovered = false;
        noteBeingHovered = editNote;
    }
    const noteRightEdgeMouseEnter = (editNote: EditNote) => {
        noteRightEdgeBeingHovered = editNote;
    }
    const noteMouseLeave = () => {
        noteRightEdgeBeingHovered = false;
        noteBeingHovered = false;
    }
    const noteRightEdgeMouseLeave = () => {
        noteRightEdgeBeingHovered = false;
    }

    let notesBeingDragged = [] as EditNote[];
    let alreadyDuplicatedForThisDrag = false;


    const mouseDown = (e: MouseEvent) => {
        const mouse = {
            x: e.clientX,
            y: e.clientY,
        }
        if (noteRightEdgeBeingHovered) {
            noteBeingDraggedRightEdge = noteRightEdgeBeingHovered;
            noteRightEdgeBeingHovered.dragStart(mouse);
            snap.setFocusedNote(noteRightEdgeBeingHovered);
        } else if (noteBeingHovered) {
            noteBeingDragged = noteBeingHovered;
            if (!selection.selectedNotes.includes(noteBeingDragged)) {
                selection.select(noteBeingDragged);
            }
            notesBeingDragged = selection.selectedNotes;
            notesBeingDragged.forEach(editNote => {
                editNote.dragStart(mouse);
            });

            snap.setFocusedNote(noteBeingDragged);
        } else {
            newNoteDragX = e.clientX;
            // TODO: need to add third argumet to allow relational snap when created
            const { editNote } = snap.snap(
                new EditNote({
                    start: view.pxToTimeWithOffset(e.clientX),
                    duration: 1,
                    octave: view.pxToOctaveWithOffset(e.clientY),
                }, view as View),
                view.pxToOctaveWithOffset(e.clientY)
            );
            noteBeingCreated.value = editNote.clone();

            snap.setFocusedNote(noteBeingCreated.value);
        }
        mouseDragStart = mouse;
        isDragging = true;
    }

    const mouseMove = (e: MouseEvent) => {
        const mouseDelta = {
            x: e.clientX - mouseDragStart.x,
            y: e.clientY - mouseDragStart.y,
        };
        if (tool.constrainTime) {
            mouseDelta.y = 0;
        }
        if (tool.constrainOctave) {
            mouseDelta.x = 0;
        }
        if (noteBeingCreated.value) {
            snap.resetSnapExplanation();
            const deltaX = e.clientX - newNoteDragX;
            noteBeingCreated.value.note.duration = clampToZero(view.pxToTime(deltaX));
        } else if (isDragging && noteBeingDragged && tool.copyOnDrag && !alreadyDuplicatedForThisDrag) {
            snap.resetSnapExplanation();
            alreadyDuplicatedForThisDrag = true;
            const prevDraggableNotes = notesBeingDragged;
            const cloned = [] as EditNote[];

            prevDraggableNotes.forEach(editNote => {
                const newNote = new EditNote(editNote.note, view);
                editNotes.list.push(newNote);
                cloned.push(newNote);
                newNote.dragStart(mouseDragStart);
                editNote.dragCancel();
            });
            selection.select(...cloned);
            notesBeingDragged = [...cloned];
            noteBeingDragged = cloned[0];

        } else if (isDragging && noteBeingDragged) {
            snap.resetSnapExplanation();
            noteBeingDragged.dragMove(mouseDelta);
            const { editNote } = snap.snap(
                noteBeingDragged,
                noteBeingDragged.note.octave,
                view.visibleNotes.filter(n => n !== noteBeingDragged)
            );
            
            const octaveDragDeltaAfterSnap = editNote.note.octave - noteBeingDragged.dragStartedOctave;
            const timeDragAfterSnap = editNote.note.start - noteBeingDragged.dragStartedTime;

            noteBeingDragged.note = editNote.note;
            notesBeingDragged.map(editNoteI => {
                if (editNoteI === noteBeingDragged) return;
                editNoteI.dragMoveOctaves(octaveDragDeltaAfterSnap);
                editNoteI.dragMoveTimeStart(timeDragAfterSnap);
            });
        } else if (isDragging && noteBeingDraggedRightEdge) {
            snap.resetSnapExplanation();
            noteBeingDraggedRightEdge.dragLengthMove(mouseDelta);
            const { editNote } = snap.snap(
                noteBeingDraggedRightEdge,
                noteBeingDraggedRightEdge.note.octave,
                view.visibleNotes.filter(n => n !== noteBeingDraggedRightEdge)
            );
            noteBeingDraggedRightEdge.note = editNote.note;
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
        if (noteBeingCreated.value !== false && e.button !== 1) {
            editNotes.list.push(noteBeingCreated.value);
            noteBeingCreated.value = false;
        }
        noteBeingDragged = false;
        noteBeingDraggedRightEdge = false;
    }


    return {
        mouseDown,
        mouseMove,
        mouseUp,
        noteMouseEnter,
        noteRightEdgeMouseEnter,
        noteMouseLeave,
        noteRightEdgeMouseLeave,
        noteBeingCreated,
    }
});