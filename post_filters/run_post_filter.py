"""Apply a post_filter preset to a video file.

Pipes raw RGBA frames out of ffmpeg, applies the preset's ops chain via
apply_post_filters.py, pipes the transformed frames back into ffmpeg for
re-encoding. Audio from the input is copied through unchanged.

Usage:
    python run_post_filter.py <input.mp4> <output.mp4> <preset_id>
        [--ffmpeg <path>] [--ffprobe <path>] [--crf <int>]
"""
from __future__ import annotations
import argparse
import json
import subprocess
import sys
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
# Default to the vectorized implementation; the --impl flag in main() can swap
# to the original Python pixel-loop port for A/B comparison.
import apply_post_filters as apf


def probe_video(ffprobe: str, path: str):
    cmd = [
        ffprobe, '-v', 'error', '-select_streams', 'v:0',
        '-show_entries', 'stream=width,height,r_frame_rate,nb_frames',
        '-of', 'json', path,
    ]
    out = subprocess.check_output(cmd, text=True)
    data = json.loads(out)
    s = data['streams'][0]
    num, den = s['r_frame_rate'].split('/')
    fps = float(num) / float(den)
    return {
        'width': int(s['width']),
        'height': int(s['height']),
        'fps': fps,
        'nb_frames': int(s.get('nb_frames', 0)) or None,
    }


def has_audio(ffprobe: str, path: str) -> bool:
    cmd = [
        ffprobe, '-v', 'error', '-select_streams', 'a:0',
        '-show_entries', 'stream=codec_type', '-of', 'csv=p=0', path,
    ]
    out = subprocess.run(cmd, capture_output=True, text=True).stdout.strip()
    return out == 'audio'


def load_all_presets():
    presets_dir = HERE / 'presets'
    if not presets_dir.exists():
        raise SystemExit(f'presets directory not found: {presets_dir}')
    count = 0
    for jf in sorted(presets_dir.glob('*.json')):
        count = apf.load_presets(json.loads(jf.read_text()))
    return count


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('input')
    ap.add_argument('output')
    ap.add_argument('preset_id')
    ap.add_argument('--ffmpeg', default='ffmpeg')
    ap.add_argument('--ffprobe', default='ffprobe')
    ap.add_argument('--crf', type=int, default=23)
    ap.add_argument('--impl', choices=('vectorized', 'loop'), default='vectorized',
                    help='vectorized = NumPy ops (fast), loop = original per-pixel '
                         'Python port (slow, used as A/B reference).')
    args = ap.parse_args()
    if args.impl == 'loop':
        global apf
        import apply_post_filters_loop as apf  # noqa: F811

    n = load_all_presets()
    preset = apf.get_preset_by_id(args.preset_id)
    if preset is None:
        raise SystemExit(
            f'unknown preset: {args.preset_id!r} '
            f'(loaded {n} from {HERE / "presets"})'
        )

    info = probe_video(args.ffprobe, args.input)
    W, H, fps = info['width'], info['height'], info['fps']
    frame_bytes = W * H * 4
    audio_present = has_audio(args.ffprobe, args.input)

    # Decoder: stdout = raw RGBA frames
    dec_cmd = [
        args.ffmpeg, '-v', 'error',
        '-i', args.input,
        '-f', 'rawvideo', '-pix_fmt', 'rgba',
        '-',
    ]
    # Encoder: stdin = raw RGBA frames, optional audio merge from input
    enc_cmd = [
        args.ffmpeg, '-y', '-v', 'error',
        '-f', 'rawvideo', '-pix_fmt', 'rgba',
        '-s', f'{W}x{H}', '-framerate', str(fps),
        '-i', '-',
    ]
    if audio_present:
        enc_cmd += ['-i', args.input, '-map', '0:v', '-map', '1:a', '-c:a', 'copy']
    enc_cmd += [
        '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', str(args.crf),
        args.output,
    ]

    decoder = subprocess.Popen(dec_cmd, stdout=subprocess.PIPE)
    encoder = subprocess.Popen(enc_cmd, stdin=subprocess.PIPE)

    frame_n = 0
    try:
        while True:
            buf = decoder.stdout.read(frame_bytes)
            if not buf or len(buf) < frame_bytes:
                break
            src = np.frombuffer(buf, dtype=np.uint8).copy()
            ctx = {'W': W, 'H': H, 'frameN': frame_n}
            out = apf.apply_post_filters(src, [{'id': args.preset_id}], ctx)
            encoder.stdin.write(out.tobytes())
            frame_n += 1
    finally:
        if encoder.stdin:
            encoder.stdin.close()
        decoder.wait()
        encoder.wait()

    if encoder.returncode != 0:
        raise SystemExit(f'encoder exited with code {encoder.returncode}')
    if decoder.returncode not in (0, None):
        raise SystemExit(f'decoder exited with code {decoder.returncode}')

    print(f'[post_filter] {args.preset_id}: {frame_n} frames → {args.output}')


if __name__ == '__main__':
    main()
