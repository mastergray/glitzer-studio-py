# Glitzle Studio — Audio-Reactive Video Composition Pipeline

Takes an audio file, identifies scene boundaries from audio analysis,
and lets you define what dazzle visuals, glitch effects, and ffmpeg
filters to apply per scene. Two-phase workflow: analyze the audio to
generate a timeline skeleton, then populate and render it.

## Requirements

- Python 3.8+
- `numpy`, `scipy`, `soundfile` — `pip install numpy scipy soundfile`
- [dazzle-video-maker-py](https://github.com/mastergray/dazzle-video-maker-py) — cloned locally
- [glitch-maker-py](https://github.com/mastergray/glitch-maker-py) — cloned locally
- ffmpeg + ffprobe on PATH (or custom binary path in timeline config)

## Quick Start

```
# Phase 1: Analyze audio → timeline skeleton
python3 studio.py analyze song.wav \
    --dazzle /path/to/dazzle-video-maker-py \
    --glitch-maker /path/to/glitch-maker-py \
    --ffmpeg-filters /path/to/ffmpeg-recipes-dir \
    -o my_project.timeline.json

# Phase 2: Edit the timeline JSON to populate each scene

# Phase 3: Render
python3 studio.py render my_project.timeline.json -o final.mp4
```

## Phase 1: Analyze

```
python3 studio.py analyze song.wav [options]
```

Runs the audio analyzer, extracts section boundaries, and writes a
timeline skeleton JSON. Each section becomes a scene with timing info
but no visual instructions (null source/post/filters).

**Options:**
- `--output PATH` / `-o` — output timeline JSON (default: `<audio>.timeline.json`)
- `--dazzle PATH` — path to dazzle-video-maker-py directory
- `--glitch-maker PATH` — path to glitch-maker-py directory
- `--ffmpeg-filters PATH` — path to directory containing ffmpeg-*.md recipe files
- `--temp-dir PATH` — temp directory for intermediate render files (default: `/tmp/glitzle`)

## Phase 2: Edit Timeline

The generated JSON looks like this:

```json
{
  "version": 1,
  "audio": "/path/to/song.wav",
  "tools": {
    "ffmpeg": "/path/to/ffmpeg",
    "ffprobe": "/path/to/ffprobe",
    "dazzle": "/path/to/dazzle-video-maker-py",
    "glitch_maker": "/path/to/glitch-maker-py",
    "ffmpeg_filters": "/path/to/ffmpeg-recipe-dir"
  },
  "temp_dir": "/tmp/glitzle",
  "palette": "rainbow",
  "scenes": [
    {
      "id": 1,
      "start_sec": 0.0,
      "end_sec": 15.3,
      "label": "verse",
      "beats": 32,
      "downbeats": 8,
      "source": null,
      "post": null,
      "filters": null
    }
  ]
}
```

You populate each scene's `source`, `post`, and `filters` fields:

### source (required)

What dazzle visuals to generate for this scene.

```json
"source": {
  "type": "dazzle",
  "effects": ["hexagon", "spiral", "boxes"],
  "post": ["mirror_quad"],
  "palette": "fire"
}
```

- `type` — currently only `"dazzle"` is supported
- `effects` — list of dazzle shape effect names (see dazzle README for all 32)
- `post` — list of dazzle post-production effect names (see dazzle README for all 26)
- `palette` — palette name (overrides the top-level `palette` field for this scene)
- `post_params` — optional dict of post-effect CLI flags (e.g. `{"--wave-amplitude": "12"}`)

### post (optional)

Glitch-maker effects applied to the rendered dazzle output.

Currently supports two formats:

```json
"post": {
  "recipe": "signal_tear"
}
```

```json
"post": {
  "effects": [{"name": "tear", "params": {"count_pct": 10}}],
  "accumulate": true,
  "bleed": 0.15,
  "reset_sec": 3
}
```

- `recipe` — name of a glitch-maker recipe JSON file (looked up in glitch-maker's `recipes/` dir)
- `effects` — inline effect definitions with per-effect params
- `accumulate` / `bleed` / `reset_sec` — accumulation mode settings

### filters (optional)

FFmpeg filter chain applied after glitch-maker processing.

```json
"filters": "rgbashift=rh=-5:bh=5,noise=alls=10:allf=t"
```

Can be either:
- A raw ffmpeg filter string (passed directly to `-vf`)
- A recipe slug from the parsed ffmpeg-*.md files (looked up in the filter registry)

Use `python3 studio.py filters --path /path/to/ffmpeg-dir` to list all
available recipe slugs.

## Phase 3: Render

```
python3 studio.py render timeline.json [options]
```

Reads the populated timeline and renders each scene through the pipeline:

1. **Dazzle** — generates visuals for the scene's audio segment
2. **Glitch-maker** — applies effects if `post` is specified
3. **FFmpeg** — applies filter chain if `filters` is specified
4. **Concatenate** — joins all scene segments + muxes with original audio

**Options:**
- `--output PATH` / `-o` — output MP4 (default: `output.mp4`)

Each scene produces temp files in `temp_dir`. These are NOT cleaned up
automatically (useful for debugging; delete manually when done).

## Listing FFmpeg Filters

```
python3 studio.py filters --path /path/to/ffmpeg-recipe-dir
```

Parses all `ffmpeg-*.md` files in the directory and lists available
recipe slugs with their filter chain previews.

## Project Structure

```
glitzle-studio-py/
  studio.py          # main CLI (analyze/render/filters)
  timeline.py        # timeline JSON schema + validation
  renderer.py        # per-scene render orchestration
  filters.py         # ffmpeg recipe markdown parser
  analyze_audio.py   # vendored audio analyzer
```

## Current Limitations

- **No validation of dazzle effect/post names** — invalid names will fail
  at render time when dazzle rejects them, not at timeline validation.
- **Silent/short audio segments crash dazzle** — if a scene's audio is
  too short or silent, the audio analyzer fails. Workaround: remove
  silent scenes from the timeline before rendering.
- **Temp files not cleaned up** — intermediate renders accumulate in
  `temp_dir`.
- **No studio-level profile** — individual tool renders use `--no-profile`
  but studio doesn't write its own summary.
- **Recipe references for glitch-maker** — currently references recipe
  files by name rather than specifying effects inline.
- **Video source type exists but may be removed** — `"type": "video"` is
  implemented but was not part of the original design discussion.
