# Testing guide (for coding agents)

How the test suite works, the traps that waste hours, and the patterns that keep
the integration tests green. Read this before touching any `*.spec.ts`.

## Stack

- **Runner:** Vitest in **browser mode** (`@vitest/browser` + Playwright,
  chromium). Config lives in the `test:` block of `vite.config.ts`.
- Tests run in a **real browser**, not jsdom. Real layout, real `localStorage`,
  real DOM events, real `requestAnimationFrame`.
- `headless: false` by default. Add `--browser.headless` to run without a window
  (use this in CI and for scripted runs).

### Commands

```bash
npx vitest                                   # watch mode (dev)
npx vitest run --browser.headless            # whole suite once, no window
npx vitest run "src/App-touch edits.spec.ts" --browser.headless   # one file
```

Note the space in many filenames (`App-touch edits.spec.ts`) — quote the path.

## Two kinds of specs

1. **Store/unit specs** (`src/store/*.spec.ts`, `src/functions/*.spec.ts`) —
   instantiate pinia, call store actions, assert. Fast, deterministic.
2. **App integration specs** (`src/App-*.spec.ts`, `src/Robomouse.spec.ts`) —
   mount the whole `App.vue`, drive it with a fake mouse, assert on store state.
   Slow, timing-sensitive. This is where the sharp edges are.

### Integration spec skeleton

```ts
describe('...', async () => {
    const testRuntime = await appMount() as TestRuntime;   // mounts App.vue
    const { interactionTarget, roboMouse, viewStore, projectStore,
            selectStore, snapStore, toolStore } = testRuntime;

    // optional seed data
    projectStore.notes.list.push(note({ time: 2, timeEnd: 4, octave: 4, layer: 0 }));

    it('does a thing', async () => { /* drive + assert */ }, generalInterval);

    appCleanup(testRuntime);   // unmounts, clears localStorage in afterAll
});
```

- `appMount()` (`src/test-helpers/appSetup.ts`) mounts the app into a fixed
  full-screen `containerDiv`, dismisses the disclaimer, empties the project, and
  **waits for the view to settle** before returning.
- `interactionTarget` is the `#viewport` element — dispatch mouse/keyboard events
  at it.
- `generalInterval` (usually `500`) is reused both as animation duration budget
  (`generalInterval / timeDiv`) **and** as the per-`it` timeout (3rd arg). Keep
  that in mind when adding waits — see the timeout trap below.
- **Tests within a `describe` are stateful and ordered.** Each `it` builds on the
  previous one's project/selection state. A failure in an early test cascades
  into later ones (wrong note counts everywhere). Always fix the *first* failing
  test in a chain before trusting the rest.

## RoboMouse — the fake mouse

`src/test-helpers/RoboMouse.ts`. Dispatches real `MouseEvent`s at
`roboMouse.eventTarget` (set to `interactionTarget`).

```ts
roboMouse.eventTarget = interactionTarget;
roboMouse.currentPosition = { x: 0, y: 0 };
await roboMouse.moveTo({ x, y }, durationMs);   // tweens, firing mousemove
await roboMouse.mousedown();
await roboMouse.moveTo({ x2, y2 }, durationMs); // drag
await roboMouse.mouseup();
```

- Coordinates are **client pixels**. Compute them from the view:
  `viewStore.timeToPxWithOffset(time)`, `viewStore.octaveToPxWithOffset(octave)`.
- Keyboard modifiers (Ctrl/Alt for area-select, duplicate, etc.) are dispatched
  directly at `interactionTarget` as `KeyboardEvent`s, not through RoboMouse.
- `moveTo` awaits until the tween finishes at the exact `end` position, so the
  last `mousemove` is at the target.

## ⚠️ The #1 trap: the viewport coordinate race

**Symptom:** a created/dragged note lands at the wrong time/octave; area-select
grabs the wrong number of notes; counts are off by one and cascade. Assertions
like `expected 1 to be 2`.

**Cause:** the pixel↔musical mapping is **not stable at the start of a test**.

- `App.vue`'s `resize()` calls `viewStore.updateSize(w, h)`, which sets
  `viewWidthPx`/`viewHeightPx` and recomputes the derived `viewWidthTime` (via
  `applyRatioToTime`). That changes `timeToPx` / `octaveToPx`.
- `resize()` re-runs whenever the side/bottom panes re-measure, and a reactive
  re-layout (e.g. pushing a seed note) **momentarily collapses** `#viewport`
  (observed `viewWidthPx`: 1620 → 114 → 1620 within ~70 ms).
- If a test computes `startX = timeToPxWithOffset(2)` during that collapse, the
  pixel is wrong. By the time the mouse event fires the view has recovered, so
  `pxToTime(startX)` no longer equals 2 → the note is misplaced.

This is timing-dependent, so it surfaces/hides across Vitest or browser upgrades.

**The fix — always settle the view before reading pixel coordinates:**

```ts
import { appMount, waitForStableView } from './test-helpers/appSetup';
// ...
await waitForStableView(viewStore, interactionTarget);   // <-- before any timeToPx/rectOfNote
const startX = viewStore.timeToPxWithOffset(2);
```

`waitForStableView(viewStore, target, timeoutMs = 3000)` polls until
`viewStore.viewWidthPx` matches the real `#viewport` width **and** stays stable
for several samples.

Rules of thumb:
- `appMount()` already settles once at mount, but the collapse re-triggers
  **during the first `it`** (from the seed-note render). So call
  `waitForStableView` again inside the first interaction test, right before the
  first `timeToPx`/`octaveToPx`/`rectOfNote` call. Later tests in the chain are
  usually already stable, but adding it is cheap insurance.
- Prefer computing pixel coordinates **as late as possible** (right before the
  `moveTo` that uses them), not all up front.

### ⚠️ Timeout trap (partner to the above)

`waitForStableView` can burn 150 ms–hundreds of ms. That eats into the per-`it`
timeout (`generalInterval` = 500 ms), which also has to cover the tween durations
and `wait`s. If a settled test now times out (`Test timed out in 500ms`), **raise
that test's timeout**, e.g. `}, generalInterval * 6);` — don't bump
`generalInterval` itself, because it's also the divisor for animation speeds.

## `localStorage` and isolation

- Modern Vitest browser mode **isolates `localStorage` per spec file**. Old
  versions leaked keys across files. Do not write assertions that depend on
  cross-file key accumulation (e.g. `expect(localStorage.length).toBeGreaterThan(1)`
  when this file only saved one project — use `> 0`).
- App storage is **namespaced** (`ndpr-87b834/<name>`) via `NsLocalStorage`
  (`src/functions/browserLocalStorage.ts`), a singleton that mirrors an in-memory
  `Map` to real `localStorage`. `saveCurrent()` writes are **async and not
  awaited**; don't assume a key exists synchronously after a save.
- `appCleanup` clears `localStorage` in `afterAll`. `libraryStore.spec.ts` clears
  in `beforeAll` too.

## View coordinate cheat-sheet (`src/store/viewStore.ts`)

- `viewWidthTime = viewHeightOctaves * ratio * (viewWidthPx / viewHeightPx)` —
  derived, recomputed by `applyRatioToTime()` on every `updateSize`.
- `timeToPxWithOffset` / `pxToTimeWithOffset` are inverses **only when the view is
  stable**. Round-tripping through them across an async gap is where bugs hide.
- Selection geometry: `selectStore.selectRange` filters
  `viewStore.visibleNoteDrawables` by pixel rect. The range end is applied via a
  throttled (`useThrottleFn(..., 25)`) handler and finalized on the trailing
  edge — another reason drags need a real duration, not 0.

## Debugging recipe for misplaced-note failures

1. Log the note right after the action: `projectStore.notes.list.map(n => ({time, timeEnd, octave}))`.
2. If it's at the wrong spot, log the round-trip at drag time:
   `timeToPxWithOffset(2)` vs `pxToTimeWithOffset(startX)` — mismatch ⇒ view race.
3. Log `viewStore.viewWidthPx` at it-top vs at drag time. A collapse (e.g. 114)
   confirms it. Fix with `waitForStableView`.
4. Remove all debug logs before finishing.

## Checklist before declaring tests fixed

- [ ] Run the **whole** suite headless, not just the file named in the report —
      sibling specs often share a root cause (the coordinate race hit 5 files
      while only 2 were in the original failure log).
- [ ] Run it **twice** — these are timing-sensitive; one green run isn't proof.
- [ ] No leftover `console.log("DEBUG ...")`.
- [ ] Fixed the *first* failing test in each stateful chain, not just the symptom
      downstream.
