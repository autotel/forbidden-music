import { KeyActions, getActionForKeys } from "../keyBindings";
import { useProjectStore } from "../store/projectStore";
import { useSelectStore } from "../store/selectStore";
import { useToolStore } from "../store/toolStore";
import { Trace, transposeTime } from '../dataTypes/Trace';
import { usePlaybackStore } from "../store/playbackStore";
import { Tool } from "../dataTypes/Tool";
import { useHistoryStore } from "../store/historyStore";
import { useViewStore } from "../store/viewStore";

interface Stores {
    tool: ReturnType<typeof useToolStore>,
    project: ReturnType<typeof useProjectStore>
    selection: ReturnType<typeof useSelectStore>
    playback: ReturnType<typeof usePlaybackStore>
    history: ReturnType<typeof useHistoryStore>
    view: ReturnType<typeof useViewStore>
}

export const keyBindingsListener = (e: KeyboardEvent, stores: Stores) => {
    const {
        tool, project, selection, playback, history, view
    } = stores
    const keyAction = getActionForKeys(e.key, e.ctrlKey, e.shiftKey, e.altKey);
    switch (keyAction) {
        case KeyActions.Cut: {
            console.log("cut");
            const selected = selection.getNotes();
            project.notes = project.notes.filter(note => !note.selected);
            navigator.clipboard.writeText(project.stringifyNotes(selected));
            break;
        }
        case KeyActions.Copy: {
            console.log("copy");
            const selected = selection.getNotes();
            navigator.clipboard.writeText(project.stringifyNotes(selected));
            break;
        }
        case KeyActions.Paste: {
            console.log("paste");
            (async () => {
                const text = await navigator.clipboard.readText();
                const editNotes = project.parseNotes(text);

                const earliestPastedNote = editNotes.reduce((acc, note) => note.time < acc.time ? note : acc, editNotes[0]);
                let timeDiff = view.pxToTimeWithOffset(tool.mouse.pos.x) - earliestPastedNote.time;

                if (tool.noteThatWouldBeCreated) {
                    const datumNote = tool.noteThatWouldBeCreated as Trace;
                    timeDiff = datumNote.time - earliestPastedNote.time;
                }

                editNotes.forEach(note => {
                    transposeTime(note, timeDiff);
                })

                project.notes.push(...editNotes);
                selection.select(...editNotes);

            })();
            break;
        }
        case KeyActions.Delete: {
            project.notes = project.notes.filter(note => !note.selected)
            project.loops = project.loops.filter(note => !note.selected)
            project.lanes.lanes.forEach((lane) => lane.content = lane.content.filter(p => !p.selected))
            // minimalistic option:
            // tool.noteBeingHovered = false;
            // programmatic option:
            tool.resetState();
            selection.clear();
            break;
        }
        case KeyActions.ActivateCopyOnDrag: {
            tool.copyOnDrag = true;
            break;
        }
        case KeyActions.PlayPause: {
            e.preventDefault();
            if (playback.playing) {
                playback.stop();
            } else {
                playback.play();
            }
            break;
        }
        case KeyActions.ActivateAreaSelectionMode: {
            tool.currentLeftHand = Tool.Select;
            break;
        }
        case KeyActions.ActivateModulationMode: {
            tool.current = tool.current === Tool.Modulation ? Tool.Edit : Tool.Modulation;
            break;
        }
        case KeyActions.ActivateAutomationMode: {
            tool.current = tool.current === Tool.Automation ? Tool.Edit : Tool.Automation;
            break;
        }
        case KeyActions.ActivateLoopMode: {
            tool.current = tool.current === Tool.Loop ? Tool.Edit : Tool.Loop;
            break;
        }
        case KeyActions.MuteSelectedEvents: {
            e.preventDefault();
            selection.getNotes().forEach(eNote => eNote.mute = !eNote.mute);
            break;
        }
        case KeyActions.Undo: {
            console.log("undo");
            history.undo();
            e.preventDefault();
            e.stopPropagation();
            break;
        }
        case KeyActions.SelectAll: {
            console.log("select all");
            selection.selectAll();
            e.preventDefault();
            e.stopPropagation();
            break;
        }
        case KeyActions.MoveDown: {
            console.log("move down");
            selection.getNotes().forEach(eNote => eNote.octave -= 1);
            e.preventDefault();
            e.stopPropagation();
            break;
        }
        case KeyActions.MoveUp: {
            console.log("move up");
            selection.getNotes().forEach(eNote => eNote.octave += 1);
            e.preventDefault();
            e.stopPropagation();

            break;
        }
        case KeyActions.MoveLeft: {
            console.log("move left");
            selection.getNotes().forEach(eNote => transposeTime(eNote, -1));
            e.preventDefault();
            e.stopPropagation();
            break;
        }
        case KeyActions.MoveRight: {
            console.log("move right");
            selection.getNotes().forEach(eNote => transposeTime(eNote, 1));
            e.preventDefault();
            e.stopPropagation();
            break;
        }
        case KeyActions.Exit: {
            selection.clear();
            tool.resetState();
            break;
        }
        case KeyActions.OnlyAllowHorizontalMovement: {
            tool.disallowOctaveChange = !tool.disallowOctaveChange;
            break;
        }
        case KeyActions.OnlyAllowVerticalMovement: {
            tool.disallowTimeChange = !tool.disallowTimeChange;
            break;
        }
        case KeyActions.Reboot: {
            window.location.reload();
            // lol
            break;
        }

    }
}