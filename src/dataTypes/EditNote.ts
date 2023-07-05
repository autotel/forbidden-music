// represents a Note as displayed in the gui
// adding properties such as drag offset, selected, position in screen.
import { View } from "../store/viewStore";
import { Group } from "./Group";
import { Note, NoteDefa, NoteDefb } from "./Note";

const makeRandomString = () => Math.random().toString(36).slice(2);
// TODO: memoize x, y ... rect ... etc
// perhaps could change all note vars into getters and setters thus allowing me to 
// register a "dirty" flag. needs a bit more thought.
export class EditNote extends Note {
    selected: boolean = false;
    udpateFlag: string;
    // groupId: number | null = null;
    group: Group | null = null;
    /** 
     * make a clone of editnote. only note properties are cloned    
     * TODO: clone could now clone all the props. To get a clone of the 
     * note alone, now we can use get note.
     **/
    override clone(): EditNote {
        return new EditNote(this, this.view);
    }

    override apply(noteDef: NoteDefa | NoteDefb | Note){
        super.apply(noteDef);
        if(noteDef instanceof EditNote){
            this.selected = noteDef.selected;
        }
    }

    getNote(): Note {
        return new Note(this);
    }

    getNoteDefa(): NoteDefa {
        return {
            time: this.time,
            duration: this.duration,
            octave: this.octave,
            mute: this.mute,
            velocity: this.velocity,
        };
    }
    getNoteDefb(): NoteDefb {
        return {
            time: this.time,
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

    constructor(noteDef: NoteDefa | NoteDefb | Note, view: View) {
        super(noteDef);
        if(noteDef instanceof EditNote){
            this.selected = noteDef.selected;
        }

        this.view = view;
        this.udpateFlag = makeRandomString();

        this.dragStart = () => {
            this.dragStartedOctave = this.octave;
            this.dragStartedTime = this.time;
            this.dragStartedDuration = this.duration || 0;
            this.dragStartedVelocity = this.velocity;
        };
        this.dragMove = (dragDelta: { x: number; y: number }) => {
            this.time = this.dragStartedTime + view.pxToTime(dragDelta.x);
            this.octave = this.dragStartedOctave + view.pxToOctave(dragDelta.y);
        };
        this.dragMoveOctaves = (octaveDelta: number) => {
            this.octave = this.dragStartedOctave + octaveDelta;
        };
        this.dragMoveTimeStart = (timeDelta: number) => {
            this.time = this.dragStartedTime + timeDelta;
        };
        this.dragLengthMove = (dragDelta: { x: number; y: number }) => {
            this.duration = Math.max(
                this.dragStartedDuration + view.pxToTime(dragDelta.x),
                0
            );
        };
        this.dragMoveVelocity = (dragDelta: { x: number; y: number }) => {
            this.velocity =
                this.dragStartedVelocity + view.pxToVelocity(-dragDelta.y);
            if (this.velocity < 0) this.velocity = 0;
            if (this.velocity > 1) this.velocity = 1;
        };
        this.dragCancel = () => {
            this.time = this.dragStartedTime;
            this.octave = this.dragStartedOctave;
            this.duration = this.dragStartedDuration;
        };

        this.dragEnd = () => { };
    }
}
