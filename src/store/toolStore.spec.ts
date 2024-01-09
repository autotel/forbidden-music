import { createPinia, setActivePinia } from 'pinia';
import { describe, expect, it } from 'vitest';
import { loop } from '../dataTypes/Loop';
import { Note, note } from '../dataTypes/Note';
import { getDuration } from '../dataTypes/TimelineItem';
import { useProjectStore } from './projectStore';
import { useSnapStore } from './snapStore';
import { useToolStore } from './toolStore';
import { useViewStore } from './viewStore';
describe('toolStore', () => {
    setActivePinia(createPinia());
    const project = useProjectStore();
    const snap = useSnapStore();
    const view = useViewStore();
    const toolStore = useToolStore();
    const testScore = [
        { "octave": 4, "time": 1, "timeEnd": 3, "mute": false, "velocity": 0.7, "layer": 0 },
        { "octave": 4.3, "time": 1, "timeEnd": 3, "mute": false, "velocity": 0.7, "layer": 0 },
        { "octave": 4.2, "time": 3, "timeEnd": 5, "mute": false, "velocity": 0.7, "layer": 0 },
        { "octave": 4.5, "time": 3, "timeEnd": 5, "mute": false, "velocity": 0.7, "layer": 0 },
        { "octave": 4.3, "time": 5, "timeEnd": 7, "mute": false, "velocity": 0.7, "layer": 0 },
        { "octave": 4.6, "time": 5, "timeEnd": 7, "mute": false, "velocity": 0.7, "layer": 0 }
    ].map(note);
    const testLoops = [
        { time: 3, timeEnd: 7 },
    ].map(loop);

    Object.keys(snap.values).forEach(key => {
        snap.values[key].active = false;
    });

    project.append(...testScore, ...testLoops);

    const noteMover = (noteToMove: Note, octaveDelta: number, timeDelta: number) => {
        toolStore.timelineItemMouseEnter(noteToMove);
        // it might be necessary in the future to ensure that the 
        // event happens at the location of the timeline item 
        toolStore.mouseDown(
            new MouseEvent("mousedown", {
                clientX: 0,
                clientY: 0
            })
        );

        const yPxDistanceMove = view.octaveToPx(octaveDelta);
        const xPxDistanceMove = view.timeToPx(timeDelta);

        toolStore.mouseMove(
            new MouseEvent("mousemove", {
                clientX: xPxDistanceMove,
                clientY: yPxDistanceMove
            })
        );

        toolStore.mouseUp(
            new MouseEvent("mouseup", {
                clientX: xPxDistanceMove,
                clientY: yPxDistanceMove
            })
        );

        toolStore.timelineItemMouseLeave();
    }

    it('can select and drag-move a note horizontally', () => {
        for (let i = 0; i < project.notes.length; i++) {
            const noteToMove = project.notes[i];
            const origintalNoteTime = noteToMove.time;
            const timeDelta = i* 1.2 - 5;
            noteMover(noteToMove, 0, timeDelta);
            expect(noteToMove.time).toBeCloseTo(
                origintalNoteTime + timeDelta, 1
            );
            noteToMove.time = origintalNoteTime;
        }
    });

    it('can select and drag-move a note vertically', () => {
        for (let i = 0; i < project.notes.length; i++) {
            const noteToMove = project.notes[i];
            const origintalNoteOctave = noteToMove.octave;
            const octaveDelta = i* 1.2 - 5;
            noteMover(noteToMove, octaveDelta, 0);
            expect(noteToMove.octave).toBeCloseTo(
                origintalNoteOctave + octaveDelta, 1
            );
            noteToMove.octave = origintalNoteOctave;
        }
    });

    it('note lengths are not affected by drag', () => {
        for (let i = 0; i < project.notes.length; i++) {
            const timeDelta = i* 1.2 - 5;
            const noteToMove = project.notes[i];
            const origintalNoteTime = noteToMove.time;
            const originalNoteDuration = getDuration(noteToMove);
            
            noteMover(noteToMove, 0, timeDelta);
            expect(originalNoteDuration).toBeCloseTo(
                getDuration(noteToMove), 1
            );
            noteToMove.time = origintalNoteTime;
        }
    });

});