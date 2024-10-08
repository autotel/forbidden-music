import { AutomationPoint, automationPoint } from "@/dataTypes/AutomationPoint";
import { Note, note } from "@/dataTypes/Note";
import { TimeRange } from "@/dataTypes/TimelineItem";
import { transposeTime } from "@/dataTypes/Trace";
import { getNotesInRange } from "@/functions/getEventsInRange";
import { useAutomationLaneStore } from "@/store/automationLanesStore";
import { useLoopsStore } from "@/store/loopsStore";
import { useNotesStore } from "@/store/notesStore";

export const useTimeRangeEdits = () => {
    const lanes = useAutomationLaneStore();
    const loops = useLoopsStore();
    const notes = useNotesStore();

    /**
     * duplicate all events in time range, and shift all events after the time range
     */
    const duplicateTimeRange = (sourceRange: TimeRange) => {
        /** Automation points after time start */
        const automationPointsAfterLoop = lanes.getAutomationsForTime(
            sourceRange.time, Infinity, true
        );

        /** Notes after loop start */
        const notesAfterLoop = getNotesInRange(notes.list, {
            time: sourceRange.time,
            timeEnd: Infinity,
        });

        const loopsAfterLoopEnd = loops.list.filter((otherLoop) => {
            return otherLoop.time >= sourceRange.timeEnd;
        });

        const timeDuration = sourceRange.timeEnd - sourceRange.time;

        const insideCloneArea = (time: number) => {
            return time >= sourceRange.time && time < sourceRange.timeEnd;
        }
        // TODO: possibly I could generalize the shifting of whichever trace
        // instead of going type by type

        // shift loops
        loopsAfterLoopEnd.forEach((loop) => {
            console.log("shift loop", loop.time);
            loop.time += timeDuration;
            loop.timeEnd += timeDuration;
            console.log(" >> ", loop.time);
        })

        // clone autom. 
        for (let [lane, points] of automationPointsAfterLoop) {
            // if within loop time, clone, otherwise only shift
            const toPush: AutomationPoint[] = [];
            points.forEach((point) => {
                // counter-intuitiely, the cloned points are the ones who remain in the same time
                if (insideCloneArea(point.time)) {
                    toPush.push(automationPoint(point));
                }
                transposeTime(
                    point,
                    timeDuration
                )
            });
            lane.content.push(...toPush);
        }
        // clone notes
        let notesToPush: Note[] = [];
        notesAfterLoop.forEach((originalNote) => {
            if (insideCloneArea(originalNote.time)) {
                notesToPush.push(note(originalNote));
            }
            transposeTime(
                originalNote,
                timeDuration
            );
        });
        notes.list.push(...notesToPush);

    }


    return {
        duplicateTimeRange
    }
}