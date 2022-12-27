// represents a Note as displayed in the gui
// adding properties such as drag offset, selected, position in screen.
import { View } from "../store/viewStore";
import { makeNote, Note, NoteDefa, NoteDefb } from "./Note"


export class EditNote {
    note: Note;
    selected: boolean = false;
    udpateFlag: string = "";
    /** make a clone of editnote. only note properties are cloned*/
    clone() {
        return new EditNote(this.note, this.view);
    }
    view: View;

    get x() {
        return this.view.timeToPxWithOffset(this.note.start)
    }
    get y() {
        return this.view.octaveToPxWithOffset(this.note.octave)
    }
    get width() {
        return this.view.timeToPx(this.note.duration)
    }
    get height() {
        return Math.abs(this.view.octaveToPx(1 / 12))
    }
    get rect() {
        return {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height
        }
    }
    get rightEdge() {
        return {
            x: this.x + this.width - 5,
            y: this.y,
            width: 5,
            height: this.height,
        }
    }

    dragStart: (mouse: { x: number, y: number }) => void;
    dragMove: (dragDelta: { x: number, y: number }) => void;
    dragLengthMove: (mouse: { x: number, y: number }) => void;
    dragEnd: (mouse: { x: number, y: number }) => void;

    constructor(noteDef: NoteDefa | NoteDefb | Note, view: View) {
        this.note = makeNote(noteDef);
        this.view = view;
        let dragStartedTime = 0;
        let dragStartedOctave = 0;
        let dragStartedDuration = 0;

        this.dragStart = () => {
            dragStartedOctave = this.note.octave;
            dragStartedTime = this.note.start;
            dragStartedDuration = this.note.duration;
        }

        this.dragMove = (dragDelta: { x: number, y: number }) => {
            console.log(JSON.stringify(dragDelta));
            this.note.start = dragStartedTime + view.pxToTime(dragDelta.x);
            this.note.octave = dragStartedOctave + view.pxToOctave(dragDelta.y);
        }

        this.dragLengthMove = (dragDelta: { x: number, y: number }) => {
            this.note.duration = Math.max(dragStartedDuration + view.pxToTime(dragDelta.x), 0);
        }

        this.dragEnd = () => {

        }
    }
}