// Glitch Post-Filters — pixel-op library extracted from
//   /home/mastergray/codex/glitzer-studio-UI/dazzle-sim/app.js
//   /home/mastergray/codex/glitzer-studio-UI/scene-ui/app.js
//
// This module is data-free. Preset catalogs live in ./presets/*.json and
// are registered at runtime via loadPresets().
//
// Exposes (as window.GLITCH_POST_FILTERS or CommonJS module.exports):
//   loadPresets(presets)                          -> merges into the registry
//   clearPresets()                                -> empties the registry
//   getPresets()                                  -> Array of registered presets
//   getPresetById(id)                             -> one preset or undefined
//   applyFilterOp(op, src, ctx)                   -> apply a single op
//   applyPostFilters(src, stack, ctx)             -> walk a stack of {id} refs
//
// ctx carries values that were globals in the original app.js:
//   { W, H, frameN }
// Where:
//   W, H    = output buffer dimensions (LOW_W, LOW_H in the original)
//   frameN  = current frame index (used by zoomShake / sliceShiftX / sliceShiftY
//             for time-varying behavior)
//
// src/out are flat RGBA Uint8ClampedArray buffers of length W*H*4.

(function (root) {
  "use strict";

  function clamp255(v) {
    return v < 0 ? 0 : v > 255 ? 255 : v;
  }

  const PRESET_REGISTRY = {};

  function loadPresets(presets) {
    if (!Array.isArray(presets)) {
      throw new TypeError("loadPresets: expected an array of preset objects");
    }
    for (let i = 0; i < presets.length; i++) {
      const p = presets[i];
      if (!p || typeof p.id !== "string" || !Array.isArray(p.ops)) {
        throw new TypeError("loadPresets: preset at index " + i + " missing id or ops");
      }
      PRESET_REGISTRY[p.id] = p;
    }
    return Object.keys(PRESET_REGISTRY).length;
  }

  function clearPresets() {
    for (const k of Object.keys(PRESET_REGISTRY)) delete PRESET_REGISTRY[k];
  }

  function getPresets() {
    return Object.values(PRESET_REGISTRY);
  }

  function getPresetById(id) {
    return PRESET_REGISTRY[id];
  }

  function applyFilterOp(op, src, ctx) {
    const W = ctx.W;
    const H = ctx.H;
    const frameN = ctx.frameN || 0;
    const out = new Uint8ClampedArray(src.length);
    const name = op && op.op ? op.op : "";
    const pxCount = W * H;
    const chan = function (idx, c) { return src[(idx * 4) + c]; };
    const setPx = function (idx, r, g, b) {
      const o = idx * 4;
      out[o] = clamp255(r);
      out[o + 1] = clamp255(g);
      out[o + 2] = clamp255(b);
      out[o + 3] = 255;
    };
    if (name === "contrast") {
      const c = Number(op.value) || 1;
      for (let i = 0; i < pxCount; i++) setPx(i, (chan(i, 0) - 128) * c + 128, (chan(i, 1) - 128) * c + 128, (chan(i, 2) - 128) * c + 128);
      return out;
    }
    if (name === "saturation") {
      const s = Number(op.value) || 1;
      for (let i = 0; i < pxCount; i++) {
        const r = chan(i, 0), g = chan(i, 1), b = chan(i, 2);
        const y = 0.299 * r + 0.587 * g + 0.114 * b;
        setPx(i, y + (r - y) * s, y + (g - y) * s, y + (b - y) * s);
      }
      return out;
    }
    if (name === "posterize") {
      const levels = Math.max(2, Math.floor(Number(op.levels) || 4));
      const q = function (v) { return Math.round((Math.round((v / 255) * (levels - 1)) / (levels - 1)) * 255); };
      for (let i = 0; i < pxCount; i++) setPx(i, q(chan(i, 0)), q(chan(i, 1)), q(chan(i, 2)));
      return out;
    }
    if (name === "noise") {
      const amount = Math.max(0, Number(op.amount) || 0);
      for (let i = 0; i < pxCount; i++) setPx(i, chan(i, 0) + (Math.random() * 2 - 1) * amount, chan(i, 1) + (Math.random() * 2 - 1) * amount, chan(i, 2) + (Math.random() * 2 - 1) * amount);
      return out;
    }
    if (name === "pixelate") {
      const size = Math.max(1, Math.floor(Number(op.size) || 2));
      for (let y = 0; y < H; y += size) {
        for (let x = 0; x < W; x += size) {
          let rs = 0, gs = 0, bs = 0, n = 0;
          for (let yy = y; yy < Math.min(H, y + size); yy++) {
            for (let xx = x; xx < Math.min(W, x + size); xx++) {
              const pi = yy * W + xx;
              rs += chan(pi, 0); gs += chan(pi, 1); bs += chan(pi, 2); n++;
            }
          }
          const r = n ? Math.round(rs / n) : 0;
          const g = n ? Math.round(gs / n) : 0;
          const b = n ? Math.round(bs / n) : 0;
          for (let yy = y; yy < Math.min(H, y + size); yy++) for (let xx = x; xx < Math.min(W, x + size); xx++) setPx(yy * W + xx, r, g, b);
        }
      }
      return out;
    }
    if (name === "scanlines") {
      const strength = Math.max(0, Math.min(1, Number(op.strength) || 0.15));
      for (let y = 0; y < H; y++) {
        const k = y % 2 === 0 ? (1 - strength) : 1;
        for (let x = 0; x < W; x++) {
          const i = y * W + x;
          setPx(i, chan(i, 0) * k, chan(i, 1) * k, chan(i, 2) * k);
        }
      }
      return out;
    }
    if (name === "rgbShift") {
      const rX = Math.floor(Number(op.rX) || 0);
      const bX = Math.floor(Number(op.bX) || 0);
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const xr = Math.max(0, Math.min(W - 1, x + rX));
          const xb = Math.max(0, Math.min(W - 1, x + bX));
          const i = y * W + x;
          setPx(i, chan(y * W + xr, 0), chan(i, 1), chan(y * W + xb, 2));
        }
      }
      return out;
    }
    if (name === "scale" || name === "zoomShake") {
      const sx = name === "zoomShake" ? (1 + Math.sin(frameN * 0.18) * Math.max(0, Number(op.amp) || 0.03)) : Math.max(0.1, Number(op.x) || 1);
      const sy = name === "zoomShake" ? sx : Math.max(0.1, Number(op.y) || 1);
      const jx = name === "zoomShake" ? Math.round(Math.sin(frameN * 0.31) * W * Math.max(0, Number(op.amp) || 0.03) * 0.25) : 0;
      const jy = name === "zoomShake" ? Math.round(Math.cos(frameN * 0.27) * H * Math.max(0, Number(op.amp) || 0.03) * 0.25) : 0;
      const cx = (W - 1) / 2, cy = (H - 1) / 2;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const srcX = Math.round(cx + (x - cx - jx) / sx);
        const srcY = Math.round(cy + (y - cy - jy) / sy);
        const xx = Math.max(0, Math.min(W - 1, srcX));
        const yy = Math.max(0, Math.min(H - 1, srcY));
        const si = yy * W + xx;
        setPx(y * W + x, chan(si, 0), chan(si, 1), chan(si, 2));
      }
      return out;
    }
    if (name === "sliceShiftY" || name === "sliceShiftX") {
      if (name === "sliceShiftY") {
        const bands = Math.max(1, Math.floor(Number(op.bands) || 12));
        const strength = Math.max(0, Number(op.strength) || 0);
        const bandH = Math.max(1, Math.floor(H / bands));
        for (let y = 0; y < H; y++) {
          const bi = Math.floor(y / bandH);
          const shift = Math.round((Math.sin(bi * 1.7 + frameN * 0.03) * 0.5 + 0.5) * strength) * (bi % 2 === 0 ? 1 : -1);
          for (let x = 0; x < W; x++) {
            const sx = (x - shift + W) % W;
            const si = y * W + sx;
            setPx(y * W + x, chan(si, 0), chan(si, 1), chan(si, 2));
          }
        }
      } else {
        const cols = Math.max(1, Math.floor(Number(op.cols) || 10));
        const strength = Math.max(0, Number(op.strength) || 0);
        const colW = Math.max(1, Math.floor(W / cols));
        for (let x = 0; x < W; x++) {
          const ci = Math.floor(x / colW);
          const shift = Math.round((Math.sin(ci * 1.9 + frameN * 0.025) * 0.5 + 0.5) * strength) * (ci % 2 === 0 ? 1 : -1);
          for (let y = 0; y < H; y++) {
            const sy = (y - shift + H) % H;
            const si = sy * W + x;
            setPx(y * W + x, chan(si, 0), chan(si, 1), chan(si, 2));
          }
        }
      }
      return out;
    }
    if (name === "blockJitter") {
      const size = Math.max(4, Math.floor(Number(op.size) || 32));
      const strength = Math.max(0, Number(op.strength) || 8);
      const chance = Math.max(0, Math.min(1, Number(op.chance) || 0.25));
      out.set(src);
      for (let y = 0; y < H; y += size) for (let x = 0; x < W; x += size) {
        if (Math.random() > chance) continue;
        const bw = Math.min(size, W - x), bh = Math.min(size, H - y);
        const dx = Math.round((Math.random() * 2 - 1) * strength);
        const dy = Math.round((Math.random() * 2 - 1) * strength);
        for (let yy = 0; yy < bh; yy++) for (let xx = 0; xx < bw; xx++) {
          const tx = x + xx, ty = y + yy;
          const sx = Math.max(0, Math.min(W - 1, tx + dx));
          const sy = Math.max(0, Math.min(H - 1, ty + dy));
          const si = sy * W + sx;
          setPx(ty * W + tx, chan(si, 0), chan(si, 1), chan(si, 2));
        }
      }
      return out;
    }
    if (name === "blur") {
      const r = Math.max(1, Math.floor(Number(op.radius) || 1));
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        let rs = 0, gs = 0, bs = 0, n = 0;
        for (let yy = Math.max(0, y - r); yy <= Math.min(H - 1, y + r); yy++) {
          for (let xx = Math.max(0, x - r); xx <= Math.min(W - 1, x + r); xx++) {
            const si = yy * W + xx;
            rs += chan(si, 0); gs += chan(si, 1); bs += chan(si, 2); n++;
          }
        }
        setPx(y * W + x, rs / n, gs / n, bs / n);
      }
      return out;
    }
    if (name === "vignette") {
      const amount = Math.max(0, Math.min(1, Number(op.amount) || 0.2));
      const cx = W / 2, cy = H / 2, maxD = Math.hypot(cx, cy);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const i = y * W + x;
        const d = Math.hypot(x - cx, y - cy) / maxD;
        const k = Math.max(0, 1 - amount * d * d);
        setPx(i, chan(i, 0) * k, chan(i, 1) * k, chan(i, 2) * k);
      }
      return out;
    }
    return new Uint8ClampedArray(src);
  }

  function applyPostFilters(src, stack, ctx) {
    let out = src;
    for (let i = 0; i < stack.length; i++) {
      const ref = stack[i];
      const preset = ref && ref.id ? PRESET_REGISTRY[ref.id] : null;
      if (!preset || !Array.isArray(preset.ops)) continue;
      for (let j = 0; j < preset.ops.length; j++) out = applyFilterOp(preset.ops[j], out, ctx);
    }
    return out;
  }

  const api = {
    loadPresets: loadPresets,
    clearPresets: clearPresets,
    getPresets: getPresets,
    getPresetById: getPresetById,
    applyFilterOp: applyFilterOp,
    applyPostFilters: applyPostFilters
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.GLITCH_POST_FILTERS = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
