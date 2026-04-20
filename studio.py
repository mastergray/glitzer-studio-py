"""Glitzle Studio — audio-reactive video composition pipeline.

Two-phase workflow:
  1. analyze: audio → timeline skeleton (JSON with scene boundaries)
  2. render:  populated timeline → final video

Orchestrates dazzle (generation), glitch-maker (effects), and ffmpeg
(filters from managed library) per scene.
"""
from __future__ import annotations
import argparse
import concurrent.futures
import json
import os
import subprocess
import sys
import tempfile
import time
from pathlib import Path

from timeline import create_skeleton, validate, load, save
from renderer import render_scene, apply_post_chain, concatenate


ANALYZER = Path(__file__).resolve().parent / 'analyze_audio.py'
FILTER_LIBRARY = Path(__file__).resolve().parent / 'filter_library.json'


def _load_filter_library() -> dict:
    if not FILTER_LIBRARY.exists():
        raise SystemExit(f'filter library not found: {FILTER_LIBRARY}\n'
                         f'run: python3 -c "from filters import load_all_filters; ..." to regenerate')
    with open(FILTER_LIBRARY) as f:
        return json.load(f)


def cmd_analyze(args):
    """Phase 1: Analyze audio → timeline skeleton."""
    audio = os.path.abspath(args.audio)
    if not Path(audio).exists():
        raise SystemExit(f'audio not found: {audio}')

    print(f'[analyze] running analyzer on {audio}')
    analysis_tmp = tempfile.NamedTemporaryFile(suffix='.json', delete=False)
    analysis_tmp.close()
    subprocess.check_call(
        ['python3', str(ANALYZER), '--input', audio, '--output', analysis_tmp.name],
        stdout=subprocess.DEVNULL,
    )

    with open(analysis_tmp.name) as f:
        analysis = json.load(f)
    os.remove(analysis_tmp.name)

    # Extract scene boundaries from section_change events.
    duration = analysis.get('track', {}).get('duration_sec', 0)
    events = analysis.get('events', [])

    boundaries = [0.0]
    for ev in events:
        if ev.get('type') == 'section_change':
            boundaries.append(ev['t'])
    boundaries.append(duration)
    boundaries = sorted(set(boundaries))

    # If no section changes, use segments.
    if len(boundaries) <= 2:
        segments = analysis.get('segments', [])
        if segments:
            boundaries = sorted(set(
                [0.0] + [s['start'] for s in segments] + [duration]
            ))

    # Build sections from consecutive boundary pairs.
    segments_data = analysis.get('segments', [])
    sections = []
    for i in range(len(boundaries) - 1):
        start = boundaries[i]
        end = boundaries[i + 1]
        if end - start < 0.1:
            continue
        label = ''
        for seg in segments_data:
            if seg['start'] <= start < seg['end']:
                label = ', '.join(seg.get('labels', []))
                break
        sections.append({
            'start_sec': start,
            'end_sec': end,
            'label': label,
            'beats': sum(1 for ev in events
                        if ev.get('type') == 'beat'
                        and start <= ev['t'] < end),
            'downbeats': sum(1 for ev in events
                            if ev.get('type') == 'downbeat'
                            and start <= ev['t'] < end),
        })

    if not sections:
        sections = [{'start_sec': 0.0, 'end_sec': duration, 'label': 'full',
                     'beats': 0, 'downbeats': 0}]

    skeleton = create_skeleton(audio, sections)
    out_path = args.output or os.path.splitext(os.path.basename(audio))[0] + '.timeline.json'
    save(skeleton, out_path)
    print(f'[analyze] {len(sections)} scene(s) from audio analysis')
    print(f'[analyze] edit {out_path} to populate each scene, then run:')
    print(f'  python3 studio.py render {out_path} -o final.mp4 \\')
    print(f'    --dazzle /path/to/dazzle-video-maker-py \\')
    print(f'    --glitch-maker /path/to/glitch-maker-py \\')
    print(f'    --ffmpeg /path/to/ffmpeg')


def cmd_render(args):
    """Phase 2: Render populated timeline → final video."""
    timeline = load(args.timeline)
    filter_library = _load_filter_library()

    # Validate everything before processing.
    errors = validate(timeline, filter_library)
    if errors:
        print('Timeline validation errors:')
        for e in errors:
            print(f'  - {e}')
        raise SystemExit('fix the errors above and re-run')

    # Build tools dict from CLI flags.
    tools = {
        'ffmpeg': args.ffmpeg,
        'ffprobe': args.ffprobe,
        'dazzle': args.dazzle,
        'glitch_maker': args.glitch_maker,
    }

    # Validate tool paths.
    import shutil
    for name in ('ffmpeg', 'ffprobe'):
        if not shutil.which(tools[name]):
            raise SystemExit(f'--{name} not found: {tools[name]}')
    for name in ('dazzle', 'glitch_maker'):
        if not Path(tools[name]).is_dir():
            raise SystemExit(f'--{name.replace("_", "-")} directory not found: {tools[name]}')

    audio = timeline['audio']
    settings = timeline.get('settings', {})
    temp_dir = args.temp_dir
    os.makedirs(temp_dir, exist_ok=True)
    out_path = args.output

    scenes = timeline['scenes']
    if args.parallel == 'auto':
        parallel = len(scenes)
    else:
        parallel = int(args.parallel)
    print(f'[render] {len(scenes)} scene(s) to render (parallel={parallel})')

    t0 = time.time()
    if parallel > 1 and len(scenes) > 1:
        # Render scenes in parallel — each is independent until concatenation.
        segments = [None] * len(scenes)
        with concurrent.futures.ThreadPoolExecutor(max_workers=parallel) as pool:
            futures = {
                pool.submit(render_scene, scene, timeline, filter_library, tools, temp_dir): i
                for i, scene in enumerate(scenes)
            }
            for future in concurrent.futures.as_completed(futures):
                idx = futures[future]
                segments[idx] = future.result()
    else:
        segments = []
        for scene in scenes:
            seg_path = render_scene(scene, timeline, filter_library, tools, temp_dir)
            segments.append(seg_path)

    # Concatenate all scenes.
    concat_path = os.path.join(temp_dir, 'concatenated.mp4')
    print(f'[render] concatenating {len(segments)} segments')
    concatenate(tools['ffmpeg'], segments, audio, concat_path,
                crf=settings.get('crf', 23))

    # Apply global post chain if present.
    global_post = timeline.get('post', [])
    if global_post:
        print(f'[render] applying {len(global_post)} global post effect(s)')
        final_path = apply_post_chain(global_post, concat_path, audio,
                                       filter_library, tools, temp_dir)
        # Copy final to output.
        import shutil as sh
        sh.copy2(final_path, out_path)
    else:
        import shutil as sh
        sh.copy2(concat_path, out_path)

    dt = time.time() - t0
    print(f'[render] done in {dt:.1f}s → {out_path}')


def cmd_filters(args):
    """List available ffmpeg filters from the managed library."""
    library = _load_filter_library()
    print(f'{len(library)} managed filters:\n')
    for slug in sorted(library):
        r = library[slug]
        chain_preview = r['filter_chain'][:60]
        if len(r['filter_chain']) > 60:
            chain_preview += '...'
        print(f'  {slug:45s} {chain_preview}')


def main():
    p = argparse.ArgumentParser(
        description='Glitzle Studio — audio-reactive video composition pipeline',
    )
    sub = p.add_subparsers(dest='command')

    # --- analyze ---
    a = sub.add_parser('analyze', help='Analyze audio → timeline skeleton')
    a.add_argument('audio', help='input audio (WAV)')
    a.add_argument('--output', '-o', help='output timeline JSON path')

    # --- render ---
    r = sub.add_parser('render', help='Render populated timeline → final video')
    r.add_argument('timeline', help='populated timeline JSON')
    r.add_argument('--output', '-o', default='output.mp4', help='output MP4 path')
    r.add_argument('--dazzle', required=True, help='path to dazzle-video-maker-py directory')
    r.add_argument('--glitch-maker', required=True, help='path to glitch-maker-py directory')
    r.add_argument('--ffmpeg', default='ffmpeg', help='path to ffmpeg binary')
    r.add_argument('--ffprobe', default='ffprobe', help='path to ffprobe binary')
    r.add_argument('--temp-dir', default='/tmp/glitzle', help='temp directory for intermediates')
    r.add_argument('--parallel', default='1',
                   help='render N scenes in parallel. "auto" = one worker per scene. '
                        '(default 1 = sequential)')

    # --- filters ---
    sub.add_parser('filters', help='List managed ffmpeg filter library')

    args = p.parse_args()
    if args.command == 'analyze':
        cmd_analyze(args)
    elif args.command == 'render':
        cmd_render(args)
    elif args.command == 'filters':
        cmd_filters(args)
    else:
        p.print_help()


if __name__ == '__main__':
    main()
