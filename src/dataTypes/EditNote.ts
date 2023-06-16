// represents a Note as displayed in the gui
// adding properties such as drag offset, selected, position in screen.
import { View } from "../store/viewStore";
import { Group, Groupable } from "./Group";
import { Note, NoteDefa, NoteDefb } from "./Note";

const makeRandomString = () => Math.random().toString(36).slice(2);
// TODO: memoize x, y ... rect ... etc
// perhaps could change all note vars into getters and setters thus allowing me to 
// register a "dirty" flag. needs a bit more thought.
export class EditNote extends Note implements Groupable {
    selected: boolean = false;
    udpateFlag: string;
    group?: Group;
    inViewRange?: boolean;
    /** 
     * make a clone of editnote. only note properties are cloned    
     * TODO: clone could now clone all the props. To get a clone of the 
     * note alone, now we can use get note.
     **/
    override clone(): EditNote {
        return new EditNote(this, this.view);
    }

    override apply(noteDef: NoteDefa | NoteDefb | Note) {
        super.apply(noteDef);
        if (noteDef instanceof EditNote) {
            this.selected = noteDef.selected;
        }
    }

    getNote(): Note {
        return new Note(this);
    }

    getNoteDefa(): NoteDefa {
        return {
            start: this.start,
            duration: this.duration,
            octave: this.octave,
            mute: this.mute,
            velocity: this.velocity,
        };
    }
    getNoteDefb(): NoteDefb {
        return {
            start: this.start,
            duration: this.duration,
            frequency: this.frequency,
            mute: this.mute,
            velocity: this.velocity,
        };
    }

    view: View;


    dragStart: (mouse: { x: number; y: number }) => void;
    dragMove: (dragDelta: { x: number; y: number }) => void;
    dragMoveOctaves: (octaveDelta: number) => void;
    dragMoveTimeStart: (dragDelta: number) => void;
    dragMoveVelocity: (mouse: { x: number; y: number }) => void;
    dragLengthMove: (mouse: { x: number; y: number }) => void;
    dragEnd: (mouse: { x: number; y: number }) => void;
    dragCancel: () => void;
    dragStartedTime = 0;
    dragStartedOctave = 0;
    dragStartedDuration = 0;
    dragStartedVelocity = 0;
    forceUpdate: () => void;

    constructor(noteDef: NoteDefa | NoteDefb | Note, view: View) {
        super(noteDef);

        if (noteDef instanceof EditNote) {
            this.selected = noteDef.selected;
        }

        this.view = view;
        this.udpateFlag = makeRandomString();

        this.dragStart = () => {
            this.dragStartedOctave = this.octave;
            this.dragStartedTime = this.start;
            this.dragStartedDuration = this.duration || 0;
            this.dragStartedVelocity = this.velocity;
        };
        this.dragMove = (dragDelta: { x: number; y: number }) => {
            this.start = this.dragStartedTime + view.pxToTime(dragDelta.x);
            this.octave = this.dragStartedOctave + view.pxToOctave(dragDelta.y);
            this.forceUpdate();
        };
        this.dragMoveOctaves = (octaveDelta: number) => {
            this.octave = this.dragStartedOctave + octaveDelta;
            this.forceUpdate();
        };
        this.dragMoveTimeStart = (timeDelta: number) => {
            this.start = this.dragStartedTime + timeDelta;
            this.forceUpdate();
        };
        this.dragLengthMove = (dragDelta: { x: number; y: number }) => {
            this.duration = Math.max(
                this.dragStartedDuration + view.pxToTime(dragDelta.x),
                0
            );
            this.forceUpdate();
        };
        this.dragMoveVelocity = (dragDelta: { x: number; y: number }) => {
            this.velocity =
                this.dragStartedVelocity + view.pxToVelocity(-dragDelta.y);
            if (this.velocity < 0) this.velocity = 0;
            if (this.velocity > 1) this.velocity = 1;
            this.forceUpdate();
        };
        this.forceUpdate = () => {
            this.udpateFlag = makeRandomString();
        };
        this.dragCancel = () => {
            this.start = this.dragStartedTime;
            this.octave = this.dragStartedOctave;
            this.duration = this.dragStartedDuration;
        };

        this.dragEnd = () => { };
    }
}
