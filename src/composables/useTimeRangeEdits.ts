import { AutomationPoint, automationPoint } from "@/dataTypes/AutomationPoint";
import { loop, Loop } from "@/dataTypes/Loop";
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
        const rangeCopy: TimeRange = {
            time: sourceRange.time,
            timeEnd: sourceRange.timeEnd,
        };
        /** Automation points after time start */
        const automationPointsAfterLoop = lanes.getAutomationsForTime(
            rangeCopy.time, Infinity, true
        );

        /** Notes after loop start */
        const notesAfterLoop = getNotesInRange(notes.list, {
            time: rangeCopy.time,
            timeEnd: Infinity,
        });

        /** Loops after loop start */
        const loopsAfterLoop = loops.list.filter((otherLoop) => {
            return otherLoop.time >= rangeCopy.time;
        });

        const timeDuration = rangeCopy.timeEnd - rangeCopy.time;

        const insideCloneArea = (time: number) => {
            return time >= rangeCopy.time && time < rangeCopy.timeEnd;
        }

        // TODO: possibly I could generalize the shifting of whichever trace
        // instead of going type by type

        // shift + clone autom. 
        for (let [lane, points] of automationPointsAfterLoop) {
            const automationsToPush: AutomationPoint[] = [];
            points.forEach((point) => {
                // if within loop time, clone, otherwise only shift
                if (insideCloneArea(point.time)) {
                    automationsToPush.push(automationPoint(point));
                }
                transposeTime(
                    point,
                    timeDuration
                )
            });
            lane.content.push(...automationsToPush);
        }
        // shift + clone notes
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

        // shift + clone loops
        let loopsToPush: Loop[] = [];
        loopsAfterLoop.forEach((originalLoop) => {
            if (insideCloneArea(originalLoop.time)) {
                loopsToPush.push(loop(originalLoop));
            }
            transposeTime(originalLoop, timeDuration);
        })
        loops.append(...loopsToPush);
    }

    return {
        duplicateTimeRange
    }
}