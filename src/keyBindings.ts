export enum KeyActions {
    None,
    Cut, Copy, Paste,
    Delete,
    ActivateCopyOnDrag,
    PlayPause,
    ActivateAreaSelectionMode,
    ActivateModulationMode,
    ActivateLoopMode,
    MuteSelectedEvents,
    Save,
    SaveAs,
    Undo,
    Download,
    SelectAll,
    MoveDown,
    MoveUp,
    MoveLeft,
    MoveRight,
    Exit,
    OnlyAllowHorizontalMovement,
    OnlyAllowVerticalMovement,
    Reboot,
}

type KeyActionTuple = [KeyActions, string, boolean, boolean, boolean];

const keyBindings: KeyActionTuple[] = [
    [KeyActions.Delete, 'Delete', false, false, false],
    [KeyActions.Delete, 'Backspace', false, false, false],
    [KeyActions.Cut, 'x', true, false, false],
    [KeyActions.Copy, 'c', true, false, false],
    [KeyActions.Paste, 'v', true, false, false],
    [KeyActions.ActivateCopyOnDrag, 'Alt', false, false, false],
    [KeyActions.PlayPause, ' ', false, false, false],
    [KeyActions.ActivateAreaSelectionMode, 'Control', false, false, false],
    [KeyActions.ActivateModulationMode, 'm', false, false, false],
    [KeyActions.ActivateLoopMode, 'l', false, false, false],
    [KeyActions.MuteSelectedEvents, 'm', true, false, false],
    [KeyActions.Save, 's', true, false, false],
    [KeyActions.SaveAs, 's', true, false, false],
    [KeyActions.Undo, 'z', true, false, false],
    [KeyActions.Download, 'd', true, false, false],
    [KeyActions.SelectAll, 'a', true, false, false],
    [KeyActions.MoveDown, 'ArrowDown', true, false, false],
    [KeyActions.MoveUp, 'ArrowUp', true, false, false],
    [KeyActions.MoveLeft, 'ArrowLeft', true, false, false],
    [KeyActions.MoveRight, 'ArrowRight', true, false, false],
    [KeyActions.Exit, 'Escape', false, false, false],
    [KeyActions.OnlyAllowHorizontalMovement, 'h', false, false, false],
    [KeyActions.OnlyAllowVerticalMovement, 'v', false, false, false],
    [KeyActions.Reboot, 'r', true, false, false],
];

export const logKeys = (e: KeyboardEvent) => {
    const ctrlKey = e.ctrlKey || e.metaKey;
    console.log(
        "action:", getActionForKeys(e.key, e.ctrlKey, e.shiftKey, e.altKey),
        "key:", e.key,
        "ctrl:", e.ctrlKey,
        "shift:", e.shiftKey,
        "alt:", e.altKey,
    );
}

export const getActionForKeys = (key: string, ctrlKey = false, shiftKey = false, altKey = false): KeyActions => {
    const keyActionTuples = keyBindings.filter((keyActionTuple) => {
        const [_action, key_, ctrlKey_, shiftKey_, altKey_] = keyActionTuple;
        let result = key_ === key;
        if (ctrlKey_) result = result && ctrlKey;
        if (shiftKey_) result = result && shiftKey;
        if (altKey_) result = result && altKey;
        return result;
    });
    if (!keyActionTuples.length) return KeyActions.None;

    const mostSpecific = keyActionTuples.sort((a, b) => (
        (b[2] ? 1 : 0) +
        (b[3] ? 1 : 0) +
        (b[4] ? 1 : 0)
    ) - (
            (a[2] ? 1 : 0) +
            (a[3] ? 1 : 0) +
            (a[4] ? 1 : 0)
        )
    );

    const [action] = mostSpecific[0];
    return action;
}

export const getKeysForAction = (action: KeyActions): {
    key: string, alt: boolean, ctrl: boolean, shift: boolean
}[] => {
    const keyActionTuples = keyBindings.filter((keyActionTuple) => {
        const [action_, _key, _ctrlKey, _shiftKey, _altKey] = keyActionTuple;
        return action_ === action;
    });
    if (!keyActionTuples) return [];
    return keyActionTuples.map(([_, key, ctrl, shift, alt]) => ({ key, ctrl, shift, alt }));
}
export const getKeyCombinationString = (action: KeyActions, enclose = true): string[] => {
    const keys = getKeysForAction(action);
    return keys.map(({ key, ctrl, shift, alt }) => {
        const modifiers = [];
        if (ctrl) modifiers.push('Ctrl');
        if (alt) modifiers.push('Alt');
        if (shift) modifiers.push('Shift');
        if (!modifiers.length) return key;
        const basic = `${modifiers.join('+')}+${key}`;
        if (!enclose) return basic;
        return `[${basic}]`;
    });
}