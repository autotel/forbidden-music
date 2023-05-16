// represents a Note as displayed in the gui
// adding properties such as drag offset, selected, position in screen.
import { View } from "../store/viewStore";
import { makeNote, Note, NoteDefa, NoteDefb } from "./Note"

const makeRandomString = () => Math.random().toString(36).slice(2);

export class EditNote {
    note: Note;
    selected: boolean = false;
    udpateFlag: string;
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
        return this.note.duration ? this.view.timeToPx(this.note.duration) : 0;
    }
    get height() {
        // return Math.abs(this.view.octaveToPx(1 / 12))}
        return 18;
    }
    get circle() {
        return {
            cx: this.x,
            cy: this.y,
            r: this.height / 2
        }
    }
    get rect() {
        return {
            x: this.x,
            y: this.y - this.height / 2,
            width: this.width,
            height: this.height
        }
    }
    get rightEdge() {
        return {
            x: this.x + this.width - 5,
            y: this.y - this.height / 2,
            width: 5,
            height: this.height,
        }
    }

    dragStart: (mouse: { x: number, y: number }) => void;

    dragMove: (dragDelta: { x: number, y: number }) => void;
    dragMoveOctaves: (octaveDelta: number) => void;
    dragMoveTimeStart: (dragDelta: number) => void;

    dragLengthMove: (mouse: { x: number, y: number }) => void;
    dragEnd: (mouse: { x: number, y: number }) => void;
    dragCancel: () => void;
    dragStartedTime = 0;
    dragStartedOctave = 0;
    dragStartedDuration = 0;

    constructor(noteDef: NoteDefa | NoteDefb | Note, view: View) {
        this.note = makeNote(noteDef);
        this.view = view;
        this.udpateFlag = makeRandomString();

        this.dragStart = () => {
            this.dragStartedOctave = this.note.octave;
            this.dragStartedTime = this.note.start;
            this.dragStartedDuration = this.note.duration || 0;
        }
        this.dragMove = (dragDelta: { x: number, y: number }) => {
            this.note.start = this.dragStartedTime + view.pxToTime(dragDelta.x);
            this.note.octave = this.dragStartedOctave + view.pxToOctave(dragDelta.y);
            this.udpateFlag = makeRandomString();
        }
        this.dragMoveOctaves = (octaveDelta: number) => {
            this.note.octave = this.dragStartedOctave + octaveDelta;
            this.udpateFlag = makeRandomString();
        }
        this.dragMoveTimeStart = (timeDelta: number) => {
            this.note.start = this.dragStartedTime + timeDelta;
            this.udpateFlag = makeRandomString();
        }
        this.dragLengthMove = (dragDelta: { x: number, y: number }) => {
            this.note.duration = Math.max(this.dragStartedDuration + view.pxToTime(dragDelta.x), 0);
            this.udpateFlag = makeRandomString();
        }

        this.dragCancel = () => {
            this.note.start = this.dragStartedTime;
            this.note.octave = this.dragStartedOctave;
            this.note.duration = this.dragStartedDuration;
        }

        this.dragEnd = () => {

        }
    }
}