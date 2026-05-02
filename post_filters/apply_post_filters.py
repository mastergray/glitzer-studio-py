"""
Glitch Post-Filters — Python port of glitch.post-filters.js (vectorized).

Data-free pixel-op library. Preset catalogs are loaded at runtime via
load_presets() — same JSON files (presets/*.json) used by the JS module.

Buffers are flat uint8 RGBA numpy arrays of length W*H*4, matching the
Uint8ClampedArray layout used by the JS side. Out-of-range channel values
are clamped to [0, 255] on store, again matching Uint8ClampedArray.

ctx is a dict: { "W": int, "H": int, "frameN": int }
  W, H    = output buffer dimensions
  frameN  = current frame index (used by zoomShake/sliceShiftX/sliceShiftY
            for time-varying behavior)

All ops are implemented as NumPy array expressions (no per-pixel Python
loops). For random ops (noise, blockJitter) we still use random.random()
in the per-block driver so the random-sequence semantics match the
unvectorized port frame-for-frame; per-pixel jitter inside a block
is generated with np.random for speed, accepting that the within-block
random pattern differs from the JS reference (which is already a
mismatch in the prior pure-Python version, since CPython random and JS
Math.random use different RNGs).

Public API:
  load_presets(presets)         -> int (registry size)
  clear_presets()               -> None
  get_presets()                 -> list of presets
  get_preset_by_id(preset_id)   -> preset dict or None
  apply_filter_op(op, src, ctx) -> new uint8 RGBA buffer (flat)
  apply_post_filters(src, stack, ctx) -> new uint8 RGBA buffer (flat)
"""

import math
import random
import numpy as np


_PRESET_REGISTRY = {}


def load_presets(presets):
    if not isinstance(presets, list):
        raise TypeError("load_presets: expected a list of preset dicts")
    for i, p in enumerate(presets):
        if (
            not isinstance(p, dict)
            or not isinstance(p.get("id"), str)
            or not isinstance(p.get("ops"), list)
        ):
            raise TypeError(
                "load_presets: preset at index " + str(i) + " missing id or ops"
            )
        _PRESET_REGISTRY[p["id"]] = p
    return len(_PRESET_REGISTRY)


def clear_presets():
    _PRESET_REGISTRY.clear()


def get_presets():
    return list(_PRESET_REGISTRY.values())


def get_preset_by_id(preset_id):
    return _PRESET_REGISTRY.get(preset_id)


def _clamp255(v):
    if v < 0:
        return 0
    if v > 255:
        return 255
    return int(v)


def _js_round(x):
    """Match JavaScript Math.round semantics: floor(x + 0.5)."""
    return math.floor(x + 0.5)


def _js_round_arr(x):
    """Vectorized floor(x + 0.5) for a numpy float array."""
    return np.floor(x + 0.5)


def _to_uint8(img_rgb_float, alpha=255):
    """Clip float RGB to [0,255], cast to uint8, append alpha=255."""
    H, W = img_rgb_float.shape[:2]
    out = np.empty((H, W, 4), dtype=np.uint8)
    out[..., :3] = np.clip(img_rgb_float, 0, 255).astype(np.uint8)
    out[..., 3] = alpha
    return out


def apply_filter_op(op, src, ctx):
    """Apply a single op descriptor to src; return a new flat uint8 RGBA buffer."""
    W = ctx["W"]
    H = ctx["H"]
    frameN = ctx.get("frameN", 0)
    name = op.get("op", "") if isinstance(op, dict) else ""

    img = src.reshape(H, W, 4)
    rgb = img[..., :3].astype(np.float32)

    if name == "contrast":
        c = float(op.get("value") or 1)
        out_rgb = (rgb - 128.0) * c + 128.0
        return _to_uint8(out_rgb).reshape(-1)

    if name == "saturation":
        s = float(op.get("value") or 1)
        r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
        y = 0.299 * r + 0.587 * g + 0.114 * b
        out_rgb = np.stack([y + (r - y) * s, y + (g - y) * s, y + (b - y) * s], axis=-1)
        return _to_uint8(out_rgb).reshape(-1)

    if name == "posterize":
        levels = max(2, int(op.get("levels") or 4))
        step1 = _js_round_arr((rgb / 255.0) * (levels - 1))
        out_rgb = _js_round_arr((step1 / (levels - 1)) * 255.0)
        return _to_uint8(out_rgb).reshape(-1)

    if name == "noise":
        amount = max(0, float(op.get("amount") or 0))
        # 3 random values per pixel matches the original (r,g,b each get noise).
        noise = (np.random.random((H, W, 3)).astype(np.float32) * 2.0 - 1.0) * amount
        return _to_uint8(rgb + noise).reshape(-1)

    if name == "pixelate":
        size = max(1, int(op.get("size") or 2))
        # Pad to a multiple of size, block-reduce, repeat back. A 1-mask tracks
        # how many real pixels are in each (possibly-partial) edge block so the
        # average matches the original's per-block-valid-pixel divisor.
        H2 = ((H + size - 1) // size) * size
        W2 = ((W + size - 1) // size) * size
        pad = np.zeros((H2, W2, 3), dtype=np.float32)
        pad[:H, :W] = rgb
        mask = np.zeros((H2, W2), dtype=np.float32)
        mask[:H, :W] = 1.0
        nh, nw = H2 // size, W2 // size
        block_sum = pad.reshape(nh, size, nw, size, 3).sum(axis=(1, 3))
        block_cnt = mask.reshape(nh, size, nw, size).sum(axis=(1, 3))
        block_avg = _js_round_arr(block_sum / np.maximum(block_cnt[..., None], 1.0))
        expanded = np.repeat(np.repeat(block_avg, size, axis=0), size, axis=1)
        return _to_uint8(expanded[:H, :W]).reshape(-1)

    if name == "scanlines":
        strength = max(0, min(1, float(op.get("strength") or 0.15)))
        k = np.ones(H, dtype=np.float32)
        k[::2] = 1.0 - strength
        out_rgb = rgb * k[:, None, None]
        return _to_uint8(out_rgb).reshape(-1)

    if name == "rgbShift":
        rX = math.floor(float(op.get("rX") or 0))
        bX = math.floor(float(op.get("bX") or 0))
        xs = np.arange(W)
        xr = np.clip(xs + rX, 0, W - 1)
        xb = np.clip(xs + bX, 0, W - 1)
        out = np.empty_like(img)
        out[..., 0] = img[:, xr, 0]
        out[..., 1] = img[..., 1]
        out[..., 2] = img[:, xb, 2]
        out[..., 3] = 255
        return out.reshape(-1)

    if name == "scale" or name == "zoomShake":
        if name == "zoomShake":
            amp = max(0, float(op.get("amp") or 0.03))
            sx = 1.0 + math.sin(frameN * 0.18) * amp
            sy = sx
            jx = _js_round(math.sin(frameN * 0.31) * W * amp * 0.25)
            jy = _js_round(math.cos(frameN * 0.27) * H * amp * 0.25)
        else:
            sx = max(0.1, float(op.get("x") or 1))
            sy = max(0.1, float(op.get("y") or 1))
            jx = 0
            jy = 0
        cx = (W - 1) / 2.0
        cy = (H - 1) / 2.0
        ys = np.arange(H)[:, None]
        xs = np.arange(W)[None, :]
        srcX = _js_round_arr(cx + (xs - cx - jx) / sx).astype(np.int64)
        srcY = _js_round_arr(cy + (ys - cy - jy) / sy).astype(np.int64)
        srcX = np.clip(srcX, 0, W - 1)
        srcY = np.clip(srcY, 0, H - 1)
        out = img[srcY, srcX].copy()
        out[..., 3] = 255
        return out.reshape(-1)

    if name == "sliceShiftY":
        bands = max(1, int(op.get("bands") or 12))
        strength = max(0, float(op.get("strength") or 0))
        bandH = max(1, H // bands)
        ys = np.arange(H)
        bi = ys // bandH
        sin_arg = bi * 1.7 + frameN * 0.03
        sign = np.where(bi % 2 == 0, 1, -1)
        shift_per_row = (_js_round_arr((np.sin(sin_arg) * 0.5 + 0.5) * strength) * sign).astype(np.int64)
        xs = np.arange(W)[None, :]
        sx = (xs - shift_per_row[:, None]) % W
        row_idx = np.arange(H)[:, None]
        out = img[row_idx, sx].copy()
        out[..., 3] = 255
        return out.reshape(-1)

    if name == "sliceShiftX":
        cols = max(1, int(op.get("cols") or 10))
        strength = max(0, float(op.get("strength") or 0))
        colW = max(1, W // cols)
        xs = np.arange(W)
        ci = xs // colW
        sin_arg = ci * 1.9 + frameN * 0.025
        sign = np.where(ci % 2 == 0, 1, -1)
        shift_per_col = (_js_round_arr((np.sin(sin_arg) * 0.5 + 0.5) * strength) * sign).astype(np.int64)
        ys = np.arange(H)[:, None]
        sy = (ys - shift_per_col[None, :]) % H
        col_idx = np.arange(W)[None, :]
        out = img[sy, col_idx].copy()
        out[..., 3] = 255
        return out.reshape(-1)

    if name == "blockJitter":
        size = max(4, int(op.get("size") or 32))
        strength = max(0, float(op.get("strength") or 8))
        chance = max(0, min(1, float(op.get("chance") or 0.25)))
        out = img.copy()
        # Iterate blocks (only ~thousands for 320x200) but copy each block via
        # vectorized fancy-indexing. Random calls keep the same sequence as
        # the original, just one chance + two shift draws per block.
        for y in range(0, H, size):
            for x in range(0, W, size):
                if random.random() > chance:
                    continue
                bw = min(size, W - x)
                bh = min(size, H - y)
                dx = _js_round((random.random() * 2 - 1) * strength)
                dy = _js_round((random.random() * 2 - 1) * strength)
                ys = np.clip(np.arange(y, y + bh) + dy, 0, H - 1)
                xs = np.clip(np.arange(x, x + bw) + dx, 0, W - 1)
                out[y:y + bh, x:x + bw] = img[np.ix_(ys, xs)]
        out[..., 3] = 255
        return out.reshape(-1)

    if name == "blur":
        r = max(1, int(op.get("radius") or 1))
        # Box blur via 2D summed-area table. Per-pixel divisor counts only the
        # in-bounds neighbors, matching the original's "n = count of valid
        # samples" semantics exactly.
        ext = np.zeros((H + 1, W + 1, 3), dtype=np.float32)
        ext[1:, 1:] = rgb.cumsum(axis=0).cumsum(axis=1)
        ys = np.arange(H)
        xs = np.arange(W)
        y0 = np.maximum(ys - r, 0)
        y1 = np.minimum(ys + r, H - 1) + 1
        x0 = np.maximum(xs - r, 0)
        x1 = np.minimum(xs + r, W - 1) + 1
        Y0 = y0[:, None]; Y1 = y1[:, None]
        X0 = x0[None, :]; X1 = x1[None, :]
        area = ext[Y1, X1] - ext[Y0, X1] - ext[Y1, X0] + ext[Y0, X0]
        count = ((Y1 - Y0) * (X1 - X0)).astype(np.float32)[..., None]
        avg = area / count
        return _to_uint8(avg).reshape(-1)

    if name == "vignette":
        amount = max(0, min(1, float(op.get("amount") or 0.2)))
        cx = W / 2.0
        cy = H / 2.0
        maxD = math.hypot(cx, cy)
        ys = np.arange(H)[:, None]
        xs = np.arange(W)[None, :]
        d = np.hypot(xs - cx, ys - cy) / maxD
        k = np.maximum(0, 1.0 - amount * d * d).astype(np.float32)
        out_rgb = rgb * k[..., None]
        return _to_uint8(out_rgb).reshape(-1)

    return np.array(src, copy=True)


def apply_post_filters(src, stack, ctx):
    """Walk a stack of {id} preset refs, applying each preset's ops in order."""
    out = src
    for ref in stack:
        preset_id = ref.get("id") if isinstance(ref, dict) else None
        preset = _PRESET_REGISTRY.get(preset_id) if preset_id else None
        if not preset or not isinstance(preset.get("ops"), list):
            continue
        for op in preset["ops"]:
            out = apply_filter_op(op, out, ctx)
    return out
