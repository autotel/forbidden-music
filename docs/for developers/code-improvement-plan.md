# Code improvement plan

Plan for an automated agent (or a human) to improve stability, correctness and readability.
Every claim below was verified against the code on branch `next-upgradedvitest` (2026-07-16);
line numbers refer to that state. Re-locate by symbol name if lines have drifted.

## Ground rules

- Work in the order given: bugs first, then dead code, then renames. Renames last so they
  don't pollute the diffs of the bug fixes.
- After **every** phase run:
  - `npx vue-tsc --noEmit` (typecheck — currently passes with zero errors, keep it that way)
  - `npx vitest run` (browser-mode tests via playwright; some are screenshot tests — if a
    screenshot test fails, inspect whether the pixel change is expected before regenerating)
- One commit per numbered item (or per phase for the mechanical rename phase).
- Do not refactor beyond what each item states. Several stores are tightly coupled;
  broad restructuring is out of scope.

---

## Phase 1 — Bugs (stability / implementation mistakes)

### 1.1 `exists()` always returns truthy — "File already exists" on every save-as
[src/store/libraryStore.ts:127](../../src/store/libraryStore.ts#L127)

```ts
const exists = (filename: string) => {
    return userSettingsStorage.getItem(filename) !== null;
}
```

`userSettingsStorage.getItem` returns `Promise<string | null>` (see
`AsyncStorage` in [src/store/userSettingsStorageFactory.ts:4](../../src/store/userSettingsStorageFactory.ts#L4)).
A Promise is never `null`, so `exists()` is always truthy and
`saveToNewLibraryItem` (line 142) always throws `"File already exists"`.

**Fix:** `const exists = async (filename) => (await userSettingsStorage.getItem(filename)) !== null;`
and `await` it in `saveToNewLibraryItem` (which must become `async`).

### 1.2 Async saves not awaited — errors escape try/catch, false "in sync" state
[src/store/libraryStore.ts:142-197](../../src/store/libraryStore.ts#L142-L197)

`saveToLocalStorage` is `async`, but `saveToNewLibraryItem`, `saveCurrent` and `autoSave`
call it without `await` inside `try/catch`. Consequences:

- A storage failure becomes an unhandled promise rejection; the `catch` block and the
  `errorThrow` parameter of `saveCurrent` can never see it.
- `inSyncWithStorage.value = true` is set before the write has actually happened.

**Fix:** make all three functions `async` and `await saveToLocalStorage(...)`.
Also `await` `deleteItem(filename)` in `deleteItemNamed` before `udpateItemsList()`,
otherwise the refreshed list can still contain the deleted entry
([src/store/libraryStore.ts:215](../../src/store/libraryStore.ts#L215)).
Check the callers in [src/right-pane/FileManager.vue](../../src/right-pane/FileManager.vue) and
[src/right-pane/WorkingMemory.vue](../../src/right-pane/WorkingMemory.vue) — fire-and-forget is fine
there, but do not swallow the returned promise if they display errors.

### 1.3 Undo starts playback even when stopped
[src/store/historyStore.ts:43-63](../../src/store/historyStore.ts#L43-L63)

`undoApplicator` unconditionally does `playback.stop(); playback.currentScoreTime = ...; playback.play();`.
Undoing while playback is stopped therefore starts playing.

**Fix:** capture `const wasPlaying = playback.playing` before applying the definition; only
call `stop()`/`play()` when `wasPlaying` is true.

### 1.4 `play()` throws "timeout already exists" when already playing
[src/store/playbackStore.ts:375-388](../../src/store/playbackStore.ts#L375-L388)

`play()` sets `playing.value = true` and *then* throws if `currentTimeout.value` exists.
Reachable path: `enqueueLoop` ([line 234](../../src/store/playbackStore.ts#L234)) calls `play()`
whenever `!(playing.value && loopNowHierarchical)` — i.e. also when playback is running but
the playhead is not inside a loop. Result: exception mid-interaction, state left inconsistent.

**Fix:** make `play()` an idempotent no-op when already playing
(`if (currentTimeout.value) return;` at the top, before mutating any state).

### 1.5 Tauri MIDI: duplicate event listeners, `stop()` unimplemented
[src/store/playbackStore.ts:60-73](../../src/store/playbackStore.ts#L60-L73)

Every call to a Tauri input's `start()` registers a fresh `listen('midi_message', ...)`
and never keeps the unlisten function. Switching inputs back and forth (the
`watch(currentMidiInput, ...)` at line 171 calls `start()` each time) stacks listeners →
duplicated MIDI events. `stop()` only logs a warning.

**Fix:** store the `UnlistenFn` returned by `listen(...)` on the input object; call it in
`stop()`. Guard `start()` against double registration.

### 1.6 Edge-drag correlates a *live* selection with a drag-start snapshot
[src/store/toolStore.ts:260-267](../../src/store/toolStore.ts#L260-L267) and
[toolStore.ts:294-300](../../src/store/toolStore.ts#L294-L300)

`mouseDragTracesRightEdge` / `mouseDragTracesLeftEdge` iterate `selection.getTraces()`
(evaluated *now*) and index into `drag.tracesWhenDragStarted` (snapshot from drag start):

```ts
const selectedTraces = selection.getTraces();
selectedTraces.forEach((trace, index) => {
    const correlativeDragStartClone = drag.tracesWhenDragStarted[index];
    ...
    trace.timeEnd = correlativeDragStartClone.timeEnd + durationDeltaAfterSnap; // TypeError if undefined
```

If the selection changed since drag start (or ordering differs), `correlativeDragStartClone`
is `undefined` → uncaught TypeError. Note the sibling `mouseDragSelectedTraces`
(line 158) correctly iterates the `drag.traces` snapshot instead.

**Fix:** iterate `drag.traces` (with its parallel `drag.tracesWhenDragStarted`) in both
edge-drag functions, exactly like `mouseDragSelectedTraces` does. Keep the
`layers.isTraceLocked` guard from the right-edge version (the left-edge version relies on a
comment saying locked traces can't get here — after the fix both can share the guard).

### 1.7 `emptyProjectDefinition` is a shared mutable module singleton
[src/store/projectStore.ts:21-34](../../src/store/projectStore.ts#L21-L34)

One object instance is reused for every "clear"/"empty project" operation, and its
`created`/`edited` timestamps are frozen at module load. Anything that mutates the loaded
project definition (e.g. migrators in `normalizeLibraryItem` mutate their input) would
poison every future empty project.

**Fix:** replace the constant with a factory `const emptyProjectDefinition = (): LibraryItem => ({ ... })`
and call it at the two use sites ([lines 131, 154](../../src/store/projectStore.ts#L131)).

### 1.8 Right-button mouse-up commits notes being created
[src/store/toolStore.ts:1007](../../src/store/toolStore.ts#L1007)

```ts
if (mouse.tracesBeingCreated.length && e.button !== 1) {
```

The intent is "commit on the button that draws". Since right-drag now pans the view
(App.vue), a right-click released mid note-creation drag commits the note early.

**Fix:** change condition to `e.button === 0`. Note `touchUp` funnels through `mouseUp`
with a `Touch` object that has **no** `button` property (`undefined !== 1` was truthy,
`undefined === 0` is not!) — so also update `touchUp`
([toolStore.ts:660](../../src/store/toolStore.ts#L660)) to pass `button: 0`, and type the
`mouseUp` parameter properly (`{ clientX, clientY, button }`) instead of `e: any`.
**Add/extend a touch spec assertion** that a touch-created note still gets appended
(`src/App-touch edits.spec.ts` covers this area).

### 1.9 `isOctaveInView` math is suspect — verify, then fix or delete
[src/store/viewStore.ts:437-443](../../src/store/viewStore.ts#L437-L443)

```ts
const ioctave = viewHeightOctaves.value - octave;
return ioctave >= octaveOffset.value && ioctave <= octaveOffset.value + viewHeightOctaves.value;
```

Compare with `octaveToPxWithOffset` (line 431): a coordinate is on-screen when
`0 <= octaveToPxWithOffset(octave) <= viewHeightPx`. The formula above doesn't reduce to
that. Only consumer is grid-line culling in
[src/store/gridsStore.ts:65,83](../../src/store/gridsStore.ts#L65).

**Fix:** reimplement as
`const px = octaveToPxWithOffset(octave); return px >= 0 && px <= viewHeightPx.value;`
then verify grid lines still render across the visible range while zooming/panning
(run the app, or the snap/grid screenshot specs). If rendering was compensating for the
wrong formula elsewhere, stop and report rather than stacking a second workaround.

### 1.10 `window.onfocus` assignment clobbers other handlers
[src/store/libraryStore.ts:273](../../src/store/libraryStore.ts#L273)

**Fix:** `window.addEventListener('focus', () => userSettingsStorage.syncFromLocalStorage());`

---

## Phase 2 — Dead code and duplication

### 2.1 Duplicate `ZoomWheel.vue`
[src/overlays/ZoomWheel.vue](../../src/overlays/ZoomWheel.vue) is byte-identical to
[src/components/ZoomWheel.vue](../../src/components/ZoomWheel.vue). Only the `components/`
one is imported (App.vue:17). **Delete `src/overlays/ZoomWheel.vue`.**

### 2.2 Dead variables / functions
- `memoizedNoteRects` in [viewStore.ts:114](../../src/store/viewStore.ts#L114) is pushed to
  and cleared but never read. Delete it, the pushes (line 171), and the clear in
  `forceRefreshVisibleNotes` (line 384). This also removes the side-effect-in-computed smell
  in `visibleNoteDrawables`.
- `erasing` in [toolStore.ts:402](../../src/store/toolStore.ts#L402) — declared, never used. Delete.
- `clockTicker` in [playbackStore.ts:138](../../src/store/playbackStore.ts#L138) — empty body,
  only passed into midi handlers. Verify the midi input handler signatures
  (`src/midiInputHandlers/*`) and either implement or delete the parameter chain.
- `exportMIDIPitchBend` in [libraryStore.ts:244](../../src/store/libraryStore.ts#L244) — empty
  function exported. Delete (check no template references it first).

### 2.3 Duplicated pan logic in App.vue
[src/App.vue:88-101](../../src/App.vue#L88-L101) (mouse) and
[src/App.vue:172-193](../../src/App.vue#L172-L193) (touch) contain the same
"apply delta to offsets, clamp to bounds" block. Extract:

```ts
const panViewTo = (deltaX: number, deltaY: number) => {
    view.timeOffset = viewDragStartTime - view.pxToTime(deltaX);
    view.octaveOffset = viewDragStartOctave + view.pxToOctave(deltaY);
    if (view.timeOffset < 0) view.timeOffset = 0;
    if (view.timeOffset > view.scrollBound - view.viewWidthTime) {
        view.timeOffset = view.scrollBound - view.viewWidthTime;
    }
};
```

While here: in `touchMoveListener`, `e.touches[0]` / `e.touches[1]` are accessed unguarded
while `draggingView` is true ([App.vue:179](../../src/App.vue#L179)); guard with
`e.touches.length >= 2` before computing pinch distance (single remaining finger should
just pan, not throw).

### 2.4 Erase bypasses any notes API
[src/store/toolStore.ts:319-323](../../src/store/toolStore.ts#L319-L323) splices
`notes.list` directly. Add a `remove(...traces)` method to `notesStore` and use it, so
deletion has one code path (and one place to hook history/selection cleanup later).

---

## Phase 3 — Performance and logging hygiene

### 3.1 History snapshotting compresses the whole project every second
[src/store/historyStore.ts:14-20](../../src/store/historyStore.ts#L14-L20)

`JSON.stringify` + lzutf8 `compress` of the entire project runs on a 1 s interval forever,
even when idle. Cheap improvement without redesign:

- Compare the raw JSON string to the previous JSON string first; only compress when it changed.
- Skip the tick entirely when `document.hidden`.

Keep the interval handle and clear it if the store ever gets a dispose path (low priority).

### 3.2 Console noise
115 `console.log` calls in `src/` (non-test). Worst offender: every keystroke logs
`"key down"` ([src/App.vue:233](../../src/App.vue#L233)). A `devLog` helper already exists in
[src/functions/isDev.ts](../../src/functions/isDev.ts). Replace `console.log` with `devLog`
in: `App.vue`, `toolStore.ts`, `playbackStore.ts`, `historyStore.ts`, `libraryStore.ts`,
`projectStore.ts`. Leave `console.error`/`console.warn` as-is. Purely mechanical; don't
change messages.

---

## Phase 4 — Readability (mechanical renames, zero behavior change)

Do this phase last, one commit per bullet, `vue-tsc` after each. Use editor-wide
search/replace including `.vue` templates and spec files.

- `getProjectDefintion` → `getProjectDefinition` (projectStore + all callers, incl. historyStore, libraryStore).
- `udpateItemsList` → `updateItemsList` (libraryStore).
- `isFirtClockAfterPlay` → `isFirstClockAfterPlay`, `midiConectionModes` → `midiConnectionModes` (playbackStore; the latter is exported — update consumers).
- [viewStore.ts:406-427](../../src/store/viewStore.ts#L406-L427): parameter names are swapped —
  `pxToTime(time: number)` actually receives px; `timeToPx(px: number)` receives time; same
  for `octaveToPx`/`pxToOctave`. Rename parameters only (`px`, `time`, `octave`); signatures/behavior unchanged.
- `rgbToHex` in [viewStore.ts:18](../../src/store/viewStore.ts#L18) returns a packed number,
  not hex text → rename to `rgbToInt` (or `packRgb`).
- Boxed primitive types: `edited`/`created` `as Number` in
  [projectStore.ts:40-41](../../src/store/projectStore.ts#L40-L41) → `number`;
  `errorThrow: Boolean` in [libraryStore.ts:162](../../src/store/libraryStore.ts#L162) → `boolean`.
- `toolStore.mouseUp(e: any)` → typed param (done as part of 1.8 if not already).

---

## Known-but-out-of-scope (do not attempt without discussion)

- `toolStore.current` / `currentLeftHand` rename (TODO at toolStore.ts:362) — touches many components.
- snapStore resize-snaps-tone bug (TODO at snapStore.ts:298) — needs product decision on intended behavior.
- The pause/resume choreography in historyStore (`undoStateWriter`/`undoApplicator`) — fragile but working; redesign is a separate project.
- Store-level tight coupling (toolStore knows 9 stores) — architectural, not incremental.

## Verification checklist (end of run)

1. `npx vue-tsc --noEmit` → 0 errors.
2. `npx vitest run` → all suites pass; screenshot diffs reviewed.
3. Manual smoke (via `npm run dev`): create note, drag note, drag right/left edge with
   multiple notes selected, erase, undo while stopped (must NOT start playback), save-as
   with a new name (must NOT say "File already exists"), pan with middle and right button.
