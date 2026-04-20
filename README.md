# Glitzle Studio — Audio-Reactive Video Composition Pipeline

Takes an audio file, identifies scene boundaries from audio analysis,
and lets you define what dazzle visuals, glitch effects, and ffmpeg
filters to apply per scene. Renders each scene through a multi-stage
pipeline (dazzle → glitch-maker → ffmpeg) then concatenates into a
final video.

## Requirements

- Python 3.8+
- `numpy`, `scipy`, `soundfile` — `pip install numpy scipy soundfile`
- [dazzle-video-maker-py](https://github.com/mastergray/dazzle-video-maker-py) — cloned locally
- [glitch-maker-py](https://github.com/mastergray/glitch-maker-py) — cloned locally
- ffmpeg + ffprobe binaries (system PATH or custom path)

## Two-Phase Workflow

### Phase 1: Analyze

```
python3 studio.py analyze song.wav -o my_project.timeline.json
```

Runs the audio analyzer, extracts section boundaries, and writes a
timeline skeleton. Each section becomes a scene with timing and beat
info but no visual instructions (`video: null`).

### Phase 2: Populate + Render

Edit the timeline JSON to fill in each scene's `video` field, then:

```
python3 studio.py render my_project.timeline.json \
    --output final.mp4 \
    --dazzle /path/to/dazzle-video-maker-py \
    --glitch-maker /path/to/glitch-maker-py \
    --ffmpeg /path/to/ffmpeg \
    --ffprobe /path/to/ffprobe
```

All scene IDs must have `video` populated or render will error.

## Timeline JSON Schema

### Skeleton (from analyze)

```json
{
  "version": 1,
  "audio": "/path/to/song.wav",
  "settings": {
    "scale": 6,
    "fps": 60,
    "crf": 23,
    "seed": null
  },
  "scenes": [
    {
      "id": 1,
      "start_sec": 0.0,
      "end_sec": 15.3,
      "label": "verse",
      "beats": 32,
      "downbeats": 8,
      "video": null
    }
  ],
  "post": []
}
```

### Populated scene

```json
{
  "id": 2,
  "start_sec": 4.0,
  "end_sec": 15.3,
  "label": "neutral",
  "beats": 32,
  "downbeats": 8,
  "video": {
    "visuals": {
      "effects": ["hexagon", "spiral", "boxes"],
      "post": [
        {"id": "mirror_quad"},
        {"id": "kaleidoscope", "props": {"n": 12}},
        {"id": "wave", "props": {"amplitude": 12}}
      ],
      "palette": "fire"
    },
    "post": [
      {
        "type": "glitch",
        "id": "tear",
        "props": {"count_pct": 10, "thickness_pct": 25},
        "accumulate": {
          "enabled": true,
          "bleed": 0.15,
          "reset_sec": 3
        }
      },
      {
        "type": "glitch",
        "id": "chromatic",
        "props": {"amount": 30}
      },
      {
        "type": "filter",
        "id": "rgb_split_chromatic_aberration"
      }
    ]
  }
}
```

### Schema breakdown

**Top level:**
- `version` — schema version (currently 1)
- `audio` — path to the audio source (one file for the whole video)
- `settings` — render settings for reproducibility
  - `scale` — dazzle upscale factor (default 6 → 1920×1200)
  - `fps` — frame rate (default 60)
  - `crf` — H.264 quality (default 23)
  - `seed` — RNG seed (null = random per run)
- `scenes` — ordered list of scene definitions
- `post` — global post-processing chain applied to the final concatenated video

**Per scene:**
- `id` — scene identifier
- `start_sec` / `end_sec` — time range within the audio
- `label` — from audio analysis (verse, chorus, etc.)
- `beats` / `downbeats` — count within this time range
- `video` — visual instructions (null in skeleton, must be populated before render)

**video.visuals** — what dazzle generates:
- `effects` — list of dazzle shape effect names
- `post` — list of dazzle post-production effects, each with:
  - `id` — effect name (e.g. `"mirror_quad"`, `"kaleidoscope"`)
  - `props` — optional parameters (e.g. `{"n": 12}`, `{"amplitude": 15}`)
- `palette` — color palette name (defaults to rainbow if omitted)

**video.post** — ordered post-processing chain applied to this scene:

Each entry is processed in order. Each step's output feeds the next.

Glitch entry:
```json
{
  "type": "glitch",
  "id": "tear",
  "props": {"count_pct": 10},
  "accumulate": {
    "enabled": true,
    "bleed": 0.15,
    "reset_sec": 3
  }
}
```
- `type` — `"glitch"` for glitch-maker effects
- `id` — effect name (validated against glitch-maker's 13 effects)
- `props` — effect parameters (optional)
- `accumulate` — frame-over-frame damage accumulation (optional)

Filter entry:
```json
{
  "type": "filter",
  "id": "rgb_split_chromatic_aberration"
}
```
- `type` — `"filter"` for ffmpeg filters
- `id` — filter name from the managed library (validated before render)

**post (global)** — same format as video.post but applied to the entire
concatenated video as a final pass. Useful for consistent color grading
or effects across all scenes.

## Render Pipeline

Per scene:
1. **Audio trim** — extract the scene's time range from the source audio
2. **Dazzle** — generate visuals (effects + post + palette) for that audio segment
3. **Post chain** — apply each entry in `video.post` in order:
   - `glitch` → one glitch-maker invocation per entry (supports per-effect accumulate)
   - `filter` → one ffmpeg invocation per entry (filter chain from managed library)
4. Each step's output is the next step's input

After all scenes:
5. **Concatenate** — join all scene segments + mux with original audio
6. **Global post** — apply top-level `post` chain to the concatenated video

## Managed Filter Library

Glitzle Studio maintains a library of 220 ffmpeg filter recipes in
`filter_library.json`. Filters are referenced by ID in the timeline.

```
python3 studio.py filters
```

Lists all available filter IDs with preview of their filter chains.

Filters were extracted from the ffmpeg recipe documentation. The library
is version-controlled — adding new filters means updating
`filter_library.json`.

## Validation

Before rendering, the studio validates EVERY referenced name:

- **Dazzle effects** — 32 shape effects (atom, bars, boxes, ...)
- **Dazzle post** — 26 post-production effects (mirror_quad, kaleidoscope, ...)
- **Palettes** — 8 color palettes (rainbow, fire, ice, ...)
- **Glitch effects** — 13 glitch-maker effects (tear, pixel_sort, ...)
- **FFmpeg filters** — 220 managed filter IDs

Unknown names produce clear error messages before any rendering starts.

## CLI Reference

### analyze

```
python3 studio.py analyze AUDIO [-o OUTPUT]
```

### render

```
python3 studio.py render TIMELINE [-o OUTPUT] [options]
```

**Required:**
- `--dazzle PATH` — path to dazzle-video-maker-py directory
- `--glitch-maker PATH` — path to glitch-maker-py directory

**Optional:**
- `--output PATH` / `-o` — output MP4 (default: output.mp4)
- `--ffmpeg PATH` — ffmpeg binary (default: ffmpeg on PATH)
- `--ffprobe PATH` — ffprobe binary (default: ffprobe on PATH)
- `--temp-dir PATH` — intermediate file directory (default: /tmp/glitzle)

### filters

```
python3 studio.py filters
```

Lists all 220 managed ffmpeg filter IDs.

## Project Structure

```
glitzle-studio-py/
  studio.py              # main CLI (analyze / render / filters)
  timeline.py            # JSON schema, validation, skeleton generation
  renderer.py            # per-scene render orchestration + concatenation
  filters.py             # ffmpeg recipe parser (dev tool for updating library)
  filter_library.json    # 220 managed ffmpeg filter definitions
  analyze_audio.py       # vendored audio analyzer
  README.md
```

## Available Effects

### Dazzle shape effects (32)

`atom`, `bars`, `boxes`, `curves`, `diag1`, `diag2`, `diag3`, `diag4`,
`ellipse`, `formula1`, `grid`, `hexagon`, `lines`, `lotsadots`,
`lotsadots2`, `pedals`, `puffs`, `ribbons`, `sierpinski`, `sine`,
`spiral`, `spiral1`, `squares`, `streamer`, `sweep`, `sweep2`, `sweep3`,
`triangles`, `tunnel`, `wandering`, `zigstream`, `zigzags`

### Dazzle post effects (26)

`mirror_h`, `mirror_v`, `mirror_quad`, `mirror_diamond`, `radial`,
`kaleidoscope`, `tile`, `twist`, `scroll`, `wave`, `xor`, `drip`,
`starburst`, `mesh`, `rectangles`, `spiral`, `wipe`, `movingbars`,
`linewipe`, `randomize`, `blister`, `firefly`, `umbra`, `tetrys`,
`ziti`, `juggle`

### Palettes (8)

`rainbow`, `fire`, `ice`, `electric`, `neon`, `grayscale`, `ocean`, `lava`

### Glitch-maker effects (13)

`tear`, `pixel_sort`, `pixel_scramble`, `jpeg_corrupt`, `chromatic`,
`databend`, `channel_swap`, `bit_crush`, `invert_blocks`, `slitscan`,
`warp`, `noise`, `clip_cut`

### FFmpeg filters (220)

Run `python3 studio.py filters` for the full list with filter chain previews.
