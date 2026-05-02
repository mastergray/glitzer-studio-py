"""Scene renderer — orchestrates dazzle, glitch-maker, and ffmpeg per scene.

Each scene produces a temp video segment. After all scenes render, segments
are concatenated with the original audio. Global post is applied last.
"""
from __future__ import annotations
import os
import subprocess
import time
from pathlib import Path


def _run(cmd: list[str], label: str):
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f'[{label}] FAILED: {" ".join(cmd[:8])}...')
        if result.stderr:
            print(result.stderr[:500])
        raise SystemExit(f'{label} failed with exit code {result.returncode}')


def _render_dazzle(visuals: dict, scene_audio: str, out_path: str,
                   settings: dict, tools: dict):
    """Invoke dazzle-video-maker to generate visuals."""
    cmd = [
        'python3', os.path.join(tools['dazzle'], 'render.py'),
        scene_audio, out_path,
        '--mode', 'fixed',
        '--effects', *visuals['effects'],
        '--scale', str(settings.get('scale', 6)),
        '--fps', str(settings.get('fps', 60)),
        '--crf', str(settings.get('crf', 23)),
        '--ffmpeg', tools['ffmpeg'],
        '--ffprobe', tools['ffprobe'],
    ]

    palette = visuals.get('palette')
    if palette:
        cmd.extend(['--palette', palette])

    seed = settings.get('seed')
    if seed is not None:
        cmd.extend(['--seed', str(seed)])
    if tools.get('no_profile'):
        cmd.append('--no-profile')

    # Dazzle post effects.
    post_entries = visuals.get('post', [])
    if post_entries:
        post_names = []
        for entry in post_entries:
            if isinstance(entry, str):
                post_names.append(entry)
            else:
                post_names.append(entry['id'])
        cmd.extend(['--post', *post_names])

        # Post effect params: --{effect_id}-{prop} value
        # Props use dashes in CLI flags (e.g., speed-x not speed_x)
        for entry in post_entries:
            if isinstance(entry, dict) and entry.get('props'):
                eid = entry['id']
                for prop, val in entry['props'].items():
                    flag = f'--{eid}-{prop}'.replace('_', '-')
                    cmd.extend([flag, str(val)])

    return cmd


def _render_glitch(entry: dict, input_path: str, out_path: str,
                   audio_path: str, tools: dict):
    """Invoke glitch-maker for a single glitch effect."""
    cmd = [
        'python3', os.path.join(tools['glitch_maker'], 'render.py'),
        input_path, out_path,
        '--audio', audio_path,
        '--effects', entry['id'],
        '--ffmpeg', tools['ffmpeg'],
        '--ffprobe', tools['ffprobe'],
    ]
    if tools.get('no_profile'):
        cmd.append('--no-profile')

    # Effect props.
    for prop, val in entry.get('props', {}).items():
        # Map prop names to glitch-maker CLI flags.
        # Convention: effect-specific flags are --{prefix}-{prop}
        # but some are direct (e.g., --effects tear --tear-count-pct 10)
        flag = f'--{_effect_flag_prefix(entry["id"])}-{prop.replace("_", "-")}'
        cmd.extend([flag, str(val)])

    # Accumulate settings.
    acc = entry.get('accumulate', {})
    if acc.get('enabled'):
        cmd.append('--accumulate')
        if 'bleed' in acc:
            cmd.extend(['--accumulate-bleed', str(acc['bleed'])])
        if 'reset_sec' in acc:
            cmd.extend(['--accumulate-reset-sec', str(acc['reset_sec'])])

    return cmd


def _effect_flag_prefix(effect_id: str) -> str:
    """Map glitch-maker effect names to their CLI flag prefixes."""
    prefixes = {
        'tear': 'tear',
        'pixel_sort': 'psort',
        'pixel_scramble': 'pscramble',
        'jpeg_corrupt': 'jpeg',
        'chromatic': 'chroma',
        'databend': 'databend',
        'channel_swap': 'cswap',
        'bit_crush': 'bcrush',
        'invert_blocks': 'invert',
        'slitscan': 'slitscan',
        'warp': 'warp',
        'noise': 'noise',
        'clip_cut': 'clip-cut',
    }
    return prefixes.get(effect_id, effect_id)


def _render_post_filter(entry: dict, input_path: str, out_path: str,
                        tools: dict):
    """Apply an ops-based post_filter preset via the post_filters CLI."""
    runner = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                          'post_filters', 'run_post_filter.py')
    cmd = [
        'python3', runner,
        input_path, out_path, entry['id'],
        '--ffmpeg', tools['ffmpeg'],
        '--ffprobe', tools['ffprobe'],
        '--impl', tools.get('post_filter_impl', 'vectorized'),
    ]
    return cmd


def _render_filter(filter_id: str, filter_entry: dict, input_path: str,
                   out_path: str, tools: dict):
    """Apply an ffmpeg filter chain."""
    chain = filter_entry['filter_chain']
    is_complex = filter_entry.get('complex', False)

    if is_complex:
        # Prepend [0:v] if the chain doesn't start with an input label.
        if not chain.startswith('['):
            chain = f'[0:v]{chain}'
        cmd = [
            tools['ffmpeg'], '-y', '-v', 'error',
            '-i', input_path,
            '-filter_complex', chain,
            '-map', '0:v',
            '-c:a', 'copy',
            out_path,
        ]
    else:
        cmd = [
            tools['ffmpeg'], '-y', '-v', 'error',
            '-i', input_path,
            '-vf', chain,
            '-c:a', 'copy',
            out_path,
        ]
    return cmd


def trim_audio(ffmpeg: str, audio_path: str, start: float, duration: float,
               out_path: str):
    # -ss/-t after -i = output-side seek, byte-accurate for PCM/WAV.
    # (Putting them before -i with -c copy can produce empty files for some
    # WAV streams — observed on this codebase before the post_filter work.)
    cmd = [ffmpeg, '-y', '-v', 'error',
           '-i', audio_path,
           '-ss', str(start), '-t', str(duration),
           '-c', 'copy', out_path]
    _run(cmd, 'audio trim')


def render_scene(scene: dict, timeline: dict, filter_library: dict,
                 tools: dict, temp_dir: str) -> str:
    """Render a single scene → temp MP4 path."""
    sid = scene['id']
    settings = timeline.get('settings', {})
    audio = timeline['audio']
    start = scene['start_sec']
    end = scene['end_sec']
    duration = end - start

    # Trim audio for this scene.
    scene_audio = os.path.join(temp_dir, f'scene_{sid}_audio.wav')
    trim_audio(tools['ffmpeg'], audio, start, duration, scene_audio)

    video = scene['video']
    current_path = os.path.join(temp_dir, f'scene_{sid}_source.mp4')

    # Phase 1: Dazzle visuals.
    visuals = video['visuals']
    cmd = _render_dazzle(visuals, scene_audio, current_path, settings, tools)
    effects_str = ', '.join(visuals['effects'])
    post_str = ''
    if visuals.get('post'):
        names = [e if isinstance(e, str) else e['id'] for e in visuals['post']]
        post_str = f' post={names}'
    pal_str = f' palette={visuals.get("palette", "rainbow")}'
    print(f'  [scene {sid}] dazzle: [{effects_str}]{post_str}{pal_str}')
    _run(cmd, f'scene {sid} dazzle')

    # Phase 2: Post-processing chain (glitch + filter in order).
    step = 0
    for entry in video.get('post', []):
        step += 1
        next_path = os.path.join(temp_dir, f'scene_{sid}_post_{step}.mp4')

        if entry['type'] == 'glitch':
            cmd = _render_glitch(entry, current_path, next_path, scene_audio, tools)
            acc_str = ' +accumulate' if entry.get('accumulate', {}).get('enabled') else ''
            print(f'  [scene {sid}] glitch: {entry["id"]}{acc_str}')
            _run(cmd, f'scene {sid} glitch:{entry["id"]}')
            current_path = next_path

        elif entry['type'] == 'filter':
            fentry = filter_library[entry['id']]
            cmd = _render_filter(entry['id'], fentry, current_path, next_path, tools)
            cplx = ' (complex)' if fentry.get('complex') else ''
            print(f'  [scene {sid}] filter: {entry["id"]}{cplx}')
            _run(cmd, f'scene {sid} filter:{entry["id"]}')
            current_path = next_path

        elif entry['type'] == 'post_filter':
            cmd = _render_post_filter(entry, current_path, next_path, tools)
            print(f'  [scene {sid}] post_filter: {entry["id"]}')
            _run(cmd, f'scene {sid} post_filter:{entry["id"]}')
            current_path = next_path

    return current_path


def apply_post_chain(post_chain: list, input_path: str, audio_path: str,
                     filter_library: dict, tools: dict, temp_dir: str) -> str:
    """Apply the global post-processing chain to the concatenated video."""
    current_path = input_path
    for i, entry in enumerate(post_chain):
        next_path = os.path.join(temp_dir, f'global_post_{i}.mp4')

        if entry['type'] == 'glitch':
            cmd = _render_glitch(entry, current_path, next_path, audio_path, tools)
            acc_str = ' +accumulate' if entry.get('accumulate', {}).get('enabled') else ''
            print(f'  [global] glitch: {entry["id"]}{acc_str}')
            _run(cmd, f'global glitch:{entry["id"]}')
            current_path = next_path

        elif entry['type'] == 'filter':
            fentry = filter_library[entry['id']]
            cmd = _render_filter(entry['id'], fentry, current_path, next_path, tools)
            cplx = ' (complex)' if fentry.get('complex') else ''
            print(f'  [global] filter: {entry["id"]}{cplx}')
            _run(cmd, f'global filter:{entry["id"]}')
            current_path = next_path

        elif entry['type'] == 'post_filter':
            cmd = _render_post_filter(entry, current_path, next_path, tools)
            print(f'  [global] post_filter: {entry["id"]}')
            _run(cmd, f'global post_filter:{entry["id"]}')
            current_path = next_path

    return current_path


def concatenate(ffmpeg: str, segments: list[str], audio_path: str,
                out_path: str, crf: int = 23):
    """Concatenate scene segments + mux with full audio → final MP4."""
    concat_file = os.path.join(os.path.dirname(segments[0]), 'concat.txt')
    with open(concat_file, 'w') as f:
        for seg in segments:
            f.write(f"file '{os.path.abspath(seg)}'\n")

    cmd = [
        ffmpeg, '-y', '-v', 'error',
        '-f', 'concat', '-safe', '0',
        '-i', concat_file,
        '-i', audio_path,
        '-map', '0:v', '-map', '1:a',
        '-c:v', 'libx264', '-crf', str(crf),
        '-c:a', 'aac', '-b:a', '192k',
        '-shortest',
        out_path,
    ]
    _run(cmd, 'concatenate')
