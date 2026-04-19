"""Scene renderer — orchestrates dazzle, glitch-maker, and ffmpeg per scene.

Each scene produces a temp video segment. After all scenes render, segments
are concatenated with the original audio into the final MP4.
"""
from __future__ import annotations
import os
import subprocess
import time
from pathlib import Path


def _run(cmd: list[str], label: str, **kwargs):
    """Run a subprocess, printing the command on failure."""
    result = subprocess.run(cmd, capture_output=True, text=True, **kwargs)
    if result.returncode != 0:
        print(f'[{label}] FAILED: {" ".join(cmd[:6])}...')
        if result.stderr:
            print(result.stderr[:500])
        raise SystemExit(f'{label} failed with exit code {result.returncode}')
    return result


def render_scene(scene: dict, timeline: dict, filter_registry: dict,
                 scene_audio: str) -> str:
    """Render a single scene → temp MP4 path.

    Pipeline: source → [glitch-maker] → [ffmpeg filters] → temp segment.
    """
    tools = timeline['tools']
    temp_dir = timeline.get('temp_dir', '/tmp/glitzle')
    os.makedirs(temp_dir, exist_ok=True)

    sid = scene['id']
    start = scene['start_sec']
    end = scene['end_sec']
    duration = end - start
    palette = scene.get('palette', timeline.get('palette', 'rainbow'))

    # --- Phase 1: Generate source ---
    src = scene['source']
    stype = src['type']
    source_path = os.path.join(temp_dir, f'scene_{sid}_source.mp4')

    ffmpeg_bin = tools.get('ffmpeg', 'ffmpeg')
    ffprobe_bin = tools.get('ffprobe', 'ffprobe')

    if stype == 'dazzle':
        dazzle_dir = tools['dazzle']
        cmd = [
            'python3', os.path.join(dazzle_dir, 'render.py'),
            scene_audio, source_path,
            '--mode', 'fixed',
            '--effects', *src['effects'],
            '--palette', palette,
            '--scale', str(timeline.get('scale', 6)),
            '--fps', str(timeline.get('fps', 60)),
            '--crf', str(timeline.get('crf', 23)),
            '--ffmpeg', ffmpeg_bin,
            '--ffprobe', ffprobe_bin,
            '--no-profile',
        ]
        if src.get('post'):
            cmd.extend(['--post', *src['post']])
        # Pass post params if specified
        for key, val in src.get('post_params', {}).items():
            cmd.extend([f'--{key}', str(val)])

        print(f'  [scene {sid}] dazzle: {src["effects"]}', end='')
        if src.get('post'):
            print(f' post={src["post"]}', end='')
        print(f' palette={palette}')
        _run(cmd, f'scene {sid} dazzle')

    elif stype == 'fractal':
        fractal_dir = tools.get('fractal')
        if not fractal_dir:
            raise SystemExit(f'scene {sid}: fractal source requires tools.fractal path')
        config = src.get('config', 'recipes/default.json')
        cmd = [
            'python3', os.path.join(fractal_dir, 'render.py'),
            scene_audio, source_path,
            '--config', os.path.join(fractal_dir, config),
            '--no-profile',
        ]
        print(f'  [scene {sid}] fractal: {config}')
        _run(cmd, f'scene {sid} fractal')

    elif stype == 'video':
        # Trim the source video to the scene duration.
        video_path = src['path']
        video_start = src.get('start_sec', start)
        cmd = [
            ffmpeg_bin, '-y', '-v', 'error',
            '-ss', str(video_start), '-t', str(duration),
            '-i', video_path, '-c', 'copy', source_path,
        ]
        print(f'  [scene {sid}] video: {video_path} [{video_start:.1f}s +{duration:.1f}s]')
        _run(cmd, f'scene {sid} video trim')

    # --- Phase 2: Glitch-maker post-processing ---
    post = scene.get('post')
    if post:
        gm_dir = tools['glitch_maker']
        post_path = os.path.join(temp_dir, f'scene_{sid}_post.mp4')

        cmd = [
            'python3', os.path.join(gm_dir, 'render.py'),
            source_path, post_path,
            '--audio', scene_audio,
            '--ffmpeg', ffmpeg_bin,
            '--ffprobe', ffprobe_bin,
            '--no-profile',
        ]

        if post.get('recipe'):
            cmd.extend(['--config', os.path.join(gm_dir, 'recipes', post['recipe'] + '.json')])
        elif post.get('effects'):
            effect_names = [e['name'] if isinstance(e, dict) else e for e in post['effects']]
            cmd.extend(['--effects', *effect_names])

        if post.get('accumulate'):
            cmd.append('--accumulate')
            if 'bleed' in post:
                cmd.extend(['--accumulate-bleed', str(post['bleed'])])
            if 'reset_sec' in post:
                cmd.extend(['--accumulate-reset-sec', str(post['reset_sec'])])

        print(f'  [scene {sid}] glitch-maker: {post.get("recipe") or "custom"}')
        _run(cmd, f'scene {sid} glitch-maker')
        source_path = post_path

    # --- Phase 3: FFmpeg filters ---
    filt = scene.get('filters')
    if filt:
        # Resolve recipe slug → filter chain
        if filt in filter_registry:
            filter_chain = filter_registry[filt]['filter_chain']
        else:
            filter_chain = filt  # raw ffmpeg filter string

        filter_path = os.path.join(temp_dir, f'scene_{sid}_filtered.mp4')
        cmd = [
            ffmpeg_bin, '-y', '-v', 'error',
            '-i', source_path,
            '-vf', filter_chain,
            '-c:a', 'copy',
            filter_path,
        ]
        print(f'  [scene {sid}] ffmpeg filter: {filt}')
        _run(cmd, f'scene {sid} ffmpeg filter')
        source_path = filter_path

    return source_path


def trim_audio(ffmpeg: str, audio_path: str, start: float, duration: float,
               out_path: str):
    """Extract a segment of audio for a scene."""
    cmd = [ffmpeg, '-y', '-v', 'error',
           '-ss', str(start), '-t', str(duration),
           '-i', audio_path,
           '-c', 'copy', out_path]
    _run(cmd, 'audio trim')


def concatenate(ffmpeg: str, segments: list[str], audio_path: str,
                out_path: str, crf: int = 23):
    """Concatenate scene segments + mux with full audio → final MP4."""
    # Write concat list file
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
