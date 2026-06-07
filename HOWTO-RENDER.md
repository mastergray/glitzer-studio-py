# How to Render a Glitzle Timeline → Video

Quick reference for rendering a populated timeline JSON (e.g. a
`*.timeline.staged.json` exported from the web UI) into a final MP4.

## TL;DR

```bash
cd /home/mastergray/claude/glitzle-studio-py
python3 studio.py render \
    '/path/to/your.timeline.json' \
    --output '/home/mastergray/codex/seamless-disarray/shorts/new/NAME.mp4' \
    --profile-out '/home/mastergray/codex/seamless-disarray/shorts/new/NAME.profile.json' \
    --dazzle /home/mastergray/claude/dazzle-video-maker-py \
    --glitch-maker /home/mastergray/claude/glitch-maker-py \
    --ffmpeg /home/mastergray/codex/seamless-disarray/ffmpeg/bin/ffmpeg \
    --ffprobe /home/mastergray/codex/seamless-disarray/ffmpeg/bin/ffprobe \
    --parallel auto
```

> **Use `python3`, not `python`** — `python` is not on PATH in this environment.

## Important gotchas

- **Quote the timeline path.** UI exports often have spaces and parens
  in the filename (e.g. `... (5).json`) — single-quote the whole path.
- **All scenes must be populated.** Every scene needs a non-null
  `video` field or the render errors out. Verify with:
  ```bash
  python3 -c "import json,sys; d=json.load(open(sys.argv[1])); [print(s['id'], 'NULL' if not s.get('video') else 'ok') for s in d['scenes']]" 'your.timeline.json'
  ```
- **Check the audio path resolves.** The timeline's top-level `audio`
  field is an absolute path; confirm the file exists before rendering.
- **Render cost scales hard with `settings`.** Watch `scale`, `fps`,
  and `crf` in the timeline JSON. Example heavy config:
  `scale: 6` (→ 320×200 becomes 1920×1200), `fps: 60`, `crf: 1`
  (near-lossless) — a 30s clip at these settings is a long render.

## Flags worth knowing

| Flag | Purpose |
|------|---------|
| `--output, -o` | Output MP4 path. |
| `--profile-out` | Writes a copy of the input timeline JSON on success (the render "profile" — reproducible record of what was rendered). Without it, the profile defaults to `<temp-dir>/profile.json` which is **wiped on success**, so set this to keep it. |
| `--parallel auto` | One worker per scene (fast). `--parallel N` for N workers; default `1` = sequential (low CPU/memory). |
| `--no-profile` | Disable the per-subprocess profile JSON for dazzle/glitch-maker. |
| `--post-filter-impl {vectorized,loop}` | `vectorized` (default, fast NumPy) vs `loop` (original per-pixel port, slow — for A/B comparison). |
| `--temp-dir` | Where intermediates go. |

## Prerequisites (one-time)

- `python3` with `numpy`, `scipy`, `soundfile`
- Sibling repos cloned locally:
  - `/home/mastergray/claude/dazzle-video-maker-py`
  - `/home/mastergray/claude/glitch-maker-py`
- ffmpeg + ffprobe — custom build at
  `/home/mastergray/codex/seamless-disarray/ffmpeg/bin/`
  (system `/usr/bin/ffmpeg` also works if you prefer)

## Conventions

- **Finished shorts** → `/home/mastergray/codex/seamless-disarray/shorts/new/`
- **Throwaway test renders** → `glitzle-studio-py/test/`
- Pair each MP4 with its `--profile-out` JSON so the render is reproducible.

## Pipeline (what render actually does)

For each scene: **dazzle** (VGA Mode 13h visuals) → **glitch-maker**
(audio-reactive glitch) → **ffmpeg** (post filters), then concatenates
all scenes and muxes the timeline's audio into the final MP4.
