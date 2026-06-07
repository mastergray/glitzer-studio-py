# Glitzer Studio — WIP

Snapshot of in-flight work and open issues across `glitzle-studio-py`
(renderer) and `glitzer-studio-app` (web UI).

## Done this session

### Post-filter pipeline (committed: `glitzle-studio-py 33f68bc`)
- New entry type `post_filter` alongside `glitch` and `filter`.
- `post_filters/run_post_filter.py` — CLI wrapper that pipes raw RGBA
  frames through a preset's ops chain; audio passes through with
  `-c:a copy`.
- `studio.py`:
  - Loads `post_filters/presets/*.json` into a registry, validates
    timeline `post_filter` entries against it.
  - Wraps render body in `try/finally`: temp dir is `rm -rf`'d on
    success, preserved on failure with a stderr note.
  - `--post-filter-impl {vectorized,loop}` flag.
- `renderer.py`:
  - Dispatches `type=post_filter` to `run_post_filter`.
  - `trim_audio` now uses output-side `-ss`/`-t` (older ffmpeg builds
    were producing empty WAV stubs with input-side seek + `-c copy`).
- `timeline.py`: `validate()` accepts a `post_filter_registry` and
  rejects unknown ids.

### Vectorized post-filter ops (committed: `glitzer-studio-app 3597634`)
- All 14 ops in `apply_post_filters.py` rewritten as NumPy array
  expressions instead of per-pixel Python loops.
- Per-frame compute drops ~60×; full-res 7-scene 30-sec render goes
  from "would not finish overnight" to ~22 min.
- Original loop port snapshotted as `apply_post_filters_loop.py` for
  A/B comparison via the new `--post-filter-impl` flag.

### Web UI (`glitzer-studio-app`)
- Categories surfaced in the post_filter picker: glitch, retro-crt,
  decay, chaos, violent, destructive (74 presets).
- Effect-param round-trip on timeline import (`7fe31dc`):
  - Glitch entries' `props` + `accumulate` now restore on import.
  - Dazzle post-effect props preserved via an `effectParams` sidecar
    (UI doesn't yet expose editors but values survive round-trip).
  - Export key renamed `params` → `props` to match what `renderer.py`
    actually reads.
- Undo / Redo buttons in the scene-tab strip (`3174d82`):
  - 150 ms-debounced document `click`/`change`/`input` listener
    snapshots the full `scenes[]` state. Capacity 100.
- Repo initialized; ignores `node_modules/`, `app/dist/`, `review/`,
  `parity/pngs/`, `__pycache__/`, `.claude/`, `*.mp4`, `*.wav`.

## Open issues / things to fix

### Renderer ↔ UI coupling (not yet addressed — user paused)
- `glitzle-studio-py/post_filters/apply_post_filters.py` is a symlink
  into `glitzer-studio-app/`. The renderer can't run unless the UI
  repo is cloned as a sibling. Same for `apply_post_filters_loop.py`
  and `presets/`.
- Right fix: move the canonical Python files into
  `glitzle-studio-py/post_filters/`, delete from
  `glitzer-studio-app/`, update `glitzer-studio-app/parity/render_py.py`
  to point at the renderer copy. The web UI keeps only
  `glitch.post-filters.js` (the JS module the bundle uses).

### Vectorized vs loop parity not verified
- A/B renders exist at 320×200 and partially at 1920×1200, but I have
  not run `parity/build_review_sheets.py` to confirm pixel-level
  equivalence between the two implementations across all presets.
- Stochastic ops (`noise`, `blockJitter` per-pixel jitter) will
  intentionally differ — different RNG draws. Deterministic ops
  should match within float-rounding tolerance; this needs to be
  spot-checked.

### Render artifacts on disk
- `glitzer-studio-app/review/expanded_LOOP_1920x1200.mp4` is a 4 MB
  broken file from a mistaken manual concat earlier this session, not
  a real render output. Either delete it or label it. The full
  loop-impl render at 1920×1200 was killed before it completed; a
  real LOOP 1920×1200 reference does not exist.

### Background-task output buffering
- Long-running bg tasks (full-res renders) regularly come back with a
  zero-byte stdout file because Python block-buffers stdout when not
  attached to a TTY. Made it impossible to tell from the captured
  log whether a run was alive or had crashed; led to a wrong
  "render died" call that overwrote an output file. Not a code
  defect per se but worth adding `-u` (`python3 -u studio.py …`) or
  an explicit `flush=True` on the periodic prints so bg-task logs
  reflect reality.

### General working-style note (saved to memory)
- Before declaring a long-running job dead, verify with
  `ps -u $USER`, not just `pgrep`. Never write to the output path
  of a job you only think has died — use a clearly-suffixed name
  and ask first.
