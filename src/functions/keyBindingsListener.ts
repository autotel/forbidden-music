import { KeyActions, getActionForKeys } from "../keyBindings";
import { useProjectStore } from "../store/projectStore";
import { useSelectStore } from "../store/selectStore";
import { useToolStore } from "../store/toolStore";
import { Trace, transposeTime } from '../dataTypes/Trace';
import { usePlaybackStore } from "../store/playbackStore";
import { Tool } from "../dataTypes/Tool";
import { useHistoryStore } from "../store/historyStore";
import { useViewStore } from "../store/viewStore";
import { useNotesStore } from "../store/notesStore";

interface Stores {
    tool: ReturnType<typeof useToolStore>,
    project: ReturnType<typeof useProjectStore>
    notes: ReturnType<typeof useNotesStore>
    selection: ReturnType<typeof useSelectStore>
    playback: ReturnType<typeof usePlaybackStore>
    history: ReturnType<typeof useHistoryStore>
    view: ReturnType<typeof useViewStore>
}

export const keyBindingsListener = (e: KeyboardEvent, stores: Stores) => {
    const {
        tool, selection, playback, history, view, notes
    } = stores
    const keyAction = getActionForKeys(e.key, e.ctrlKey, e.shiftKey, e.altKey);
    switch (keyAction) {
        case KeyActions.Cut: {
            const selected = selection.getNotes();
            notes.list = notes.list.filter(note => !note.selected);
            navigator.clipboard.writeText(notes.stringify(selected));
            break;
        }
        case KeyActions.Copy: {
            const selected = selection.getNotes();
            navigator.clipboard.writeText(notes.stringify(selected));
            break;
        }
        case KeyActions.Paste: {
            (async () => {
                const text = await navigator.clipboard.readText();
                const editNotes = notes.parse(text);

                const earliestPastedNote = editNotes.reduce((acc, note) => note.time < acc.time ? note : acc, editNotes[0]);
                let timeDiff = view.pxToTimeWithOffset(tool.mouse.pos.x) - earliestPastedNote.time;

                if (tool.noteThatWouldBeCreated) {
                    const datumNote = tool.noteThatWouldBeCreated as Trace;
                    timeDiff = datumNote.time - earliestPastedNote.time;
                }

                editNotes.forEach(note => {
                    transposeTime(note, timeDiff);
                })

                notes.append(...editNotes);
                selection.select(...editNotes);

            })();
            break;
        }
        case KeyActions.Delete: {
            selection.deleteSelected();
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
            history.undo();
            e.preventDefault();
            e.stopPropagation();
            break;
        }
        case KeyActions.SelectAll: {
            selection.selectAll();
            e.preventDefault();
            e.stopPropagation();
            break;
        }
        case KeyActions.MoveDown: {
            selection.getNotes().forEach(eNote => eNote.octave -= 1);
            e.preventDefault();
            e.stopPropagation();
            break;
        }
        case KeyActions.MoveUp: {
            selection.getNotes().forEach(eNote => eNote.octave += 1);
            e.preventDefault();
            e.stopPropagation();

            break;
        }
        case KeyActions.MoveLeft: {
            selection.getNotes().forEach(eNote => transposeTime(eNote, -1));
            e.preventDefault();
            e.stopPropagation();
            break;
        }
        case KeyActions.MoveRight: {
            selection.getNotes().forEach(eNote => transposeTime(eNote, 1));
            e.preventDefault();
            e.stopPropagation();
            break;
        }
        case KeyActions.Exit: {
            const currentFocus = document.activeElement as HTMLElement;
            if (currentFocus) {
                currentFocus.blur();
            }
            document.body.focus();
            selection.clear();
            tool.resetState();
            tool.current = Tool.Edit;
            break;
        }
        case KeyActions.OnlyAllowHorizontalMovement: {
            tool.mouse.disallowOctaveChange = !tool.mouse.disallowOctaveChange;
            break;
        }
        case KeyActions.OnlyAllowVerticalMovement: {
            tool.mouse.disallowTimeChange = !tool.mouse.disallowTimeChange;
            break;
        }
        case KeyActions.Reboot: {
            window.location.reload();
            // lol
            break;
        }
        case KeyActions.ActivateEraserMode: {
            tool.current = tool.current === Tool.Eraser ? Tool.Edit : Tool.Eraser;
            break;
        }
    }
}