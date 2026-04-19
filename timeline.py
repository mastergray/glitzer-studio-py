"""Timeline JSON schema + validation.

A timeline describes a complete render: audio source, tool paths,
per-scene visual instructions, and output settings.
"""
from __future__ import annotations
import json
from pathlib import Path


SCHEMA_VERSION = 1


def create_skeleton(audio_path: str, sections: list[dict],
                    tools: dict, temp_dir: str = '/tmp/glitzle') -> dict:
    """Build an empty timeline from audio analysis sections.

    sections: list of {start_sec, end_sec, label} from the analyzer.
    """
    scenes = []
    for i, sec in enumerate(sections):
        scenes.append({
            'id': i + 1,
            'start_sec': round(sec['start_sec'], 3),
            'end_sec': round(sec['end_sec'], 3),
            'label': sec.get('label', ''),
            'beats': sec.get('beats', 0),
            'downbeats': sec.get('downbeats', 0),
            'source': None,
            'post': None,
            'filters': None,
        })

    return {
        'version': SCHEMA_VERSION,
        'audio': str(audio_path),
        'tools': tools,
        'temp_dir': temp_dir,
        'palette': 'rainbow',
        'scenes': scenes,
    }


def validate(timeline: dict, filter_registry: dict | None = None) -> list[str]:
    """Validate a populated timeline. Returns list of error strings (empty = valid)."""
    errors = []

    if timeline.get('version') != SCHEMA_VERSION:
        errors.append(f'unsupported version: {timeline.get("version")}')

    if not timeline.get('audio'):
        errors.append('missing audio path')
    elif not Path(timeline['audio']).exists():
        errors.append(f'audio file not found: {timeline["audio"]}')

    tools = timeline.get('tools', {})
    for tool in ('ffmpeg', 'dazzle', 'glitch_maker'):
        if tool not in tools or not tools[tool]:
            errors.append(f'missing tools.{tool} path')
        else:
            tp = tools[tool]
            # For executables (ffmpeg): accept bare command names on PATH.
            # For project dirs (dazzle, glitch_maker): require existing path.
            if tool == 'ffmpeg':
                import shutil
                if not shutil.which(tp):
                    errors.append(f'tools.{tool} not found on PATH: {tp}')
            elif not Path(tp).exists():
                errors.append(f'tools.{tool} path not found: {tp}')

    scenes = timeline.get('scenes', [])
    if not scenes:
        errors.append('no scenes defined')

    for scene in scenes:
        sid = scene.get('id', '?')
        if scene.get('source') is None:
            errors.append(f'scene {sid}: source is null (must be populated)')

        src = scene.get('source', {})
        if isinstance(src, dict):
            stype = src.get('type')
            if stype not in ('dazzle', 'video', None):
                errors.append(f'scene {sid}: unknown source type: {stype}')
            if stype == 'video' and not src.get('path'):
                errors.append(f'scene {sid}: video source missing path')
            if stype == 'dazzle' and not src.get('effects'):
                errors.append(f'scene {sid}: dazzle source missing effects list')

        # Validate filter references against registry
        filt = scene.get('filters')
        if filt and filter_registry and not filt.startswith(('eq=', 'noise', 'draw',
                'rgba', 'hue', 'curves', 'blend', 'split', 'overlay', 'lut',
                'shuffle', 'pixel', 'scroll', 'random', 'lag', 'amplify',
                'tmix', 'tblend', 'tinterlace', 'posterize', 'negate',
                'zoompan', 'edgedetect', 'pseudocolor', 'bitplane',
                'crop', 'scale', 'format', 'null')):
            # Looks like a recipe slug — check registry
            if filt not in filter_registry:
                errors.append(f'scene {sid}: unknown filter recipe: {filt!r}')

    return errors


def load(path: str) -> dict:
    with open(path) as f:
        return json.load(f)


def save(timeline: dict, path: str):
    with open(path, 'w') as f:
        json.dump(timeline, f, indent=2)
    print(f'wrote {path}')
