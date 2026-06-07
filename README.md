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
    "scale": 1,
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
  - `scale` — dazzle upscale factor (skeleton default 1 → 320×200 preview;
    bump to 6 for 1920×1200 production. Engine fallback if missing is 6.)
  - `fps` — frame rate (default 60)
  - `crf` — H.264 quality (default 23)
  - `seed` — RNG seed (null = random per run)
  - `profile` — optional path to save a copy of this timeline on success
    (overridden by `--profile-out` on the CLI)
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

Glitzle Studio maintains a library of 422 ffmpeg filter recipes in
`filter_library.json`. Filters are referenced by ID in the timeline.

```
python3 studio.py filters
```

Lists all available filter IDs with preview of their filter chains.

Filters were extracted from the ffmpeg recipe documentation (13 markdown
files covering afterimage, decay, fractals, glitch, gradients, laser/glow,
lens/time-warp, particles, retro/8bit, spirals/topology, and violent
effects). Each recipe variant is extracted — e.g. a section with base +
feedback + progressive variants yields three separate filter IDs. The
library is version-controlled — adding new filters means updating
`filter_library.json`.

## Validation

Before rendering, the studio validates EVERY referenced name:

- **Dazzle effects** — 32 shape effects (atom, bars, boxes, ...)
- **Dazzle post** — 26 post-production effects (mirror_quad, kaleidoscope, ...)
- **Palettes** — 8 color palettes (rainbow, fire, ice, ...)
- **Glitch effects** — 13 glitch-maker effects (tear, pixel_sort, ...)
- **FFmpeg filters** — 422 managed filter IDs

Unknown names produce clear error messages before any rendering starts.

## CLI Reference

### analyze

```
python3 studio.py analyze AUDIO [-o OUTPUT] [--max-scene-sec N]
```

`--max-scene-sec` caps scene length: any scene longer than N seconds is
bisected into equal parts so the skeleton doesn't get dominated by one
acoustically-uniform passage. The analyzer's own boundaries are always
preserved; this only adds splits, never merges. Off by default.

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
- `--profile-out PATH` — where to save the render profile (a verbatim copy
  of the input timeline JSON) on success. Overrides `settings.profile` in
  the timeline. Default: `<temp-dir>/profile.json`, which is wiped when the
  render succeeds — set this flag (or `settings.profile`) to preserve it.

The render profile is the full timeline used to produce the mp4, so it
round-trips: feeding the saved profile back into `studio.py render`
reproduces the same project.

### filters

```
python3 studio.py filters
```

Lists all 422 managed ffmpeg filter IDs.

## Output Naming Convention

Rendered outputs use a descriptive naming format:

```
{audio_name}__{scene1}__{scene2}__{scene3}.mp4
```

- `__` (double underscore) separates the audio name from scenes and scenes from each other
- `-` (dash) separates visual elements within a scene (effects + post effects)
- Compound effect names with underscores use dashes instead (e.g., `mirror_diamond` → `mirror-diamond`)

Example:
```
LANDR-08-31-25_clip_04_08m35s_09m05s
  __puffs-sierpinski-lotsadots-radial-twist
  __tunnel-ellipse-pedals-tetrys-ziti
  __sierpinski-spiral-puffs-lotsadots-mirror-diamond-kaleidoscope
.mp4
```

Each scene's section lists the dazzle shape effects followed by the dazzle
post-production effects used. Glitch effects and ffmpeg filters are not
included in the filename (they're recorded in the timeline JSON which is
stored alongside the output).

## Project Structure

```
glitzle-studio-py/
  studio.py              # main CLI (analyze / render / filters)
  timeline.py            # JSON schema, validation, skeleton generation
  renderer.py            # per-scene render orchestration + concatenation
  filters.py             # ffmpeg recipe parser (dev tool for updating library)
  filter_library.json    # 422 managed ffmpeg filter definitions
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

### FFmpeg filters (422)

Run `python3 studio.py filters` for the full list with filter chain previews.

#### Afterimage Experimental (42)

`afterimage`, `afterimage_building`, `afterimage_complementary`,
`atmospheric_perspective`, `audio_overlay`, `audio_reactive`,
`bullet_time`, `comet_trail`, `datamosh_bloom`, `depth_fog`,
`dreamscape`, `dreamscape_dissociation`, `echo_bounce`, `echo_chamber`,
`feedback_intensify`, `fractal_feedback`, `gravity_trail`,
`infinity_mirror`, `infinity_mirror_color`, `light_leak`,
`light_leak_golden`, `luma_displace`, `motion_saturation`,
`motion_trail`, `multiexposure_glow`, `negative_space`,
`negative_space_v2`, `phosphor_amber`, `phosphor_green`, `radar`,
`risograph`, `risograph_halftone`, `shadow_echo`, `shadow_multi`,
`spatial_color_bleed`, `spectral_echo`, `spectral_spatial`,
`spectrum_warp`, `strobe_echo`, `strobe_echo_fade`, `thermal_bloom`,
`thermal_cooling`

#### Decay Effects (25)

`acid_burn`, `acid_spread`, `bleach_progressive`, `chem_burn`,
`disintegrate`, `disintegrate_blocks`, `dissolve_static`, `erosion`,
`erosion_progressive`, `film_decay`, `film_decay_progressive`, `fog`,
`fog_organic`, `glitch_decay`, `melt`, `melt_progressive`, `melt_warp`,
`paper_burn`, `paper_burn_glow`, `rust`, `rust_spread`, `thermal_melt`,
`thermal_melt_intensify`, `vhs_degrade`, `vhs_tracking`

#### Fractals Generative (29)

`cellauto_colored`, `cellauto_displace`, `cellauto_glitch`,
`cellauto_overlay`, `fractal_displace`, `fractal_glitch`,
`fractal_noise`, `fractal_noise_overlay`, `harmonograph`,
`julia_approx`, `life_dual`, `life_growth`, `lissajous`,
`mandelbrot_displace`, `mandelbrot_displace_glitch`, `mandelbrot_gold`,
`mandelbrot_inferno`, `mandelbrot_neon`, `mandelbrot_overlay`,
`mandelbrot_spectral`, `mandelbrot_takeover`, `mandelbrot_texture`,
`moire`, `reaction_diffusion`, `reaction_diffusion_strong`, `spiral`,
`spiral_overlay`, `xor_corruption`, `xor_fractal`

#### Glitch Recipes (38)

`amplify`, `bitcrush`, `bitcrush_animated`, `bitcrush_extreme`,
`bitplane`, `chromakey_corrupt`, `chromakey_random`, `color_corrupt`,
`datamosh`, `echo`, `edge_glow`, `feedback`, `feedback_spiral`,
`full_glitch`, `ghost`, `ghost_triple`, `hyper_glitch`,
`hyper_glitch_max`, `interlace`, `invert`, `jpeg_style`,
`nightvision`, `noise`, `pixelate`, `posterize`, `rgb_shift`,
`scanlines`, `solarize`, `stutter`, `tblend`, `tear`, `tear_sliced`,
`thermal`, `thermal_realistic`, `vroll`, `vroll_drift`, `wave`,
`zoom_pulse`

#### Gradients & Vector Fields (36)

`audio_color_wash`, `audio_divergence`, `audio_flow_displaced`,
`audio_flow_field`, `audio_gradient_map`, `audio_gradient_pulse`,
`audio_magnetic`, `blue_grade`, `color_wheel`, `curl_field`,
`divergence_field`, `edge_blur`, `electric_field`, `gradient_conical`,
`gradient_displace`, `gradient_glitch`, `gradient_linear`,
`gradient_multi_radial`, `gradient_multicolor`, `gradient_radial`,
`gradient_rotate`, `laminar_colored`, `laminar_flow`, `magnetic_field`,
`magnetic_field_moving`, `mesh_gradient`, `motion_field`, `plasma`,
`plasma_cells`, `plasma_displace`, `radial_selective`, `sunset_grade`,
`teal_orange_grade`, `turbulent_flow`, `vector_field_overlay`,
`vortex_shedding`

#### Laser, Glow & Audio (39)

`audio_bars`, `audio_displace`, `audio_grid_wave`,
`audio_ring_scanner`, `audio_spectrum`, `audio_spectrum_warp`,
`audio_stereo_wave`, `audio_vectorscope`,
`black_background_generation_for_external_compositing`, `bloom`,
`bloom_threshold`, `composite_test`, `floating_grid`, `full_scene`,
`grid_element`, `grid_pulse`, `halation`, `hex_grid`, `hex_grid_glow`,
`laser_array`, `laser_composite`, `laser_diagonal`, `laser_fan`,
`laser_hscan`, `laser_lighthouse`, `laser_lighthouse_rgb`, `laser_ring`,
`laser_ring_trail`, `laser_rings_repeat`, `laser_vscan`, `neon_blue`,
`neon_edge`, `neon_over_dark`, `neon_pink`, `neon_text`,
`neon_text_flicker`, `synthwave_full`, `synthwave_grid`,
`wireframe_sphere`

#### Lens & Time Warp (43)

`accelerate`, `anamorphic`, `anamorphic_flare`, `broken_interpolation`,
`chromatic_lens`, `chromatic_simple`, `chronostasis`,
`chronostasis_multi`, `einstein_ring`, `fisheye_breathe`,
`fisheye_v360`, `freeze_stutter`, `funhouse`, `funhouse_multi`,
`gravity_lens`, `kaleidoscope_4way`, `kaleidoscope_rotate`, `liquid`,
`liquid_viscous`, `magnifier`, `page_curl`, `pendulum`,
`pendulum_blur`, `prism`, `prism_sweep`, `reverse_pockets`,
`reverse_pockets_moving`, `rubber`, `rubber_multi`, `slitscan_approx`,
`slitscan_chromatic`, `slitscan_horiz`, `slowmo_hit`,
`smooth_slowmo_2x`, `smooth_slowmo_4x`, `speed_ramp_sine`,
`strobe_4fps`, `strobe_variable`, `tiltshift`, `tiltshift_smooth`,
`time_echo`, `time_echo_colored`, `time_freeze`

#### Master Guide (11)

`audio_step1`, `broken_arcade`, `cyberpunk_scanner`, `destroy`,
`fractal_universe`, `glitch_portrait`, `haunted_vhs`, `living_painting`,
`psychedelic_wormhole`, `retro_terminal`, `underwater_alien`

#### Particles & Stereoscopic (35)

`3d_audio_explosion_sbs`, `3d_audio_sbs`, `3d_breathe_sbs`,
`3d_fireflies_sbs`, `3d_fractal_sbs`, `3d_glitch_sbs`,
`3d_particles_sbs`, `3d_rain_sbs`, `anaglyph`, `anaglyph_depth`,
`anaglyph_simple`, `audio_particles`, `bubbles`, `bubbles_underwater`,
`depth_3d`, `dust`, `dust_beam`, `explosion`, `fireflies`, `lightning`,
`lightning_multi`, `overunder_3d`, `rain`, `rain_composite`,
`rain_heavy`, `sbs_3d`, `sbs_depth`, `smoke`, `smoke_composite`,
`snow`, `snow_depth`, `sparks`, `sparks_composite`, `starfield_streak`,
`starfield_v1`

#### Retro & 8-Bit (37)

`8bit`, `8bit_crt`, `amber_phosphor`, `arcade_crt`,
`arcade_crt_phosphor`, `atari2600`, `atari2600_authentic`, `blue_phosphor`,
`c64`, `c64_bordered`, `cga_palette0`, `cga_palette1`, `composite`,
`dither_bw`, `dither_color`, `dither_ordered`, `gameboy`, `gameboy_lcd`,
`genesis`, `genesis_grit`, `green_phosphor`, `lcd_handheld`,
`palette_cycle`, `palette_cycle_rgb`, `ps1`, `ps1_jitter`,
`retro_dissolve`, `retro_iris`, `retro_wipe`, `snes`, `snes_tv`,
`spectrum`, `spectrum_clash`, `teletext`, `vector`, `vector_bloom`,
`vhs_full`

#### Spirals & Topology (33)

`cosmic_web`, `double_helix`, `double_helix_color`, `drain`, `escher`,
`escher_recursive`, `fibonacci_spiral`, `fibonacci_zoom`, `fisheye`,
`hyperbolic`, `hyperbolic_tile`, `hypercube`, `klein`,
`klein_intersect`, `log_spiral`, `log_spiral_intensify`, `mobius`,
`mobius_twist`, `planet`, `polar`, `polar_rotate`, `ripple`,
`ripple_multi`, `sphere`, `sphere_to_torus`, `terrain`,
`terrain_shaded`, `torus`, `torus_rotate`, `trefoil`, `trefoil_glow`,
`wormhole`, `wormhole_spiral`

#### Violent & Chaotic Effects (28)

`annihilator`, `color_violence`, `explode`, `explode_corrupt`,
`feedback_overload`, `fragment`, `implosion`, `interference`,
`mutation`, `mutation_escalate`, `palette_assault`, `phase_cancel`,
`reality_rip`, `reality_rip_grow`, `shake`, `shake_crescendo`,
`shake_violent`, `shatter_corrupt`, `signal_death`, `signal_destroy`,
`spiral_collapse`, `strobe`, `strobe_accel`, `strobe_multi`,
`stutter_burst`, `time_seizure`, `time_shatter`, `waveform_destroy`

#### Violent Effects (26)

`cellular`, `cellular_edge`, `chromosome_damage`, `data_blender`,
`data_blender_feedback`, `dimensional_collapse`,
`dimensional_collapse_anim`, `flesh_machine`, `flesh_machine_mutate`,
`gravity_well`, `gravity_well_intensify`, `kaleidoscope_fracture`,
`meat_grinder`, `mirror_fracture`, `reality_tear`,
`reality_tear_intensify`, `seizure_machine`, `signal_annihilation`,
`signal_annihilation_pulse`, `temporal_shredder`,
`temporal_shredder_extreme`, `total_entropy`, `void`, `void_glow`,
`vortex`, `vortex_collapse`
