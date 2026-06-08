"""Timeline JSON schema + validation.

A timeline describes a complete render: one audio source, render settings,
and per-scene visual instructions. Tool paths and temp dir are CLI-level
concerns, not stored in the timeline.
"""
from __future__ import annotations
import json
from pathlib import Path


SCHEMA_VERSION = 1

# Known valid names — used for validation before rendering.
# These mirror what the tools actually support.
DAZZLE_EFFECTS = {
    'atom', 'bars', 'boxes', 'curves', 'diag1', 'diag2', 'diag3', 'diag4',
    'ellipse', 'formula1', 'grid', 'hexagon', 'lines', 'lotsadots',
    'lotsadots2', 'pedals', 'puffs', 'ribbons', 'sierpinski', 'sine',
    'spiral', 'spiral1', 'squares', 'streamer', 'sweep', 'sweep2', 'sweep3',
    'triangles', 'tunnel', 'wandering', 'zigstream', 'zigzags',
}

DAZZLE_POST = {
    'mirror_h', 'mirror_v', 'mirror_quad', 'mirror_diamond', 'radial',
    'kaleidoscope', 'tile', 'twist', 'scroll', 'wave', 'xor', 'drip',
    'starburst', 'mesh', 'rectangles', 'spiral', 'wipe', 'movingbars',
    'linewipe', 'randomize', 'blister', 'firefly', 'umbra', 'tetrys',
    'ziti', 'juggle',
}

DAZZLE_PALETTES = {
    'rainbow', 'fire', 'ice', 'electric', 'neon', 'grayscale', 'ocean', 'lava',
}

GLITCH_EFFECTS = {
    'tear', 'pixel_sort', 'pixel_scramble', 'jpeg_corrupt', 'chromatic',
    'databend', 'channel_swap', 'bit_crush', 'invert_blocks', 'slitscan',
    'warp', 'noise', 'clip_cut',
}

BACKGROUND_FITS = {'cover', 'contain', 'stretch', 'native'}
BACKGROUND_ANCHORS = {
    'center', 'top', 'bottom', 'left', 'right',
    'top-left', 'top-right', 'bottom-left', 'bottom-right',
}


def create_skeleton(audio_path: str, scenes: list[dict]) -> dict:
    """Build an empty timeline from audio analysis scenes."""
    return {
        'version': SCHEMA_VERSION,
        'audio': str(audio_path),
        'settings': {
            'scale': 1,
            'fps': 60,
            'crf': 23,
            'seed': None,
        },
        'scenes': [
            {
                'id': i + 1,
                'start_sec': round(s['start_sec'], 3),
                'end_sec': round(s['end_sec'], 3),
                'label': s.get('label', ''),
                'beats': s.get('beats', 0),
                'downbeats': s.get('downbeats', 0),
                'video': None,
            }
            for i, s in enumerate(scenes)
        ],
        'post': [],
    }


def validate(timeline: dict, filter_library: dict,
             post_filter_registry: dict | None = None) -> list[str]:
    """Validate a populated timeline. Returns list of error strings (empty = valid).

    post_filter_registry: optional dict of {preset_id: preset} for post_filter
    type entries. If omitted, post_filter entries are rejected.
    """
    errors = []
    post_filter_registry = post_filter_registry or {}

    if timeline.get('version') != SCHEMA_VERSION:
        errors.append(f'unsupported version: {timeline.get("version")}')

    audio = timeline.get('audio')
    if not audio:
        errors.append('missing audio path')
    elif not Path(audio).exists():
        errors.append(f'audio file not found: {audio}')

    scenes = timeline.get('scenes', [])
    if not scenes:
        errors.append('no scenes defined')

    for scene in scenes:
        sid = scene.get('id', '?')

        if scene.get('video') is None:
            errors.append(f'scene {sid}: video is null (must be populated)')
            continue

        video = scene['video']
        visuals = video.get('visuals')
        if not visuals:
            errors.append(f'scene {sid}: video.visuals is missing')
        else:
            # Validate dazzle effect names.
            for eff in visuals.get('effects', []):
                if eff not in DAZZLE_EFFECTS:
                    errors.append(f'scene {sid}: unknown dazzle effect: {eff!r}')

            # Validate dazzle post effect names.
            for post_entry in visuals.get('post', []):
                post_id = post_entry if isinstance(post_entry, str) else post_entry.get('id')
                if post_id and post_id not in DAZZLE_POST:
                    errors.append(f'scene {sid}: unknown dazzle post: {post_id!r}')

            # Validate palette.
            pal = visuals.get('palette')
            if pal and pal not in DAZZLE_PALETTES:
                errors.append(f'scene {sid}: unknown palette: {pal!r}')

            bg = visuals.get('background')
            if bg is not None:
                if not isinstance(bg, dict):
                    errors.append(f'scene {sid}: video.visuals.background must be an object')
                else:
                    bg_image = bg.get('image')
                    if bg_image:
                        if not Path(bg_image).exists():
                            errors.append(f'scene {sid}: background image not found: {bg_image}')
                    else:
                        errors.append(f'scene {sid}: background.image is required when background is set')

                    fit = bg.get('fit')
                    if fit and fit not in BACKGROUND_FITS:
                        errors.append(f'scene {sid}: unknown background fit: {fit!r}')

                    anchor = bg.get('anchor')
                    if anchor and anchor not in BACKGROUND_ANCHORS:
                        errors.append(f'scene {sid}: unknown background anchor: {anchor!r}')

                    opacity = bg.get('opacity')
                    if opacity is not None:
                        try:
                            opacity_f = float(opacity)
                        except (TypeError, ValueError):
                            errors.append(f'scene {sid}: background opacity must be a number')
                        else:
                            if not 0.0 <= opacity_f <= 1.0:
                                errors.append(f'scene {sid}: background opacity must be between 0 and 1')

        # Validate post-processing chain.
        for j, entry in enumerate(video.get('post', [])):
            etype = entry.get('type')
            eid = entry.get('id')
            if etype == 'glitch':
                if eid not in GLITCH_EFFECTS:
                    errors.append(f'scene {sid} post[{j}]: unknown glitch effect: {eid!r}')
            elif etype == 'filter':
                if eid not in filter_library:
                    errors.append(f'scene {sid} post[{j}]: unknown filter: {eid!r}')
            elif etype == 'post_filter':
                if eid not in post_filter_registry:
                    errors.append(f'scene {sid} post[{j}]: unknown post_filter: {eid!r}')
            else:
                errors.append(f'scene {sid} post[{j}]: unknown type: {etype!r} (must be glitch, filter, or post_filter)')

    # Validate global post chain.
    for j, entry in enumerate(timeline.get('post', [])):
        etype = entry.get('type')
        eid = entry.get('id')
        if etype == 'glitch':
            if eid not in GLITCH_EFFECTS:
                errors.append(f'global post[{j}]: unknown glitch effect: {eid!r}')
        elif etype == 'filter':
            if eid not in filter_library:
                errors.append(f'global post[{j}]: unknown filter: {eid!r}')
        elif etype == 'post_filter':
            if eid not in post_filter_registry:
                errors.append(f'global post[{j}]: unknown post_filter: {eid!r}')
        else:
            errors.append(f'global post[{j}]: unknown type: {etype!r}')

    return errors


def load(path: str) -> dict:
    with open(path) as f:
        return json.load(f)


def save(timeline: dict, path: str):
    with open(path, 'w') as f:
        json.dump(timeline, f, indent=2)
    print(f'wrote {path}')
