import { defineStore } from 'pinia'
import { computed, getCurrentInstance, ref, Ref, watchEffect } from 'vue';
import { EditNote } from '../dataTypes/EditNote.js';
import { useScoreStore } from './scoreStore.js';
import { useSelectStore } from './selectStore.js';
import { useViewStore, View } from './viewStore.js';
import { useToolStore } from './toolStore';

const clampToZero = (n: number) => n < 0 ? 0 : n;
const forceRedraw = (el:{udpateFlag:string}) => {
    el.udpateFlag = Math.random().toString(36).slice(2);
}

// maybe doesn't need to be a store, but something else
export const useEditStore = defineStore("edit", () => {
    // hmm.. I might be not so good at choosing where stuff goes..
    const selection = useSelectStore();
    const score = useScoreStore();
    const view = useViewStore();
    const tool = useToolStore();

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
        noteBeingHovered = editNote;
    }
    const noteRightEdgeMouseEnter = (editNote: EditNote) => {
        noteRightEdgeBeingHovered = editNote;
    }
    const noteMouseLeave = () => {
        noteBeingHovered = false;
    }
    const noteRightEdgeMouseLeave = () => {
        noteRightEdgeBeingHovered = false;
    }

    const getDraggableNotes = () => [noteBeingDragged, ...selection.selectedNotes].filter(n => n) as EditNote[];

    const mouseDown = (e: MouseEvent) => {
        const mouse = {
            x: e.clientX,
            y: e.clientY,
        }
        if (noteRightEdgeBeingHovered) {
            noteBeingDraggedRightEdge = noteRightEdgeBeingHovered;
            noteRightEdgeBeingHovered.dragStart(mouse);
        } else if (noteBeingHovered) {
            noteBeingDragged = noteBeingHovered;
            getDraggableNotes().forEach(editNote => {
                editNote.dragStart(mouse);
            });
        } else {
            newNoteDragX = e.clientX;
            // TODO: need to add third argumet to allow relational snap when created
            const { editNote } = tool.snap(
                new EditNote({
                    start: view.pxToTimeWithOffset(e.clientX),
                    duration: 1,
                    octave: view.pxToOctaveWithOffset(e.clientY),
                }, view as View),
                view.pxToOctaveWithOffset(e.clientY)
            );
            noteBeingCreated.value = editNote.clone();
        }
        mouseDragStart = mouse;
        isDragging = true;
    }
    const mouseMove = (e: MouseEvent) => {
        if (noteBeingCreated.value) {
            const deltaX = e.clientX - newNoteDragX;
            noteBeingCreated.value.note.duration = clampToZero(view.pxToTime(deltaX));
        } else if (isDragging && noteBeingDragged) {
            const mouseDelta = {
                x: e.clientX - mouseDragStart.x,
                y: e.clientY - mouseDragStart.y,
            };
            getDraggableNotes().map(editNoteI => {
                editNoteI.dragMove(mouseDelta);
                const { editNote } = tool.snap(
                    editNoteI,
                    editNoteI.note.octave,
                    view.visibleNotes.filter(n => n !== editNoteI)
                );
                editNoteI.note = editNote.note;
//     // horizontal
//     e.stopPropagation();
//     const timeDelta = view.pxToTime(e.clientX - startX);
//     if (dragMode === DragMode.None) {
//         return
//     } else if (dragMode === DragMode.Resize) {
//     } else if (dragMode === DragMode.Move) {
//         // horizontal
//         if(select.selectedNotes.length) {
//             select.selectedNotes.forEach(({note})=>{
//                 note.start = startNoteStart + timeDelta;
//             })
//         } else {
//             noteBeingEdited.start = startNoteStart + timeDelta;
//         }
//         // vertical
//         // prevent pitch change if 'alt' key is pressed
//         // TODO: should draw a horizontal line to represent the constraint of movement.
//         if (e.altKey) return;
//         const octaveDelta = view.pxToOctave(e.clientY - startY);
//         let targetOctave = startNoteOctave + octaveDelta;
//         const visibleNotes = getVisibleNotes().filter(n => n !== noteBeingEdited);
//         const {
//             note
//         } = tool.snap(
//             noteBeingEdited,
//             targetOctave,
//             visibleNotes
//         );
//         noteBeingEdited.octave = note.octave;
//     }

                forceRedraw(editNoteI);
            });

        } else if (isDragging && noteBeingDraggedRightEdge) {
            const mouseDelta = {
                x: e.clientX - mouseDragStart.x,
                y: e.clientY - mouseDragStart.y,
            };
            noteBeingDraggedRightEdge.dragLengthMove(mouseDelta);
            forceRedraw(noteBeingDraggedRightEdge);
        }
    }
    const mouseUp = (e: MouseEvent) => {
        isDragging = false;
        const mouse = {
            x: e.clientX,
            y: e.clientY,
        }
        getDraggableNotes().forEach(editNote => {
            editNote.dragEnd(mouse);
        });
        if (noteBeingCreated.value !== false && e.button !== 1) {
            view.editNotes.push(noteBeingCreated.value);
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