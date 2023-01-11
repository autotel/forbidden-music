import { defineStore } from 'pinia';
import { computed, ref, Ref } from 'vue';
import { EditNote } from '../dataTypes/EditNote.js';
import { Tool } from '../dataTypes/Tool.js';
import { useEditNotesStore } from './editNotesStore.js';
import { useScoreStore } from './scoreStore.js';
import { useSelectStore } from './selectStore.js';
import { useSnapStore } from './snapStore.js';
import { useViewStore, View } from './viewStore.js';

const clampToZero = (n: number) => n < 0 ? 0 : n;
const forceRedraw = (el: { udpateFlag: string }) => {
    el.udpateFlag = Math.random().toString(36).slice(2);
}

// maybe doesn't need to be a store, but something else
export const useToolStore = defineStore("edit", () => {
    // hmm.. I might be not so good at choosing where stuff goes..
    const selection = useSelectStore();
    const score = useScoreStore();
    const view = useViewStore();
    const editNotes = useEditNotesStore();
    const snap = useSnapStore();

    // TODO: probably not all these need to be refs
    const current = ref(Tool.Edit);
    const simplify = ref(0.1);
    const copyOnDrag = ref(false);

    const constrainTime = ref(false);
    const constrainOctave = ref(false);

    let newNoteDragX = 0;

    // TODO: add a enum to select different abstractions of tone.
    // so, if using 12 tet, the text in the note is going to be semitones
    // if even hz, it displays hz, if log, it displays octaves
    // and if rational hz, it would display hz and relationships
    // etc..
    const notesBeingCreated: Ref<Array<EditNote>> = ref([]);

    let mouseDragStart = {
        x: 0,
        y: 0,
    };
    let isDragging = false;
    let noteBeingHovered = ref<EditNote | false>(false);
    let noteRightEdgeBeingHovered = ref<EditNote | false>(false);
    let noteBeingDragged = ref<EditNote | false>(false);
    let noteBeingDraggedRightEdge = ref<EditNote | false>(false);


    const cursor = computed(() => {
        if (noteRightEdgeBeingHovered.value) return 'cursor-note-length';
        if (noteBeingDraggedRightEdge.value) return 'cursor-note-length';
        if (noteBeingDragged.value) return 'cursor-grabbing';
        if (noteBeingHovered.value) return 'cursor-grab';
        if (current.value === Tool.Edit) return 'cursor-draw';
    });

    const noteMouseEnter = (editNote: EditNote) => {
        noteRightEdgeBeingHovered.value = false;
        noteBeingHovered.value = editNote;
    }
    const noteRightEdgeMouseEnter = (editNote: EditNote) => {
        noteRightEdgeBeingHovered.value = editNote;
    }
    const noteMouseLeave = () => {
        noteRightEdgeBeingHovered.value = false;
        noteBeingHovered.value = false;
    }
    const noteRightEdgeMouseLeave = () => {
        noteRightEdgeBeingHovered.value = false;
    }

    let notesBeingDragged = [] as EditNote[];
    let alreadyDuplicatedForThisDrag = false;


    const mouseDown = (e: MouseEvent) => {
        const mouse = {
            x: e.clientX,
            y: e.clientY,
        }
        if (noteRightEdgeBeingHovered.value) {
            noteBeingDraggedRightEdge.value = noteRightEdgeBeingHovered.value;
            noteRightEdgeBeingHovered.value.dragStart(mouse);
            snap.setFocusedNote(noteRightEdgeBeingHovered.value);
        } else if (noteBeingHovered.value) {
            noteBeingDragged.value = noteBeingHovered.value;
            if (!selection.selectedNotes.includes(noteBeingDragged.value)) {
                selection.select(noteBeingDragged.value);
            }
            notesBeingDragged = selection.selectedNotes;
            notesBeingDragged.forEach(editNote => {
                editNote.dragStart(mouse);
            });

            snap.setFocusedNote(noteBeingDragged.value);
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
            notesBeingCreated.value = [editNote.clone()];

            snap.setFocusedNote(notesBeingCreated.value[0]);
        }
        mouseDragStart = mouse;
        isDragging = true;
    }

    const mouseMove = (e: MouseEvent) => {
        const mouseDelta = {
            x: e.clientX - mouseDragStart.x,
            y: e.clientY - mouseDragStart.y,
        };
        if (constrainTime.value) {
            mouseDelta.y = 0;
        }
        if (constrainOctave.value) {
            mouseDelta.x = 0;
        }
        if (notesBeingCreated.value.length === 1) {
            snap.resetSnapExplanation();
            const deltaX = e.clientX - newNoteDragX;
            notesBeingCreated.value[0].note.duration = clampToZero(view.pxToTime(deltaX));
        } else if (isDragging && noteBeingDragged && copyOnDrag.value && !alreadyDuplicatedForThisDrag) {
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
            noteBeingDragged.value = cloned[0];

        } else if (isDragging && noteBeingDragged.value) {
            snap.resetSnapExplanation();
            noteBeingDragged.value.dragMove(mouseDelta);
            const { editNote } = snap.snap(
                noteBeingDragged.value,
                noteBeingDragged.value.note.octave,
                view.visibleNotes.filter(n => n !== noteBeingDragged.value)
            );

            const octaveDragDeltaAfterSnap = editNote.note.octave - noteBeingDragged.value.dragStartedOctave;
            const timeDragAfterSnap = editNote.note.start - noteBeingDragged.value.dragStartedTime;

            noteBeingDragged.value.note = editNote.note;
            notesBeingDragged.map(editNoteI => {
                if (editNoteI === noteBeingDragged.value) return;
                editNoteI.dragMoveOctaves(octaveDragDeltaAfterSnap);
                editNoteI.dragMoveTimeStart(timeDragAfterSnap);
            });
        } else if (isDragging && noteBeingDraggedRightEdge.value) {
            snap.resetSnapExplanation();
            noteBeingDraggedRightEdge.value.dragLengthMove(mouseDelta);
            const { editNote } = snap.snap(
                noteBeingDraggedRightEdge.value,
                noteBeingDraggedRightEdge.value.note.octave,
                view.visibleNotes.filter(n => n !== noteBeingDraggedRightEdge.value)
            );
            noteBeingDraggedRightEdge.value.note = editNote.note;
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
            editNotes.list.push(...notesBeingCreated.value);
            notesBeingCreated.value = [];
        }
        noteBeingDragged.value = false;
        noteBeingDraggedRightEdge.value = false;
    }


    return {
        mouseDown,
        mouseMove,
        mouseUp,
        noteMouseEnter,
        noteRightEdgeMouseEnter,
        noteMouseLeave,
        noteRightEdgeMouseLeave,

        cursor,

        current,
        simplify,
        copyOnDrag,
        constrainTime,
        constrainOctave,

        notesBeingCreated: notesBeingCreated,
    }
});