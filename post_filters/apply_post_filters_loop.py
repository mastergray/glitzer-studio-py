"""
Glitch Post-Filters — Python port of glitch.post-filters.js

Data-free pixel-op library. Preset catalogs are loaded at runtime via
load_presets() — same JSON files (presets/*.json) used by the JS module.

Buffers are flat uint8 RGBA numpy arrays of length W*H*4, matching the
Uint8ClampedArray layout used by the JS side. Out-of-range channel values
are clamped to [0, 255] on store, again matching Uint8ClampedArray.

ctx is a dict: { "W": int, "H": int, "frameN": int }
  W, H    = output buffer dimensions
  frameN  = current frame index (used by zoomShake/sliceShiftX/sliceShiftY
            for time-varying behavior)

Public API:
  load_presets(presets)         -> int (registry size)
  clear_presets()               -> None
  get_presets()                 -> list of presets
  get_preset_by_id(preset_id)   -> preset dict or None
  apply_filter_op(op, src, ctx) -> new uint8 RGBA buffer
  apply_post_filters(src, stack, ctx) -> new uint8 RGBA buffer
"""

import math
import random
import numpy as np


# Module-level preset registry, mirrors PRESET_REGISTRY in the JS module.
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


def apply_filter_op(op, src, ctx):
    """Apply a single op descriptor to src; return a new uint8 RGBA buffer."""
    W = ctx["W"]
    H = ctx["H"]
    frameN = ctx.get("frameN", 0)
    name = op.get("op", "") if isinstance(op, dict) else ""
    pxCount = W * H
    out = np.zeros_like(src)

    def chan(idx, c):
        return int(src[idx * 4 + c])

    def setPx(idx, r, g, b):
        o = idx * 4
        out[o] = _clamp255(r)
        out[o + 1] = _clamp255(g)
        out[o + 2] = _clamp255(b)
        out[o + 3] = 255

    if name == "contrast":
        c = float(op.get("value") or 1)
        for i in range(pxCount):
            setPx(
                i,
                (chan(i, 0) - 128) * c + 128,
                (chan(i, 1) - 128) * c + 128,
                (chan(i, 2) - 128) * c + 128,
            )
        return out

    if name == "saturation":
        s = float(op.get("value") or 1)
        for i in range(pxCount):
            r, g, b = chan(i, 0), chan(i, 1), chan(i, 2)
            y = 0.299 * r + 0.587 * g + 0.114 * b
            setPx(i, y + (r - y) * s, y + (g - y) * s, y + (b - y) * s)
        return out

    if name == "posterize":
        levels = max(2, int(op.get("levels") or 4))

        def q(v):
            return _js_round(
                (_js_round((v / 255) * (levels - 1)) / (levels - 1)) * 255
            )

        for i in range(pxCount):
            setPx(i, q(chan(i, 0)), q(chan(i, 1)), q(chan(i, 2)))
        return out

    if name == "noise":
        amount = max(0, float(op.get("amount") or 0))
        for i in range(pxCount):
            setPx(
                i,
                chan(i, 0) + (random.random() * 2 - 1) * amount,
                chan(i, 1) + (random.random() * 2 - 1) * amount,
                chan(i, 2) + (random.random() * 2 - 1) * amount,
            )
        return out

    if name == "pixelate":
        size = max(1, int(op.get("size") or 2))
        for y in range(0, H, size):
            for x in range(0, W, size):
                rs = gs = bs = n = 0
                for yy in range(y, min(H, y + size)):
                    for xx in range(x, min(W, x + size)):
                        pi = yy * W + xx
                        rs += chan(pi, 0)
                        gs += chan(pi, 1)
                        bs += chan(pi, 2)
                        n += 1
                r = _js_round(rs / n) if n else 0
                g = _js_round(gs / n) if n else 0
                b = _js_round(bs / n) if n else 0
                for yy in range(y, min(H, y + size)):
                    for xx in range(x, min(W, x + size)):
                        setPx(yy * W + xx, r, g, b)
        return out

    if name == "scanlines":
        strength = max(0, min(1, float(op.get("strength") or 0.15)))
        for y in range(H):
            k = (1 - strength) if (y % 2 == 0) else 1
            for x in range(W):
                i = y * W + x
                setPx(i, chan(i, 0) * k, chan(i, 1) * k, chan(i, 2) * k)
        return out

    if name == "rgbShift":
        rX = math.floor(float(op.get("rX") or 0))
        bX = math.floor(float(op.get("bX") or 0))
        for y in range(H):
            for x in range(W):
                xr = max(0, min(W - 1, x + rX))
                xb = max(0, min(W - 1, x + bX))
                i = y * W + x
                setPx(i, chan(y * W + xr, 0), chan(i, 1), chan(y * W + xb, 2))
        return out

    if name == "scale" or name == "zoomShake":
        if name == "zoomShake":
            amp = max(0, float(op.get("amp") or 0.03))
            sx = 1 + math.sin(frameN * 0.18) * amp
            sy = sx
            jx = _js_round(math.sin(frameN * 0.31) * W * amp * 0.25)
            jy = _js_round(math.cos(frameN * 0.27) * H * amp * 0.25)
        else:
            sx = max(0.1, float(op.get("x") or 1))
            sy = max(0.1, float(op.get("y") or 1))
            jx = 0
            jy = 0
        cx = (W - 1) / 2
        cy = (H - 1) / 2
        for y in range(H):
            for x in range(W):
                srcX = _js_round(cx + (x - cx - jx) / sx)
                srcY = _js_round(cy + (y - cy - jy) / sy)
                xx = max(0, min(W - 1, srcX))
                yy = max(0, min(H - 1, srcY))
                si = yy * W + xx
                setPx(y * W + x, chan(si, 0), chan(si, 1), chan(si, 2))
        return out

    if name == "sliceShiftY":
        bands = max(1, int(op.get("bands") or 12))
        strength = max(0, float(op.get("strength") or 0))
        bandH = max(1, H // bands)
        for y in range(H):
            bi = y // bandH
            shift = _js_round(
                (math.sin(bi * 1.7 + frameN * 0.03) * 0.5 + 0.5) * strength
            ) * (1 if bi % 2 == 0 else -1)
            for x in range(W):
                sx = (x - shift + W) % W
                si = y * W + sx
                setPx(y * W + x, chan(si, 0), chan(si, 1), chan(si, 2))
        return out

    if name == "sliceShiftX":
        cols = max(1, int(op.get("cols") or 10))
        strength = max(0, float(op.get("strength") or 0))
        colW = max(1, W // cols)
        for x in range(W):
            ci = x // colW
            shift = _js_round(
                (math.sin(ci * 1.9 + frameN * 0.025) * 0.5 + 0.5) * strength
            ) * (1 if ci % 2 == 0 else -1)
            for y in range(H):
                sy = (y - shift + H) % H
                si = sy * W + x
                setPx(y * W + x, chan(si, 0), chan(si, 1), chan(si, 2))
        return out

    if name == "blockJitter":
        size = max(4, int(op.get("size") or 32))
        strength = max(0, float(op.get("strength") or 8))
        chance = max(0, min(1, float(op.get("chance") or 0.25)))
        out[:] = src
        for y in range(0, H, size):
            for x in range(0, W, size):
                if random.random() > chance:
                    continue
                bw = min(size, W - x)
                bh = min(size, H - y)
                dx = _js_round((random.random() * 2 - 1) * strength)
                dy = _js_round((random.random() * 2 - 1) * strength)
                for yy in range(bh):
                    for xx in range(bw):
                        tx = x + xx
                        ty = y + yy
                        sx = max(0, min(W - 1, tx + dx))
                        sy = max(0, min(H - 1, ty + dy))
                        si = sy * W + sx
                        setPx(ty * W + tx, chan(si, 0), chan(si, 1), chan(si, 2))
        return out

    if name == "blur":
        r = max(1, int(op.get("radius") or 1))
        for y in range(H):
            for x in range(W):
                rs = gs = bs = n = 0
                for yy in range(max(0, y - r), min(H - 1, y + r) + 1):
                    for xx in range(max(0, x - r), min(W - 1, x + r) + 1):
                        si = yy * W + xx
                        rs += chan(si, 0)
                        gs += chan(si, 1)
                        bs += chan(si, 2)
                        n += 1
                setPx(y * W + x, rs / n, gs / n, bs / n)
        return out

    if name == "vignette":
        amount = max(0, min(1, float(op.get("amount") or 0.2)))
        cx = W / 2
        cy = H / 2
        maxD = math.hypot(cx, cy)
        for y in range(H):
            for x in range(W):
                i = y * W + x
                d = math.hypot(x - cx, y - cy) / maxD
                k = max(0, 1 - amount * d * d)
                setPx(i, chan(i, 0) * k, chan(i, 1) * k, chan(i, 2) * k)
        return out

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
