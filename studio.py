"""Glitzle Studio — audio-reactive video composition pipeline.

Two-phase workflow:
  1. analyze: audio → timeline skeleton (JSON with scene boundaries)
  2. render:  populated timeline → final video

Orchestrates dazzle (generation), glitch-maker (effects), and ffmpeg
(filters + encode) per scene, then concatenates into the final MP4.
"""
from __future__ import annotations
import argparse
import json
import os
import subprocess
import sys
import tempfile
import time
from pathlib import Path

from timeline import create_skeleton, validate, load, save, SCHEMA_VERSION
from filters import load_all_filters, list_filters
from renderer import render_scene, trim_audio, concatenate


ANALYZER = Path(__file__).resolve().parent / 'analyze_audio.py'


def cmd_analyze(args):
    """Phase 1: Analyze audio → timeline skeleton."""
    audio = os.path.abspath(args.audio)
    if not Path(audio).exists():
        raise SystemExit(f'audio not found: {audio}')

    # Run the audio analyzer.
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

    # Collect section_change timestamps as scene boundaries.
    boundaries = [0.0]
    for ev in events:
        if ev.get('type') == 'section_change':
            boundaries.append(ev['t'])
    boundaries.append(duration)
    # Deduplicate + sort.
    boundaries = sorted(set(boundaries))

    # If only start+end (no section changes), try using segments instead.
    if len(boundaries) <= 2:
        segments = analysis.get('segments', [])
        if segments:
            boundaries = sorted(set(
                [0.0] + [s['start'] for s in segments] + [duration]
            ))

    # Build sections from consecutive boundary pairs.
    sections = []
    segments_data = analysis.get('segments', [])
    for i in range(len(boundaries) - 1):
        start = boundaries[i]
        end = boundaries[i + 1]
        if end - start < 0.1:
            continue
        # Find label from segments that overlap this range.
        label = ''
        for seg in segments_data:
            if seg['start'] <= start < seg['end']:
                label = ', '.join(seg.get('labels', []))
                break
        sections.append({'start_sec': start, 'end_sec': end, 'label': label})

    if not sections:
        sections = [{'start_sec': 0.0, 'end_sec': duration, 'label': 'full'}]

    # Count beats/downbeats per section.
    for sec in sections:
        sec['beats'] = sum(1 for ev in events
                          if ev.get('type') == 'beat'
                          and sec['start_sec'] <= ev['t'] < sec['end_sec'])
        sec['downbeats'] = sum(1 for ev in events
                              if ev.get('type') == 'downbeat'
                              and sec['start_sec'] <= ev['t'] < sec['end_sec'])

    # Build tool paths (user can edit these in the JSON).
    tools = {
        'ffmpeg': args.ffmpeg or 'ffmpeg',
        'dazzle': args.dazzle or '',
        'glitch_maker': args.glitch_maker or '',
        'ffmpeg_filters': args.ffmpeg_filters or '',
    }

    skeleton = create_skeleton(audio, sections, tools,
                               temp_dir=args.temp_dir or '/tmp/glitzle')

    out_path = args.output or os.path.splitext(os.path.basename(audio))[0] + '.timeline.json'
    save(skeleton, out_path)
    print(f'[analyze] {len(sections)} scene(s) from audio analysis')
    print(f'[analyze] edit {out_path} to populate each scene, then run:')
    print(f'  python3 studio.py render {out_path} --output final.mp4')


def cmd_render(args):
    """Phase 2: Render populated timeline → final video."""
    timeline = load(args.timeline)

    # Load ffmpeg filter recipes if path is configured.
    filter_dir = timeline.get('tools', {}).get('ffmpeg_filters', '')
    filter_registry = {}
    if filter_dir and Path(filter_dir).is_dir():
        filter_registry = load_all_filters(filter_dir)
        print(f'[filters] loaded {len(filter_registry)} ffmpeg filter recipes')

    # Validate.
    errors = validate(timeline, filter_registry)
    if errors:
        print('Timeline validation errors:')
        for e in errors:
            print(f'  - {e}')
        raise SystemExit('fix the errors above and re-run')

    audio = timeline['audio']
    tools = timeline['tools']
    temp_dir = timeline.get('temp_dir', '/tmp/glitzle')
    os.makedirs(temp_dir, exist_ok=True)
    out_path = args.output or 'output.mp4'

    scenes = timeline['scenes']
    print(f'[render] {len(scenes)} scene(s) to render')

    t0 = time.time()
    segments = []
    for scene in scenes:
        sid = scene['id']
        start = scene['start_sec']
        end = scene['end_sec']
        duration = end - start

        # Trim audio for this scene (dazzle/glitch-maker need audio input).
        scene_audio = os.path.join(temp_dir, f'scene_{sid}_audio.wav')
        trim_audio(tools['ffmpeg'], audio, start, duration, scene_audio)

        seg_path = render_scene(scene, timeline, filter_registry, scene_audio)
        segments.append(seg_path)

    print(f'[render] concatenating {len(segments)} segments')
    concatenate(tools['ffmpeg'], segments, audio, out_path,
                crf=timeline.get('crf', 23))

    dt = time.time() - t0
    print(f'[render] done in {dt:.1f}s → {out_path}')


def cmd_filters(args):
    """List available ffmpeg filter recipes."""
    if not args.path:
        raise SystemExit('--path required (directory containing ffmpeg-*.md files)')
    registry = load_all_filters(args.path)
    print(f'{len(registry)} filter recipes:\n')
    print(list_filters(registry))


def main():
    p = argparse.ArgumentParser(
        description='Glitzle Studio — audio-reactive video composition pipeline',
    )
    sub = p.add_subparsers(dest='command')

    # --- analyze ---
    a = sub.add_parser('analyze', help='Analyze audio → timeline skeleton')
    a.add_argument('audio', help='input audio (WAV)')
    a.add_argument('--output', '-o', help='output timeline JSON path')
    a.add_argument('--ffmpeg', help='path to ffmpeg binary (default: ffmpeg)')
    a.add_argument('--dazzle', help='path to dazzle-video-maker-py directory')
    a.add_argument('--glitch-maker', help='path to glitch-maker-py directory')
    a.add_argument('--ffmpeg-filters', help='path to ffmpeg recipe markdown directory')
    a.add_argument('--temp-dir', help='temp directory for intermediate files')

    # --- render ---
    r = sub.add_parser('render', help='Render populated timeline → final video')
    r.add_argument('timeline', help='populated timeline JSON')
    r.add_argument('--output', '-o', help='output MP4 path (default: output.mp4)')

    # --- filters ---
    f = sub.add_parser('filters', help='List available ffmpeg filter recipes')
    f.add_argument('--path', help='directory containing ffmpeg-*.md files')

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
