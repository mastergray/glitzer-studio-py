import GPF from "./lib/glitch-post-filters.js";
import glitchPresetsJson from "../../post_filters/presets/glitch.json";
import retroCrtPresetsJson from "../../post_filters/presets/retro-crt.json";
import decayPresetsJson from "../../post_filters/presets/decay.json";
import chaosPresetsJson from "../../post_filters/presets/chaos.json";
import violentPresetsJson from "../../post_filters/presets/violent.json";
import destructivePresetsJson from "../../post_filters/presets/destructive.json";

// Register the canonical preset catalogs at module load.
// Each category JSON gets merged into the same registry by id.
GPF.loadPresets(glitchPresetsJson);
GPF.loadPresets(retroCrtPresetsJson);
GPF.loadPresets(decayPresetsJson);
GPF.loadPresets(chaosPresetsJson);
GPF.loadPresets(violentPresetsJson);
GPF.loadPresets(destructivePresetsJson);

(function () {
  const canvas = document.getElementById("viz");
  const ctx = canvas.getContext("2d");
  const visualSelect = document.getElementById("visualSelect");
  const replaceStackBtn = document.getElementById("replaceStack");
  const addLayerBtn = document.getElementById("addLayer");
  const clearStackBtn = document.getElementById("clearStack");
  const visualStackEl = document.getElementById("visualStack");
  const effectSelect = document.getElementById("effectSelect");
  const replaceEffectStackBtn = document.getElementById("replaceEffectStack");
  const addEffectLayerBtn = document.getElementById("addEffectLayer");
  const clearEffectStackBtn = document.getElementById("clearEffectStack");
  const effectStackEl = document.getElementById("effectStack");
  const backgroundImagePathInput = document.getElementById("backgroundImagePath");
  const backgroundPreviewBaseDirInput = document.getElementById("backgroundPreviewBaseDir");
  const backgroundPreviewFileInput = document.getElementById("backgroundPreviewFile");
  const backgroundPreviewNameEl = document.getElementById("backgroundPreviewName");
  const backgroundFitSelect = document.getElementById("backgroundFit");
  const backgroundAnchorSelect = document.getElementById("backgroundAnchor");
  const backgroundOpacityInput = document.getElementById("backgroundOpacity");
  const backgroundTileInput = document.getElementById("backgroundTile");
  const clearBackgroundPreviewBtn = document.getElementById("clearBackgroundPreview");
  const postEffectSelect = document.getElementById("postEffectSelect");
  const replacePostEffectStackBtn = document.getElementById("replacePostEffectStack");
  const addPostEffectLayerBtn = document.getElementById("addPostEffectLayer");
  const clearPostEffectStackBtn = document.getElementById("clearPostEffectStack");
  const postChainEl = document.getElementById("postChain");
  const postFilterSelect = document.getElementById("postFilterSelect");
  const addPostFilterLayerBtn = document.getElementById("addPostFilterLayer");
  const replacePostFilterStackBtn = document.getElementById("replacePostFilterStack");
  const clearPostFilterStackBtn = document.getElementById("clearPostFilterStack");
  const postFiltersStackEl = document.getElementById("postFiltersStack");
  const playPause = document.getElementById("playPause");
  const persistentBuffer = document.getElementById("persistentBuffer");
  const status = document.getElementById("status");
  const sceneSelect = document.getElementById("sceneSelect");
  const addSceneBtn = document.getElementById("addScene");
  const duplicateSceneBtn = document.getElementById("duplicateScene");
  const removeSceneBtn = document.getElementById("removeScene");
  const sceneNameInput = document.getElementById("sceneName");
  const paletteSelect = document.getElementById("paletteSelect");
  const exportConfigBtn = document.getElementById("exportConfig");
  const profilePathInput = document.getElementById("profilePath");
  const settingScaleInput = document.getElementById("settingScale");
  const settingFpsInput = document.getElementById("settingFps");
  const settingCrfInput = document.getElementById("settingCrf");
  const settingSeedInput = document.getElementById("settingSeed");
  const timelineFileInput = document.getElementById("timelineFile");
  const importTimelineBtn = document.getElementById("importTimeline");
  const importPanel = document.getElementById("importPanel");
  const workspacePanel = document.getElementById("workspacePanel");
  const sceneTabsEl = document.getElementById("sceneTabs");
  const loadedTimelineNameEl = document.getElementById("loadedTimelineName");
  const activeSceneTitleEl = document.getElementById("activeSceneTitle");
  const activeSceneMetaEl = document.getElementById("activeSceneMeta");
  const exportPanel = document.getElementById("exportPanel");
  const sceneThumbsEl = document.getElementById("sceneThumbs");
  const viewerPanel = document.getElementById("viewerPanel");

  const DEFAULT_VISUAL_ID = "";
  const DEFAULT_PALETTE_ID = "rainbow";
  const PALETTE_IDS = ["rainbow", "fire", "ice", "electric", "neon", "grayscale", "ocean", "lava"];
  const VISUALS = {};
  const FALLBACK_VISUAL_IDS = [
    "atom", "bars", "boxes", "curves", "diag1", "diag2", "diag3", "diag4",
    "ellipse", "formula1", "grid", "hexagon", "lines", "lotsadots", "lotsadots2",
    "pedals", "puffs", "ribbons", "sierpinski", "sine", "spiral", "spiral1",
    "squares", "streamer", "sweep", "sweep2", "sweep3", "triangles", "tunnel",
    "wandering", "zigstream", "zigzags"
  ];
  const LOW_W = 320;
  const LOW_H = 200;
  const lowBuf = new Uint8Array(LOW_W * LOW_H);
  const lowImg = document.createElement("canvas");
  lowImg.width = LOW_W;
  lowImg.height = LOW_H;
  const lowCtx = lowImg.getContext("2d");
  const lowImageData = lowCtx.createImageData(LOW_W, LOW_H);
  const bgCanvas = document.createElement("canvas");
  bgCanvas.width = LOW_W;
  bgCanvas.height = LOW_H;
  const bgCtx = bgCanvas.getContext("2d");
  const BACKGROUND_PREVIEW_BASE_STORAGE_KEY = "glitzleStudio.backgroundPreviewBaseDir";

  const VISUAL_FAMILY = {
    atom: "dot", bars: "grid", boxes: "grid", curves: "spiral",
    diag1: "grid", diag2: "grid", diag3: "grid", diag4: "spiral",
    ellipse: "spiral", formula1: "plasma", grid: "grid", hexagon: "grid",
    lines: "grid", lotsadots: "dot", lotsadots2: "dot", pedals: "spiral",
    puffs: "dot", ribbons: "spiral", sierpinski: "dot", sine: "spiral",
    spiral: "spiral", spiral1: "spiral", squares: "grid", streamer: "dot",
    sweep: "spiral", sweep2: "spiral", sweep3: "spiral", triangles: "grid",
    tunnel: "spiral", wandering: "dot", zigstream: "dot", zigzags: "grid"
  };

  const VISUAL_DESC = {
    atom: "Nucleus + orbiting electrons", bars: "Audio-rippled bars", boxes: "Concentric rectangles",
    curves: "Bezier curves", diag1: "TL-BR diagonals", diag2: "TR-BL diagonals",
    diag3: "Crossed diagonal mesh", diag4: "Rotating diagonal rays", ellipse: "Rotated ellipses",
    formula1: "Lissajous-like curves", grid: "Scrolling grid", hexagon: "Concentric hexagons",
    lines: "Random line segments", lotsadots: "Random dots", lotsadots2: "Clustered dots",
    pedals: "Rose/petal curves", puffs: "Radial bursts", ribbons: "Flowing sine ribbons",
    sierpinski: "Chaos-game triangle", sine: "Scanning sine wave", spiral: "Archimedean spiral",
    spiral1: "Logarithmic spiral", squares: "Rectangle outlines", streamer: "Momentum trail",
    sweep: "Rotating radial sweep", sweep2: "Off-center sweep", sweep3: "Segmented sweep",
    triangles: "Triangle outlines", tunnel: "Concentric perspective tunnel",
    wandering: "Random-walk trail", zigstream: "Zigzag streamer", zigzags: "Alternating zigzag polyline"
  };

  let active = DEFAULT_VISUAL_ID;
  let activePalette = DEFAULT_PALETTE_ID;
  let visualStack = [];
  let backgroundConfig = makeBackgroundConfig();
  const backgroundPreviewBySceneId = new Map();
  let activeEffect = "__none__";
  let activePostEffect = "__none__";
  let activePostFilter = "__none__";
  let effectStack = [];
  // Sidecar map: dazzle post-effect id → props object. The UI doesn't yet
  // surface editors for these, but we preserve them on import so round-trip
  // through export/render keeps any tunables the saved timeline carried.
  let effectParams = {};
  let postEffectStack = [];
  let postFilterStack = [];
  let postFilterCatalog = [];
  let postFilterPresetsById = {};
  let lowBufHistory = [];
  let playing = true;
  let persist = true;
  let t = 0;
  let frameN = 0;
  let scenes = [];
  let activeSceneIndex = 0;
  let activeTab = "scene";
  let exportThumbs = [];
  let exportThumbCursor = 0;
  let importedTimeline = null;
  let importedTimelineSourceName = "";
  let importedTimelineName = "scene-ui.timeline.staged.json";
  let backgroundPreviewBaseDir = loadBackgroundPreviewBaseDir();

  const EFFECTS = {
    "__none__": "None",
    "mirror_h": "mirror_h",
    "mirror_v": "mirror_v",
    "mirror_quad": "mirror_quad",
    "mirror_diamond": "mirror_diamond",
    "radial": "radial",
    "tile": "tile",
    "kaleidoscope": "kaleidoscope",
    "twist": "twist",
    "scroll": "scroll",
    "wave": "wave",
    "xor": "xor",
    "drip": "drip",
    "starburst": "starburst",
    "mesh": "mesh",
    "rectangles": "rectangles",
    "spiral": "spiral",
    "wipe": "wipe",
    "movingbars": "movingbars",
    "linewipe": "linewipe",
    "randomize": "randomize",
    "blister": "blister",
    "firefly": "firefly",
    "umbra": "umbra",
    "tetrys": "tetrys",
    "ziti": "ziti",
    "juggle": "juggle"
  };

  const EFFECT_DESC = {
    "__none__": "No post effect.",
    "mirror_h": "Left/right bilateral mirror.",
    "mirror_v": "Top/bottom bilateral mirror.",
    "mirror_quad": "Quadrant mirror symmetry.",
    "mirror_diamond": "Diagonal + horizontal mirror symmetry.",
    "radial": "N-fold radial symmetry.",
    "tile": "Center tile repeat.",
    "kaleidoscope": "Mirrored wedge kaleidoscope.",
    "twist": "Center-weighted polar twist.",
    "scroll": "Animated buffer scroll.",
    "wave": "Animated sine row displacement.",
    "xor": "XOR with shifted copy.",
    "drip": "Per-column gravity roll.",
    "starburst": "Radial line mask overlay.",
    "mesh": "Grid mask overlay.",
    "rectangles": "Random block swaps.",
    "spiral": "Log-spiral coordinate remap.",
    "wipe": "Directional wipe mask.",
    "movingbars": "Animated bar masks.",
    "linewipe": "Staggered horizontal wipes.",
    "randomize": "Shuffled block mosaic.",
    "blister": "Bubble lens distortion.",
    "firefly": "Wandering bright cross points.",
    "umbra": "Radial edge darken.",
    "tetrys": "Column block fall roll.",
    "ziti": "Cylindrical horizontal warp.",
    "juggle": "Palette-index remap."
  };
  const SUPPORTED_EFFECT_IDS = [
    "__none__", "mirror_h", "mirror_v", "mirror_quad", "mirror_diamond",
    "radial", "tile", "kaleidoscope", "twist", "scroll", "wave", "xor",
    "drip", "starburst", "mesh", "rectangles", "spiral", "wipe",
    "movingbars", "linewipe", "randomize", "blister", "firefly",
    "umbra", "tetrys", "ziti", "juggle"
  ];
  const POST_EFFECT_IMPLEMENTATION_ORDER = [
    "tear",
    "chromatic",
    "noise",
    "warp",
    "slitscan",
    "pixel_sort",
    "pixel_scramble",
    "jpeg_corrupt",
    "channel_swap",
    "bit_crush",
    "invert_blocks",
    "databend"
  ];
  const GLITCH_EFFECTS = new Set(POST_EFFECT_IMPLEMENTATION_ORDER);

  // Pull the glitch-category preset catalog from the canonical module.
  const FILTER_PRESETS = GPF.getPresets();

  function clamp01(v) { return Math.max(0, Math.min(1, Number(v))); }
  function clampInt(v, min, max) {
    const n = Math.floor(Number(v));
    return Math.max(min, Math.min(max, Number.isFinite(n) ? n : min));
  }
  function makeTearDefaults() {
    return {
      source: "displace",
      clip_path: "",
      color: "255,0,0",
      opacity: 1.0,
      orientation: "horizontal",
      length_pct: 80,
      thickness_pct: 25,
      count_pct: 5,
      displace_max_pct: 25,
      delay_frames: 1,
      shape: "band",
      edge: "random",
      displace_dir: "any"
    };
  }
  function makeChromaticDefaults() {
    return {
      amount: 16.0,
      direction: "circular",
      audio_scale: 0.75
    };
  }
  function makeNoiseDefaults() {
    return {
      amount: 15.0,
      type: "gaussian",
      mono: true,
      audio_scale: 0.4
    };
  }
  function makeWarpDefaults() {
    return {
      amplitude_px: 20.0,
      frequency: 0.02,
      speed: 3.0,
      direction: "horizontal",
      audio_scale: 0.5
    };
  }
  function makeSlitscanDefaults() {
    return {
      direction: "horizontal",
      max_delay_frames: 30,
      audio_scale: 0.5
    };
  }
  function makePixelSortDefaults() {
    return {
      sort_by: "brightness",
      direction: "horizontal",
      lower_threshold: 0.25,
      upper_threshold: 0.8,
      reverse: false,
      angle: 0,
      audio_scale: 0.5
    };
  }
  function makePixelScrambleDefaults() {
    return {
      count_pct: 3.0,
      size_pct: 15.0,
      shape: "rectangle",
      orientation: "horizontal",
      band_length_pct: 100.0,
      delay_frames: 1
    };
  }
  function makeJpegCorruptDefaults() {
    return {
      count_pct: 3.0,
      size_pct: 20.0,
      quality: 5,
      shape: "rectangle",
      orientation: "horizontal",
      band_length_pct: 100.0,
      delay_frames: 1
    };
  }
  function makeChannelSwapDefaults() {
    return {
      count_pct: 5.0,
      size_pct: 15.0,
      mode: "random",
      audio_scale: 0.7,
      shape: "rectangle",
      orientation: "horizontal",
      band_length_pct: 100.0,
      delay_frames: 1
    };
  }
  function makeBitCrushDefaults() {
    return {
      count_pct: 3.0,
      size_pct: 20.0,
      bits: 2,
      audio_scale: 0.6,
      shape: "rectangle",
      orientation: "horizontal",
      band_length_pct: 100.0,
      delay_frames: 1
    };
  }
  function makeInvertBlocksDefaults() {
    return {
      count_pct: 3.0,
      size_pct: 20.0,
      audio_scale: 0.6,
      shape: "rectangle",
      orientation: "horizontal",
      band_length_pct: 100.0,
      delay_frames: 1
    };
  }
  function makeDatabendDefaults() {
    return {
      count: 10,
      chunk_size: 1024,
      modes: "shift,xor,swap",
      audio_scale: 0.8
    };
  }
  function makeClipCutDefaults() {
    return {
      other_path: "",
      hold_frames: 30
    };
  }
  function createPostLayer(id) {
    return {
      id,
      params: id === "tear"
        ? makeTearDefaults()
        : (id === "chromatic"
          ? makeChromaticDefaults()
          : (id === "noise"
            ? makeNoiseDefaults()
            : (id === "warp"
              ? makeWarpDefaults()
              : (id === "slitscan"
                ? makeSlitscanDefaults()
                : (id === "pixel_sort"
                  ? makePixelSortDefaults()
                  : (id === "pixel_scramble"
                    ? makePixelScrambleDefaults()
                    : (id === "jpeg_corrupt"
                      ? makeJpegCorruptDefaults()
                      : (id === "channel_swap"
                        ? makeChannelSwapDefaults()
                        : (id === "bit_crush"
                          ? makeBitCrushDefaults()
                          : (id === "invert_blocks"
                            ? makeInvertBlocksDefaults()
                            : (id === "databend" ? makeDatabendDefaults() : (id === "clip_cut" ? makeClipCutDefaults() : {})))))))))))),
      accumulate: { enabled: false, bleed: 0.08, reset_sec: 2.0 },
      _state: { acc: null, startFrame: 0 }
    };
  }
  function clonePostLayer(layer) {
    const next = createPostLayer(layer.id);
    next.params = JSON.parse(JSON.stringify(layer.params || {}));
    next.accumulate = JSON.parse(JSON.stringify(layer.accumulate || { enabled: false, bleed: 0.08, reset_sec: 2.0 }));
    next._state = { acc: null, startFrame: 0 };
    return next;
  }
  function clonePostFilterStack(stack) {
    return (stack || []).map((f) => ({ id: f.id, label: f.label, category: f.category }));
  }
  function makeBackgroundConfig(src = {}) {
    return {
      image: typeof src.image === "string" ? src.image : "",
      fit: ["cover", "contain", "stretch", "native"].includes(src.fit) ? src.fit : "cover",
      anchor: [
        "center", "top", "bottom", "left", "right",
        "top-left", "top-right", "bottom-left", "bottom-right"
      ].includes(src.anchor) ? src.anchor : "center",
      opacity: Number.isFinite(Number(src.opacity)) ? Math.max(0, Math.min(1, Number(src.opacity))) : 1,
      tile: !!src.tile
    };
  }
  function cloneBackgroundConfig(bg) {
    return makeBackgroundConfig(bg || {});
  }
  function backgroundConfigFromVisuals(visualsObj) {
    if (!visualsObj || typeof visualsObj !== "object") return makeBackgroundConfig();
    if (visualsObj.background && typeof visualsObj.background === "object") {
      return makeBackgroundConfig(visualsObj.background);
    }
    if (typeof visualsObj.background === "string") {
      return makeBackgroundConfig({ image: visualsObj.background });
    }
    if (typeof visualsObj.background_image === "string") {
      return makeBackgroundConfig({ image: visualsObj.background_image });
    }
    return makeBackgroundConfig();
  }
  function hasBackgroundRenderConfig(bg) {
    return !!(bg && typeof bg.image === "string" && bg.image.trim());
  }
  function backgroundForExport(bg) {
    if (!hasBackgroundRenderConfig(bg)) return null;
    const next = cloneBackgroundConfig(bg);
    next.image = next.image.trim();
    return next;
  }
  function loadBackgroundPreviewBaseDir() {
    try {
      return String(window.localStorage.getItem(BACKGROUND_PREVIEW_BASE_STORAGE_KEY) || "").trim();
    } catch (err) {
      return "";
    }
  }
  function saveBackgroundPreviewBaseDir(path) {
    try {
      if (path) window.localStorage.setItem(BACKGROUND_PREVIEW_BASE_STORAGE_KEY, path);
      else window.localStorage.removeItem(BACKGROUND_PREVIEW_BASE_STORAGE_KEY);
    } catch (err) {
      // localStorage can be unavailable in some embedded/private contexts.
    }
  }
  function backgroundPreviewFilename(imagePath) {
    const raw = String(imagePath || "").trim();
    if (!raw) return "";
    const normalized = raw.replace(/\\/g, "/");
    const parts = normalized.split("/").filter(Boolean);
    return parts.length ? parts[parts.length - 1] : normalized;
  }
  function joinPreviewBaseAndFilename(baseDir, filename) {
    const base = String(baseDir || "").trim().replace(/\/+$/g, "");
    const file = String(filename || "").trim().replace(/^\/+/g, "");
    if (!base || !file) return "";
    return `${base}/${file}`;
  }
  function maybeFillBackgroundRenderPathFromPreview(filename) {
    if (!backgroundImagePathInput || String(backgroundImagePathInput.value || "").trim()) return false;
    const path = joinPreviewBaseAndFilename(backgroundPreviewBaseDir, filename);
    if (!path) return false;
    backgroundImagePathInput.value = path;
    syncBackgroundFromControls();
    return true;
  }
  function viteFsUrl(absPath) {
    const path = String(absPath || "").trim();
    if (!path) return "";
    if (/^(https?:|blob:|data:)/i.test(path)) return path;
    if (!path.startsWith("/")) return "";
    return `/@fs${path.split("/").map((part) => encodeURIComponent(part)).join("/")}`;
  }
  function setBackgroundPreviewForScene(sceneId, image, url, name, revokeUrl) {
    if (!sceneId || !image) return;
    const prev = backgroundPreviewBySceneId.get(sceneId);
    if (prev && prev.revokeUrl && prev.url) URL.revokeObjectURL(prev.url);
    backgroundPreviewBySceneId.set(sceneId, { image, url, name, revokeUrl: !!revokeUrl });
    if (sceneId === activeScenePreviewKey()) refreshBackgroundPreviewName();
  }
  function loadBackgroundPreviewFromBase(scene, bg) {
    if (!scene || !backgroundPreviewBaseDir) return;
    const filename = backgroundPreviewFilename(bg && bg.image);
    const absPath = joinPreviewBaseAndFilename(backgroundPreviewBaseDir, filename);
    const src = viteFsUrl(absPath);
    if (!src) return;
    const img = new Image();
    img.onload = () => {
      setBackgroundPreviewForScene(scene.id, img, src, filename, false);
    };
    img.onerror = () => {
      if (scene.id === activeScenePreviewKey()) refreshBackgroundPreviewName();
    };
    img.src = src;
  }
  function reloadBackgroundPreviewsFromBase() {
    clearAllBackgroundPreviews();
    scenes.forEach((scene) => loadBackgroundPreviewFromBase(scene, scene.background));
  }
  function refreshBackgroundControls() {
    if (backgroundImagePathInput) backgroundImagePathInput.value = backgroundConfig.image || "";
    if (backgroundFitSelect) backgroundFitSelect.value = backgroundConfig.fit || "cover";
    if (backgroundAnchorSelect) backgroundAnchorSelect.value = backgroundConfig.anchor || "center";
    if (backgroundOpacityInput) backgroundOpacityInput.value = String(backgroundConfig.opacity ?? 1);
    if (backgroundTileInput) backgroundTileInput.checked = !!backgroundConfig.tile;
    if (backgroundPreviewFileInput) backgroundPreviewFileInput.value = "";
    refreshBackgroundPreviewName();
  }
  function activeScenePreviewKey() {
    const s = scenes[activeSceneIndex];
    return s ? s.id : null;
  }
  function currentBackgroundPreviewImage() {
    const key = activeScenePreviewKey();
    const ref = key ? backgroundPreviewBySceneId.get(key) : null;
    return ref ? ref.image : null;
  }
  function refreshBackgroundPreviewName() {
    if (!backgroundPreviewNameEl) return;
    const key = activeScenePreviewKey();
    const ref = key ? backgroundPreviewBySceneId.get(key) : null;
    backgroundPreviewNameEl.textContent = ref && ref.name
      ? `Preview image: ${ref.name}`
      : "No preview image selected";
  }
  function clearBackgroundPreviewForActiveScene() {
    const key = activeScenePreviewKey();
    if (!key) return;
    const ref = backgroundPreviewBySceneId.get(key);
    if (ref && ref.revokeUrl && ref.url) URL.revokeObjectURL(ref.url);
    backgroundPreviewBySceneId.delete(key);
    if (backgroundPreviewFileInput) backgroundPreviewFileInput.value = "";
    refreshBackgroundPreviewName();
  }
  function clearAllBackgroundPreviews() {
    backgroundPreviewBySceneId.forEach((ref) => {
      if (ref && ref.revokeUrl && ref.url) URL.revokeObjectURL(ref.url);
    });
    backgroundPreviewBySceneId.clear();
    if (backgroundPreviewFileInput) backgroundPreviewFileInput.value = "";
    refreshBackgroundPreviewName();
  }
  function makeScene(id, name) {
    return {
      id,
      name,
      palette: activePalette,
      visualStack: [...visualStack],
      background: cloneBackgroundConfig(backgroundConfig),
      effectStack: [...effectStack],
      effectParams: JSON.parse(JSON.stringify(effectParams || {})),
      postEffectStack: postEffectStack.map(clonePostLayer),
      postFilterStack: clonePostFilterStack(postFilterStack)
    };
  }
  function syncSceneFromCurrentState() {
    if (!scenes[activeSceneIndex]) return;
    const s = scenes[activeSceneIndex];
    s.palette = activePalette;
    s.visualStack = [...visualStack];
    s.background = cloneBackgroundConfig(backgroundConfig);
    s.effectStack = [...effectStack];
    s.effectParams = JSON.parse(JSON.stringify(effectParams || {}));
    s.postEffectStack = postEffectStack.map(clonePostLayer);
    s.postFilterStack = clonePostFilterStack(postFilterStack);
  }
  function loadSceneIntoCurrentState(scene) {
    if (!scene) return;
    visualStack = [...(scene.visualStack || [])];
    backgroundConfig = cloneBackgroundConfig(scene.background);
    activePalette = PALETTE_IDS.includes(scene.palette) ? scene.palette : DEFAULT_PALETTE_ID;
    effectStack = [...(scene.effectStack || [])];
    effectParams = scene.effectParams ? JSON.parse(JSON.stringify(scene.effectParams)) : {};
    postEffectStack = (scene.postEffectStack || []).map(clonePostLayer);
    postFilterStack = clonePostFilterStack(scene.postFilterStack || []);
    active = (visualStack[0] && (visualStack[0] in VISUALS)) ? visualStack[0] : active;
    activeEffect = effectStack[0] || "__none__";
    activePostEffect = postEffectStack[0] ? postEffectStack[0].id : "__none__";
    activePostFilter = postFilterStack[0] ? postFilterStack[0].id : "__none__";
    refreshVisualSelect();
    refreshPaletteSelect();
    refreshBackgroundControls();
    renderVisualStackPills();
    refreshEffectSelect();
    renderEffectStackPills();
    refreshPostEffectSelect();
    renderPostChainPills();
    refreshPostFilterSelect();
    renderPostFilterPills();
    resetPortedStates();
  }
  function refreshSceneUi() {
    if (loadedTimelineNameEl) {
      loadedTimelineNameEl.textContent = importedTimelineSourceName
        ? `Loaded JSON: ${importedTimelineSourceName} | Export: ${importedTimelineName}`
        : `Export: ${importedTimelineName}`;
    }
    if (sceneTabsEl) {
      sceneTabsEl.innerHTML = "";
      scenes.forEach((s, idx) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = `tab${activeTab === "scene" && idx === activeSceneIndex ? " active" : ""}`;
        b.textContent = s.name || `Scene ${idx + 1}`;
        b.addEventListener("click", () => {
          syncSceneFromCurrentState();
          activeSceneIndex = idx;
          activeTab = "scene";
          loadSceneIntoCurrentState(scenes[activeSceneIndex]);
          refreshSceneUi();
          refreshStatus(`Loaded ${scenes[activeSceneIndex].name}.`);
        });
        sceneTabsEl.appendChild(b);
      });
      const exportTab = document.createElement("button");
      exportTab.type = "button";
      exportTab.className = `tab${activeTab === "export" ? " active" : ""}`;
      exportTab.textContent = "Export";
      exportTab.addEventListener("click", () => {
        syncSceneFromCurrentState();
        activeTab = "export";
        refreshSceneUi();
        renderExportThumbnails();
      });
      sceneTabsEl.appendChild(exportTab);
      if (typeof copyBtn !== "undefined" && copyBtn) sceneTabsEl.appendChild(copyBtn);
      if (typeof pasteBtn !== "undefined" && pasteBtn) sceneTabsEl.appendChild(pasteBtn);
      if (typeof undoBtn !== "undefined" && undoBtn) sceneTabsEl.appendChild(undoBtn);
      if (typeof redoBtn !== "undefined" && redoBtn) sceneTabsEl.appendChild(redoBtn);
    }
    const s = scenes[activeSceneIndex];
    if (sceneNameInput) sceneNameInput.value = s ? (s.name || "") : "";
    if (paletteSelect) paletteSelect.value = s && PALETTE_IDS.includes(s.palette) ? s.palette : DEFAULT_PALETTE_ID;
    if (activeSceneTitleEl) activeSceneTitleEl.textContent = s ? (s.name || `Scene ${activeSceneIndex + 1}`) : "Scene";
    if (activeSceneMetaEl) {
      if (s && Number.isFinite(s.start_sec) && Number.isFinite(s.end_sec)) {
        activeSceneMetaEl.textContent = `${s.start_sec.toFixed(2)}s - ${s.end_sec.toFixed(2)}s${s.label ? ` (${s.label})` : ""}`;
      } else {
        activeSceneMetaEl.textContent = s && s.label ? s.label : "";
      }
    }
    if (exportPanel) exportPanel.style.display = activeTab === "export" ? "" : "none";
    if (canvas) canvas.style.display = activeTab === "export" ? "none" : "";
    if (workspacePanel) {
      const groups = workspacePanel.querySelectorAll(".control-group");
      groups.forEach((g, idx) => {
        if (idx <= 1) return;
        // Render Settings is the inverse of scene-editing groups: visible
        // only on the Export tab, hidden when editing a scene.
        if (g.id === "renderSettingsGroup") {
          g.style.display = activeTab === "export" ? "" : "none";
          return;
        }
        g.style.display = activeTab === "export" ? "none" : "";
      });
    }
  }
  function renderExportThumbnails() {
    if (!sceneThumbsEl) return;
    sceneThumbsEl.innerHTML = "";
    exportThumbs = [];
    for (let i = 0; i < scenes.length; i++) {
      const card = document.createElement("div");
      card.className = "thumb-card";
      const title = document.createElement("h4");
      title.textContent = scenes[i].name || `Scene ${i + 1}`;
      const img = document.createElement("canvas");
      img.width = 192;
      img.height = 120;
      card.appendChild(title);
      card.appendChild(img);
      sceneThumbsEl.appendChild(card);
      exportThumbs.push({ sceneIndex: i, canvas: img, ctx: img.getContext("2d") });
    }
    exportThumbCursor = 0;
    updateExportThumbnailFrame(true);
  }
  function updateExportThumbnailFrame(forceAll) {
    if (activeTab !== "export" || exportThumbs.length === 0) return;
    const prevIdx = activeSceneIndex;
    const prevTab = activeTab;
    const prevActive = active;
    const prevActiveEffect = activeEffect;
    const prevActivePostEffect = activePostEffect;
    const prevActivePostFilter = activePostFilter;
    const prevPalette = activePalette;
    const prevVisualStack = [...visualStack];
    const prevBackgroundConfig = cloneBackgroundConfig(backgroundConfig);
    const prevEffectStack = [...effectStack];
    const prevEffectParams = JSON.parse(JSON.stringify(effectParams || {}));
    const prevPostEffectStack = (postEffectStack || []).map(clonePostLayer);
    const prevPostFilterStack = clonePostFilterStack(postFilterStack);
    const count = forceAll ? exportThumbs.length : 1;
    for (let n = 0; n < count; n++) {
      const idx = (exportThumbCursor + n) % exportThumbs.length;
      const t = exportThumbs[idx];
      activeSceneIndex = t.sceneIndex;
      activeTab = "scene";
      loadSceneIntoCurrentState(scenes[activeSceneIndex]);
      lowBuf.fill(0);
      renderCurrentSceneFrame(false);
      t.ctx.drawImage(canvas, 0, 0, t.canvas.width, t.canvas.height);
    }
    exportThumbCursor = (exportThumbCursor + count) % exportThumbs.length;
    activeSceneIndex = prevIdx;
    activeTab = prevTab;
    active = prevActive;
    activeEffect = prevActiveEffect;
    activePostEffect = prevActivePostEffect;
    activePostFilter = prevActivePostFilter;
    activePalette = prevPalette;
    visualStack = prevVisualStack;
    backgroundConfig = prevBackgroundConfig;
    effectStack = prevEffectStack;
    effectParams = prevEffectParams;
    postEffectStack = prevPostEffectStack;
    postFilterStack = prevPostFilterStack;
    refreshVisualSelect();
    refreshPaletteSelect();
    refreshBackgroundControls();
    renderVisualStackPills();
    refreshEffectSelect();
    renderEffectStackPills();
    refreshPostEffectSelect();
    renderPostChainPills();
    refreshPostFilterSelect();
    renderPostFilterPills();
  }
  function exportConfigJson() {
    syncSceneFromCurrentState();
    const base = importedTimeline && typeof importedTimeline === "object" ? importedTimeline : {};
    const settings = { ...(base.settings ?? {}) };
    const profilePath = profilePathInput ? profilePathInput.value.trim() : "";
    if (profilePath) settings.profile = profilePath;
    else delete settings.profile;
    // Render settings: blank field = omit (engine falls back to its own default).
    // Seed is a special case — blank explicitly means "random per run" (null).
    // Scale is a UI-side special case: blank still exports the project default
    // explicitly so staged configs render at the intended final resolution.
    const setIntFromInput = (key, input, blankValue) => {
      if (!input) return;
      const raw = input.value.trim();
      if (raw === "") {
        if (blankValue === undefined) delete settings[key];
        else settings[key] = blankValue;
        return;
      }
      const n = Number(raw);
      if (Number.isFinite(n)) settings[key] = Math.trunc(n);
    };
    setIntFromInput("scale", settingScaleInput, 6);
    setIntFromInput("fps",   settingFpsInput);
    setIntFromInput("crf",   settingCrfInput);
    if (settingSeedInput) {
      const raw = settingSeedInput.value.trim();
      if (raw === "") settings.seed = null;
      else {
        const n = Number(raw);
        if (Number.isFinite(n)) settings.seed = Math.trunc(n);
      }
    }
    const out = {
      version: base.version ?? 1,
      audio: base.audio ?? null,
      settings,
      post: base.post ?? {},
      scenes: scenes.map((s, idx) => {
        const src = Array.isArray(base.scenes) ? base.scenes[idx] || {} : {};
        const outScene = {
          ...src,
          id: src.id ?? (idx + 1),
          start_sec: Number.isFinite(s.start_sec) ? s.start_sec : (src.start_sec ?? 0),
          end_sec: Number.isFinite(s.end_sec) ? s.end_sec : (src.end_sec ?? 0),
          label: s.label ?? src.label ?? "",
          video: {
            visuals: {
              effects: [...(s.visualStack || [])],
              post: (s.effectStack || []).map((id) => {
                const props = s.effectParams && s.effectParams[id];
                return (props && Object.keys(props).length) ? { id, props } : id;
              }),
              palette: PALETTE_IDS.includes(s.palette) ? s.palette : ((src.video && src.video.visuals && src.video.visuals.palette) ? src.video.visuals.palette : DEFAULT_PALETTE_ID)
            },
            post: [
              ...(s.postEffectStack || []).map((p) => ({
                type: "glitch",
                id: p.id,
                props: JSON.parse(JSON.stringify(p.params || {})),
                accumulate: JSON.parse(JSON.stringify(p.accumulate || {}))
              })),
              ...(s.postFilterStack || []).map((f) => ({
                type: "post_filter",
                id: f.id
              }))
            ]
          }
        };
        const bg = backgroundForExport(s.background);
        if (bg) outScene.video.visuals.background = bg;
        return outScene;
      })
    };
    const txt = JSON.stringify(out, null, 2);
    const blob = new Blob([txt], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = importedTimelineName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    refreshStatus(`Exported ${importedTimelineName}`);
  }
  function normalizeArray(v) {
    return Array.isArray(v) ? v : (v == null ? [] : [v]);
  }
  function sceneNameFromTimelineScene(s, idx) {
    const sid = s && s.id != null ? String(s.id) : String(idx + 1);
    const st = Number.isFinite(Number(s && s.start_sec)) ? Number(s.start_sec).toFixed(2) : "?";
    const en = Number.isFinite(Number(s && s.end_sec)) ? Number(s.end_sec).toFixed(2) : "?";
    const lbl = s && s.label ? ` - ${String(s.label)}` : "";
    return `Scene ${sid} (${st}-${en}s)${lbl}`;
  }
  function importTimelineObject(obj) {
    const srcScenes = Array.isArray(obj && obj.scenes) ? obj.scenes : null;
    if (!srcScenes || srcScenes.length === 0) {
      refreshStatus("Timeline import failed: no scenes[] found.");
      return;
    }
    clearAllBackgroundPreviews();
    const imported = srcScenes.map((s, idx) => {
      const v = (s && typeof s.video === "object" && s.video) ? s.video : {};
      const visualsObj = (v.visuals && typeof v.visuals === "object") ? v.visuals : {};
      const bgConfig = backgroundConfigFromVisuals(visualsObj);
      const vidVisuals = normalizeArray(visualsObj.effects);
      const mappedVisuals = vidVisuals.filter((id) => id in VISUALS);
      const visualIds = mappedVisuals.length ? mappedVisuals : [];
      // Dazzle post entries can be either bare strings or {id, props} objects.
      // Preserve props in a sidecar map so they survive round-trip even though
      // the UI doesn't yet expose editors for them.
      const rawPost = normalizeArray(visualsObj.post);
      const effectIds = [];
      const effectParamsForScene = {};
      for (const entry of rawPost) {
        if (typeof entry === "string") {
          if (entry in EFFECTS && entry !== "__none__") effectIds.push(entry);
        } else if (entry && typeof entry === "object" && entry.id && entry.id in EFFECTS && entry.id !== "__none__") {
          effectIds.push(entry.id);
          if (entry.props && typeof entry.props === "object") {
            effectParamsForScene[entry.id] = JSON.parse(JSON.stringify(entry.props));
          }
        }
      }
      const chain = Array.isArray(v.post) ? v.post : [];
      const glitchEntries = chain.filter((e) => e && e.type === "glitch" && e.id && POST_EFFECT_IMPLEMENTATION_ORDER.includes(e.id));
      // Accept both "post_filter" (new canonical tag) and "filter" (legacy
      // saved timelines from before the schema fix) so old exports round-trip.
      const filterIds = chain.filter((e) => e && (e.type === "post_filter" || e.type === "filter") && e.id).map((e) => e.id);
      const mappedFilters = filterIds
        .map((id) => postFilterCatalog.find((f) => f.id === id))
        .filter(Boolean)
        .map((f) => ({ ...f }));
      return {
        id: `scene_${s && s.id != null ? s.id : (idx + 1)}`,
        name: sceneNameFromTimelineScene(s, idx),
        start_sec: Number(s && s.start_sec),
        end_sec: Number(s && s.end_sec),
        label: s && s.label != null ? String(s.label) : "",
        palette: PALETTE_IDS.includes(visualsObj.palette) ? visualsObj.palette : DEFAULT_PALETTE_ID,
        visualStack: visualIds,
        background: bgConfig,
        effectStack: effectIds,
        effectParams: effectParamsForScene,
        postEffectStack: glitchEntries.map((e) => {
          const layer = createPostLayer(e.id);
          // Saved timelines may use "props" (renderer-canonical) or "params"
          // (older exports). Merge whichever is present over the defaults.
          const saved = (e.props && typeof e.props === "object") ? e.props
            : ((e.params && typeof e.params === "object") ? e.params : null);
          if (saved) layer.params = { ...layer.params, ...JSON.parse(JSON.stringify(saved)) };
          if (e.accumulate && typeof e.accumulate === "object") {
            layer.accumulate = { ...layer.accumulate, ...JSON.parse(JSON.stringify(e.accumulate)) };
          }
          return layer;
        }),
        postFilterStack: mappedFilters
      };
    });
    scenes = imported;
    scenes.forEach((scene) => loadBackgroundPreviewFromBase(scene, scene.background));
    activeSceneIndex = 0;
    activeTab = "scene";
    if (importPanel) importPanel.style.display = "none";
    if (workspacePanel) workspacePanel.style.display = "";
    if (viewerPanel) viewerPanel.style.display = "";
    if (profilePathInput) {
      const importedProfile = (obj && obj.settings && typeof obj.settings.profile === "string") ? obj.settings.profile : "";
      profilePathInput.value = importedProfile;
    }
    const importedSettings = (obj && obj.settings && typeof obj.settings === "object") ? obj.settings : {};
    const populateSetting = (input, key) => {
      if (!input) return;
      const v = importedSettings[key];
      input.value = (typeof v === "number" && Number.isFinite(v)) ? String(v) : "";
    };
    populateSetting(settingScaleInput, "scale");
    populateSetting(settingFpsInput,   "fps");
    populateSetting(settingCrfInput,   "crf");
    populateSetting(settingSeedInput,  "seed");
    loadSceneIntoCurrentState(scenes[0]);
    refreshSceneUi();
    refreshStatus(`Imported timeline with ${scenes.length} scenes.`);
  }
  function importTimelineFromFileInput() {
    const f = timelineFileInput && timelineFileInput.files && timelineFileInput.files[0];
    if (!f) {
      refreshStatus("Choose a timeline JSON file first.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const obj = JSON.parse(String(reader.result || "{}"));
        importedTimeline = obj;
        importedTimelineSourceName = String(f.name || "scene-ui.timeline.json");
        importedTimelineName = String(f.name || "scene-ui.timeline.json").replace(/\.json$/i, "") + ".staged.json";
        importTimelineObject(obj);
      } catch (err) {
        refreshStatus(`Timeline import failed: ${err && err.message ? err.message : "invalid JSON"}`);
      }
    };
    reader.onerror = () => {
      refreshStatus("Timeline import failed: unable to read file.");
    };
    reader.readAsText(f);
  }

  function resetPortedStates() {
    lowBuf.fill(0);
    lowBufHistory = [];
    for (let i = 0; i < postEffectStack.length; i++) {
      if (postEffectStack[i] && postEffectStack[i]._state) postEffectStack[i]._state.acc = null;
    }
    spiralPort.reset();
    hexagonPort.reset();
    tunnelPort.reset();
    sierpinskiPort.reset();
    gridPort.reset();
    linesPort.reset();
    barsPort.reset();
    sinePort.reset();
    boxesPort.reset();
    trianglesPort.reset();
    sweepPort.reset();
    zigzagsPort.reset();
    diag1Port.reset();
    diag2Port.reset();
    diag3Port.reset();
    diag4Port.reset();
    ellipsePort.reset();
    curvesPort.reset();
    pedalsPort.reset();
    ribbonsPort.reset();
    squaresPort.reset();
    sweep2Port.reset();
    sweep3Port.reset();
    streamerPort.reset();
    atomPort.reset();
    puffsPort.reset();
    wanderingPort.reset();
    zigstreamPort.reset();
    lotsadotsPort.reset();
    lotsadots2Port.reset();
    formula1Port.reset();
    spiral1Port.reset();
  }

  function setStatus(text) {
    if (!status) return;
    status.textContent = text;
  }
  function refreshStatus(prefix) {
    setStatus(prefix || "");
  }
  function renderPostChainPills() {
    if (!postChainEl) return;
    postChainEl.innerHTML = "";
    const postEffectHelp = {
      tear: "Creates displaced tear bands by shifting rectangular regions of the frame.",
      chromatic: "Simulates channel split by blending displaced ghost copies in a chosen direction.",
      noise: "Adds stochastic grain/noise to break up clean digital surfaces.",
      warp: "Applies a moving sine-wave spatial remap to bend the frame.",
      slitscan: "Offsets scanlines by temporal delay so different rows/columns show different moments.",
      pixel_sort: "Sorts contiguous pixel runs within a threshold window for datamosh-style streaks.",
      pixel_scramble: "Shuffles pixel positions inside random blocks.",
      jpeg_corrupt: "Re-encodes random blocks at low JPEG quality for DCT artifacts.",
      channel_swap: "Swaps or rotates RGB channels inside random blocks.",
      bit_crush: "Quantizes color depth inside random blocks for posterized digital artifacts.",
      invert_blocks: "Inverts color values inside random block regions.",
      databend: "Applies byte-chunk corruption modes (shift/xor/swap) to frame data.",
      clip_cut: "Jumps to a secondary clip for a short hold when a section-change trigger occurs."
    };
    postEffectStack.forEach((layer, idx) => {
      const card = document.createElement("div");
      card.className = "post-card";

      const top = document.createElement("div");
      top.className = "post-card-top";
      const labelWrap = document.createElement("span");
      labelWrap.className = "label-row";
      const label = document.createElement("strong");
      label.textContent = `${idx + 1}. ${layer.id}`;
      const labelTip = document.createElement("button");
      labelTip.type = "button";
      labelTip.className = "help-tip";
      labelTip.textContent = "?";
      labelTip.title = postEffectHelp[layer.id] || "Post-processing layer in the final render chain.";
      labelTip.setAttribute("aria-label", `${layer.id} effect help`);
      labelWrap.appendChild(label);
      labelWrap.appendChild(labelTip);
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "chip";
      remove.textContent = "Remove";
      remove.addEventListener("click", () => {
        postEffectStack = postEffectStack.filter((_, i) => i !== idx);
        renderPostChainPills();
        syncSceneFromCurrentState();
        refreshStatus("Removed post effect layer.");
      });
      top.appendChild(labelWrap);
      top.appendChild(remove);
      card.appendChild(top);

      if (layer.id === "tear") {
        const params = layer.params || (layer.params = makeTearDefaults());
        const tearGrid = document.createElement("div");
        tearGrid.className = "post-grid";
        const helpText = {
          source: "Source for tear fill: displace from current frame, clip, or solid color.",
          clip_path: "Optional clip source path for source=clip (sim fallback if unavailable).",
          color: "RGB color triplet for source=color (for example: 255,0,0).",
          opacity: "Blend strength of tear source over original (0..1).",
          length_pct: "Max tear length percentage (0..100).",
          thickness_pct: "Max tear thickness percentage (0..100).",
          count_pct: "Tear count density percentage (0..100).",
          displace_max_pct: "Maximum displacement percentage (0..100).",
          delay_frames: "Apply tear every Nth frame (>=1).",
          orientation: "Direction of tear bands in the frame.",
          displace_dir: "Displacement sign: any, positive, or negative.",
          edge: "Band origin side: random, start, or end.",
          shape: "Tear region shape: band, square, or circle.",
          accumulate: "Keeps prior glitched output in the feedback buffer.",
          bleed: "How much prior glitch frame blends into current output.",
          reset_sec: "Seconds before accumulation buffer resets."
        };
        const addParamHelp = (wrap, key) => {
          const lbl = document.createElement("span");
          lbl.className = "label-row";
          const name = document.createElement("span");
          name.textContent = key;
          const tip = document.createElement("button");
          tip.type = "button";
          tip.className = "help-tip";
          tip.textContent = "?";
          tip.title = helpText[key] || "";
          tip.setAttribute("aria-label", `${key} help`);
          lbl.appendChild(name);
          lbl.appendChild(tip);
          wrap.appendChild(lbl);
        };
        const fields = [
          ["opacity", 0, 1, 0.01],
          ["length_pct", 0, 100, 1],
          ["thickness_pct", 0, 100, 1],
          ["count_pct", 0, 100, 1],
          ["displace_max_pct", 0, 100, 1],
          ["delay_frames", 1, 120, 1]
        ];
        fields.forEach(([key, min, max, step]) => {
          const wrap = document.createElement("label");
          addParamHelp(wrap, key);
          const input = document.createElement("input");
          input.type = "number";
          input.min = String(min);
          input.max = String(max);
          input.step = String(step);
          input.value = String(params[key]);
          input.addEventListener("change", () => {
            params[key] = key === "delay_frames" ? clampInt(input.value, min, max) : Math.max(min, Math.min(max, Number(input.value)));
            input.value = String(params[key]);
          });
          wrap.appendChild(input);
          tearGrid.appendChild(wrap);
        });
        [["source", ["displace", "clip", "color"]], ["orientation", ["horizontal", "vertical"]], ["shape", ["band", "square", "circle"]], ["edge", ["random", "start", "end"]], ["displace_dir", ["any", "positive", "negative"]]].forEach(([key, opts]) => {
          const wrap = document.createElement("label");
          addParamHelp(wrap, key);
          const sel = document.createElement("select");
          opts.forEach((opt) => {
            const o = document.createElement("option");
            o.value = opt;
            o.textContent = opt;
            sel.appendChild(o);
          });
          sel.value = params[key];
          sel.addEventListener("change", () => { params[key] = sel.value; });
          wrap.appendChild(sel);
          tearGrid.appendChild(wrap);
        });
        [["clip_path", "text"], ["color", "text"]].forEach(([key, type]) => {
          const wrap = document.createElement("label");
          addParamHelp(wrap, key);
          const input = document.createElement("input");
          input.type = type;
          input.value = String(params[key] || "");
          input.addEventListener("change", () => { params[key] = String(input.value || ""); });
          wrap.appendChild(input);
          tearGrid.appendChild(wrap);
        });
        card.appendChild(tearGrid);
      }
      if (layer.id === "chromatic") {
        const params = layer.params || (layer.params = makeChromaticDefaults());
        const helpText = {
          amount: "Maximum RGB channel offset amount in pixels.",
          direction: "Offset direction: horizontal, vertical, or circular.",
          audio_scale: "How strongly audio activity modulates offset intensity."
        };
        const addParamHelp = (wrap, key) => {
          const lbl = document.createElement("span");
          lbl.className = "label-row";
          const name = document.createElement("span");
          name.textContent = key;
          const tip = document.createElement("button");
          tip.type = "button";
          tip.className = "help-tip";
          tip.textContent = "?";
          tip.title = helpText[key] || "";
          tip.setAttribute("aria-label", `${key} help`);
          lbl.appendChild(name);
          lbl.appendChild(tip);
          wrap.appendChild(lbl);
        };
        const grid = document.createElement("div");
        grid.className = "post-grid";
        [["amount", 0, 128, 1], ["audio_scale", 0, 1, 0.01]].forEach(([key, min, max, step]) => {
          const wrap = document.createElement("label");
          addParamHelp(wrap, key);
          const input = document.createElement("input");
          input.type = "number";
          input.min = String(min);
          input.max = String(max);
          input.step = String(step);
          input.value = String(params[key]);
          input.addEventListener("change", () => {
            const n = Number(input.value);
            params[key] = Math.max(min, Math.min(max, Number.isFinite(n) ? n : min));
            input.value = String(params[key]);
          });
          wrap.appendChild(input);
          grid.appendChild(wrap);
        });
        const directionWrap = document.createElement("label");
        addParamHelp(directionWrap, "direction");
        const directionSel = document.createElement("select");
        ["horizontal", "vertical", "circular"].forEach((opt) => {
          const o = document.createElement("option");
          o.value = opt;
          o.textContent = opt;
          directionSel.appendChild(o);
        });
        directionSel.value = params.direction || "horizontal";
        directionSel.addEventListener("change", () => { params.direction = directionSel.value; });
        directionWrap.appendChild(directionSel);
        grid.appendChild(directionWrap);
        card.appendChild(grid);
      }
      if (layer.id === "noise") {
        const params = layer.params || (layer.params = makeNoiseDefaults());
        const helpText = {
          amount: "Base noise amplitude in pixel value units.",
          type: "Noise profile distribution: gaussian or uniform.",
          mono: "Apply same noise across channels (mono) or independent channel noise.",
          audio_scale: "How strongly activity modulates noise amplitude."
        };
        const addParamHelp = (wrap, key) => {
          const lbl = document.createElement("span");
          lbl.className = "label-row";
          const name = document.createElement("span");
          name.textContent = key;
          const tip = document.createElement("button");
          tip.type = "button";
          tip.className = "help-tip";
          tip.textContent = "?";
          tip.title = helpText[key] || "";
          tip.setAttribute("aria-label", `${key} help`);
          lbl.appendChild(name);
          lbl.appendChild(tip);
          wrap.appendChild(lbl);
        };
        const grid = document.createElement("div");
        grid.className = "post-grid";

        const amountWrap = document.createElement("label");
        addParamHelp(amountWrap, "amount");
        const amountInput = document.createElement("input");
        amountInput.type = "number";
        amountInput.min = "0";
        amountInput.max = "128";
        amountInput.step = "1";
        amountInput.value = String(params.amount);
        amountInput.addEventListener("change", () => {
          const n = Number(amountInput.value);
          params.amount = Math.max(0, Math.min(128, Number.isFinite(n) ? n : 0));
          amountInput.value = String(params.amount);
        });
        amountWrap.appendChild(amountInput);
        grid.appendChild(amountWrap);

        const audioScaleWrap = document.createElement("label");
        addParamHelp(audioScaleWrap, "audio_scale");
        const audioScaleInput = document.createElement("input");
        audioScaleInput.type = "number";
        audioScaleInput.min = "0";
        audioScaleInput.max = "1";
        audioScaleInput.step = "0.01";
        audioScaleInput.value = String(params.audio_scale);
        audioScaleInput.addEventListener("change", () => {
          params.audio_scale = clamp01(audioScaleInput.value);
          audioScaleInput.value = String(params.audio_scale);
        });
        audioScaleWrap.appendChild(audioScaleInput);
        grid.appendChild(audioScaleWrap);

        const typeWrap = document.createElement("label");
        addParamHelp(typeWrap, "type");
        const typeSel = document.createElement("select");
        ["gaussian", "uniform"].forEach((opt) => {
          const o = document.createElement("option");
          o.value = opt;
          o.textContent = opt;
          typeSel.appendChild(o);
        });
        typeSel.value = params.type || "gaussian";
        typeSel.addEventListener("change", () => { params.type = typeSel.value; });
        typeWrap.appendChild(typeSel);
        grid.appendChild(typeWrap);

        const monoWrap = document.createElement("label");
        addParamHelp(monoWrap, "mono");
        const monoChk = document.createElement("input");
        monoChk.type = "checkbox";
        monoChk.checked = params.mono !== false;
        monoChk.addEventListener("change", () => { params.mono = !!monoChk.checked; });
        monoWrap.appendChild(monoChk);
        grid.appendChild(monoWrap);

        card.appendChild(grid);
      }
      if (layer.id === "warp") {
        const params = layer.params || (layer.params = makeWarpDefaults());
        const helpText = {
          amplitude_px: "Maximum row/column shift amplitude in pixels.",
          frequency: "Wave density across the frame.",
          speed: "Animation speed of the moving warp.",
          direction: "Axis along which the warp displaces pixels.",
          audio_scale: "How strongly activity modulates warp intensity."
        };
        const addParamHelp = (wrap, key) => {
          const lbl = document.createElement("span");
          lbl.className = "label-row";
          const name = document.createElement("span");
          name.textContent = key;
          const tip = document.createElement("button");
          tip.type = "button";
          tip.className = "help-tip";
          tip.textContent = "?";
          tip.title = helpText[key] || "";
          tip.setAttribute("aria-label", `${key} help`);
          lbl.appendChild(name);
          lbl.appendChild(tip);
          wrap.appendChild(lbl);
        };
        const grid = document.createElement("div");
        grid.className = "post-grid";
        [["amplitude_px", 0, 200, 1], ["frequency", 0, 0.5, 0.005], ["speed", 0, 12, 0.05], ["audio_scale", 0, 1, 0.01]].forEach(([key, min, max, step]) => {
          const wrap = document.createElement("label");
          addParamHelp(wrap, key);
          const input = document.createElement("input");
          input.type = "number";
          input.min = String(min);
          input.max = String(max);
          input.step = String(step);
          input.value = String(params[key]);
          input.addEventListener("change", () => {
            const n = Number(input.value);
            params[key] = Math.max(min, Math.min(max, Number.isFinite(n) ? n : min));
            input.value = String(params[key]);
          });
          wrap.appendChild(input);
          grid.appendChild(wrap);
        });
        const directionWrap = document.createElement("label");
        addParamHelp(directionWrap, "direction");
        const directionSel = document.createElement("select");
        ["horizontal", "vertical", "both"].forEach((opt) => {
          const o = document.createElement("option");
          o.value = opt;
          o.textContent = opt;
          directionSel.appendChild(o);
        });
        directionSel.value = params.direction || "horizontal";
        directionSel.addEventListener("change", () => { params.direction = directionSel.value; });
        directionWrap.appendChild(directionSel);
        grid.appendChild(directionWrap);
        card.appendChild(grid);
      }
      if (layer.id === "slitscan") {
        const params = layer.params || (layer.params = makeSlitscanDefaults());
        const helpText = {
          direction: "Choose which axis is temporally offset (rows or columns).",
          max_delay_frames: "Maximum historical frame delay used across the scan axis.",
          audio_scale: "How strongly activity modulates effective delay."
        };
        const addParamHelp = (wrap, key) => {
          const lbl = document.createElement("span");
          lbl.className = "label-row";
          const name = document.createElement("span");
          name.textContent = key;
          const tip = document.createElement("button");
          tip.type = "button";
          tip.className = "help-tip";
          tip.textContent = "?";
          tip.title = helpText[key] || "";
          tip.setAttribute("aria-label", `${key} help`);
          lbl.appendChild(name);
          lbl.appendChild(tip);
          wrap.appendChild(lbl);
        };
        const grid = document.createElement("div");
        grid.className = "post-grid";

        const directionWrap = document.createElement("label");
        addParamHelp(directionWrap, "direction");
        const directionSel = document.createElement("select");
        ["horizontal", "vertical"].forEach((opt) => {
          const o = document.createElement("option");
          o.value = opt;
          o.textContent = opt;
          directionSel.appendChild(o);
        });
        directionSel.value = params.direction || "horizontal";
        directionSel.addEventListener("change", () => { params.direction = directionSel.value; });
        directionWrap.appendChild(directionSel);
        grid.appendChild(directionWrap);

        [["max_delay_frames", 1, 120, 1], ["audio_scale", 0, 1, 0.01]].forEach(([key, min, max, step]) => {
          const wrap = document.createElement("label");
          addParamHelp(wrap, key);
          const input = document.createElement("input");
          input.type = "number";
          input.min = String(min);
          input.max = String(max);
          input.step = String(step);
          input.value = String(params[key]);
          input.addEventListener("change", () => {
            const n = Number(input.value);
            params[key] = key === "max_delay_frames"
              ? clampInt(n, min, max)
              : Math.max(min, Math.min(max, Number.isFinite(n) ? n : min));
            input.value = String(params[key]);
          });
          wrap.appendChild(input);
          grid.appendChild(wrap);
        });
        card.appendChild(grid);
      }
      if (layer.id === "pixel_sort") {
        const params = layer.params || (layer.params = makePixelSortDefaults());
        const helpText = {
          sort_by: "Metric used for sorting runs: brightness, hue, or saturation.",
          direction: "Sort along rows, columns, or both axes.",
          lower_threshold: "Minimum normalized value to include in sortable runs.",
          upper_threshold: "Maximum normalized value to include in sortable runs.",
          reverse: "Reverse sort order for darker-to-brighter streaking.",
          angle: "Rotate before sort then rotate back (degrees).",
          audio_scale: "How strongly activity narrows/widens the active threshold window."
        };
        const addParamHelp = (wrap, key) => {
          const lbl = document.createElement("span");
          lbl.className = "label-row";
          const name = document.createElement("span");
          name.textContent = key;
          const tip = document.createElement("button");
          tip.type = "button";
          tip.className = "help-tip";
          tip.textContent = "?";
          tip.title = helpText[key] || "";
          tip.setAttribute("aria-label", `${key} help`);
          lbl.appendChild(name);
          lbl.appendChild(tip);
          wrap.appendChild(lbl);
        };
        const grid = document.createElement("div");
        grid.className = "post-grid";

        const sortByWrap = document.createElement("label");
        addParamHelp(sortByWrap, "sort_by");
        const sortBySel = document.createElement("select");
        ["brightness", "hue", "saturation"].forEach((opt) => {
          const o = document.createElement("option");
          o.value = opt;
          o.textContent = opt;
          sortBySel.appendChild(o);
        });
        sortBySel.value = params.sort_by || "brightness";
        sortBySel.addEventListener("change", () => { params.sort_by = sortBySel.value; });
        sortByWrap.appendChild(sortBySel);
        grid.appendChild(sortByWrap);

        const directionWrap = document.createElement("label");
        addParamHelp(directionWrap, "direction");
        const directionSel = document.createElement("select");
        ["horizontal", "vertical", "both"].forEach((opt) => {
          const o = document.createElement("option");
          o.value = opt;
          o.textContent = opt;
          directionSel.appendChild(o);
        });
        directionSel.value = params.direction || "horizontal";
        directionSel.addEventListener("change", () => { params.direction = directionSel.value; });
        directionWrap.appendChild(directionSel);
        grid.appendChild(directionWrap);

        [["lower_threshold", 0, 1, 0.01], ["upper_threshold", 0, 1, 0.01], ["angle", 0, 359, 1], ["audio_scale", 0, 1, 0.01]].forEach(([key, min, max, step]) => {
          const wrap = document.createElement("label");
          addParamHelp(wrap, key);
          const input = document.createElement("input");
          input.type = "number";
          input.min = String(min);
          input.max = String(max);
          input.step = String(step);
          input.value = String(params[key]);
          input.addEventListener("change", () => {
            const n = Number(input.value);
            params[key] = key === "angle"
              ? clampInt(n, min, max)
              : Math.max(min, Math.min(max, Number.isFinite(n) ? n : min));
            if (key === "lower_threshold" && params.lower_threshold > params.upper_threshold) params.upper_threshold = params.lower_threshold;
            if (key === "upper_threshold" && params.upper_threshold < params.lower_threshold) params.lower_threshold = params.upper_threshold;
            input.value = String(params[key]);
          });
          wrap.appendChild(input);
          grid.appendChild(wrap);
        });

        const reverseWrap = document.createElement("label");
        addParamHelp(reverseWrap, "reverse");
        const reverseChk = document.createElement("input");
        reverseChk.type = "checkbox";
        reverseChk.checked = !!params.reverse;
        reverseChk.addEventListener("change", () => { params.reverse = !!reverseChk.checked; });
        reverseWrap.appendChild(reverseChk);
        grid.appendChild(reverseWrap);

        card.appendChild(grid);
      }
      if (layer.id === "pixel_scramble") {
        const params = layer.params || (layer.params = makePixelScrambleDefaults());
        const helpText = {
          count_pct: "Max block count as percent of frame height.",
          size_pct: "Max block size as percent of min(width,height).",
          shape: "Block shape: rectangle, square, circle, or band.",
          orientation: "Band orientation when shape=band.",
          band_length_pct: "Band length percent when shape=band.",
          delay_frames: "Only fire every N frames."
        };
        const addParamHelp = (wrap, key) => {
          const lbl = document.createElement("span");
          lbl.className = "label-row";
          const name = document.createElement("span");
          name.textContent = key;
          const tip = document.createElement("button");
          tip.type = "button";
          tip.className = "help-tip";
          tip.textContent = "?";
          tip.title = helpText[key] || "";
          tip.setAttribute("aria-label", `${key} help`);
          lbl.appendChild(name);
          lbl.appendChild(tip);
          wrap.appendChild(lbl);
        };
        const grid = document.createElement("div");
        grid.className = "post-grid";
        [["count_pct", 0, 100, 1], ["size_pct", 0, 100, 1], ["band_length_pct", 1, 100, 1], ["delay_frames", 1, 120, 1]].forEach(([key, min, max, step]) => {
          const wrap = document.createElement("label");
          addParamHelp(wrap, key);
          const input = document.createElement("input");
          input.type = "number";
          input.min = String(min);
          input.max = String(max);
          input.step = String(step);
          input.value = String(params[key]);
          input.addEventListener("change", () => {
            const n = Number(input.value);
            params[key] = key === "delay_frames"
              ? clampInt(n, min, max)
              : Math.max(min, Math.min(max, Number.isFinite(n) ? n : min));
            input.value = String(params[key]);
          });
          wrap.appendChild(input);
          grid.appendChild(wrap);
        });
        [["shape", ["rectangle", "square", "circle", "band"]], ["orientation", ["horizontal", "vertical"]]].forEach(([key, opts]) => {
          const wrap = document.createElement("label");
          addParamHelp(wrap, key);
          const sel = document.createElement("select");
          opts.forEach((opt) => {
            const o = document.createElement("option");
            o.value = opt;
            o.textContent = opt;
            sel.appendChild(o);
          });
          sel.value = params[key];
          sel.addEventListener("change", () => { params[key] = sel.value; });
          wrap.appendChild(sel);
          grid.appendChild(wrap);
        });
        card.appendChild(grid);
      }
      if (layer.id === "jpeg_corrupt") {
        const params = layer.params || (layer.params = makeJpegCorruptDefaults());
        const helpText = {
          count_pct: "Max corruption block count as percent of frame height.",
          size_pct: "Max block size as percent of min(width,height).",
          quality: "JPEG quality (1=extreme artifacts, 100=clean).",
          shape: "Block shape: rectangle, square, circle, or band.",
          orientation: "Band orientation when shape=band.",
          band_length_pct: "Band length percent when shape=band.",
          delay_frames: "Only fire every N frames."
        };
        const addParamHelp = (wrap, key) => {
          const lbl = document.createElement("span");
          lbl.className = "label-row";
          const name = document.createElement("span");
          name.textContent = key;
          const tip = document.createElement("button");
          tip.type = "button";
          tip.className = "help-tip";
          tip.textContent = "?";
          tip.title = helpText[key] || "";
          tip.setAttribute("aria-label", `${key} help`);
          lbl.appendChild(name);
          lbl.appendChild(tip);
          wrap.appendChild(lbl);
        };
        const grid = document.createElement("div");
        grid.className = "post-grid";
        [["count_pct", 0, 100, 1], ["size_pct", 0, 100, 1], ["quality", 1, 100, 1], ["band_length_pct", 1, 100, 1], ["delay_frames", 1, 120, 1]].forEach(([key, min, max, step]) => {
          const wrap = document.createElement("label");
          addParamHelp(wrap, key);
          const input = document.createElement("input");
          input.type = "number";
          input.min = String(min);
          input.max = String(max);
          input.step = String(step);
          input.value = String(params[key]);
          input.addEventListener("change", () => {
            const n = Number(input.value);
            params[key] = key === "delay_frames" || key === "quality"
              ? clampInt(n, min, max)
              : Math.max(min, Math.min(max, Number.isFinite(n) ? n : min));
            input.value = String(params[key]);
          });
          wrap.appendChild(input);
          grid.appendChild(wrap);
        });
        [["shape", ["rectangle", "square", "circle", "band"]], ["orientation", ["horizontal", "vertical"]]].forEach(([key, opts]) => {
          const wrap = document.createElement("label");
          addParamHelp(wrap, key);
          const sel = document.createElement("select");
          opts.forEach((opt) => {
            const o = document.createElement("option");
            o.value = opt;
            o.textContent = opt;
            sel.appendChild(o);
          });
          sel.value = params[key];
          sel.addEventListener("change", () => { params[key] = sel.value; });
          wrap.appendChild(sel);
          grid.appendChild(wrap);
        });
        card.appendChild(grid);
      }
      if (layer.id === "channel_swap") {
        const params = layer.params || (layer.params = makeChannelSwapDefaults());
        const helpText = {
          count_pct: "Max swap-block count as percent of frame height.",
          size_pct: "Max block size as percent of min(width,height).",
          mode: "Channel permutation mode per block.",
          audio_scale: "How strongly activity scales count/size intensity.",
          shape: "Block shape: rectangle, square, circle, or band.",
          orientation: "Band orientation when shape=band.",
          band_length_pct: "Band length percent when shape=band.",
          delay_frames: "Only fire every N frames."
        };
        const addParamHelp = (wrap, key) => {
          const lbl = document.createElement("span");
          lbl.className = "label-row";
          const name = document.createElement("span");
          name.textContent = key;
          const tip = document.createElement("button");
          tip.type = "button";
          tip.className = "help-tip";
          tip.textContent = "?";
          tip.title = helpText[key] || "";
          tip.setAttribute("aria-label", `${key} help`);
          lbl.appendChild(name);
          lbl.appendChild(tip);
          wrap.appendChild(lbl);
        };
        const grid = document.createElement("div");
        grid.className = "post-grid";
        [["count_pct", 0, 100, 1], ["size_pct", 0, 100, 1], ["audio_scale", 0, 1, 0.01], ["band_length_pct", 1, 100, 1], ["delay_frames", 1, 120, 1]].forEach(([key, min, max, step]) => {
          const wrap = document.createElement("label");
          addParamHelp(wrap, key);
          const input = document.createElement("input");
          input.type = "number";
          input.min = String(min);
          input.max = String(max);
          input.step = String(step);
          input.value = String(params[key]);
          input.addEventListener("change", () => {
            const n = Number(input.value);
            params[key] = key === "delay_frames"
              ? clampInt(n, min, max)
              : Math.max(min, Math.min(max, Number.isFinite(n) ? n : min));
            input.value = String(params[key]);
          });
          wrap.appendChild(input);
          grid.appendChild(wrap);
        });
        [["mode", ["random", "rb", "rg", "gb", "rotate"]], ["shape", ["rectangle", "square", "circle", "band"]], ["orientation", ["horizontal", "vertical"]]].forEach(([key, opts]) => {
          const wrap = document.createElement("label");
          addParamHelp(wrap, key);
          const sel = document.createElement("select");
          opts.forEach((opt) => {
            const o = document.createElement("option");
            o.value = opt;
            o.textContent = opt;
            sel.appendChild(o);
          });
          sel.value = params[key];
          sel.addEventListener("change", () => { params[key] = sel.value; });
          wrap.appendChild(sel);
          grid.appendChild(wrap);
        });
        card.appendChild(grid);
      }
      if (layer.id === "bit_crush") {
        const params = layer.params || (layer.params = makeBitCrushDefaults());
        const helpText = {
          count_pct: "Max crush-block count as percent of frame height.",
          size_pct: "Max block size as percent of min(width,height).",
          bits: "Number of high bits kept per channel (1..7).",
          audio_scale: "How strongly activity scales count/size intensity.",
          shape: "Block shape: rectangle, square, circle, or band.",
          orientation: "Band orientation when shape=band.",
          band_length_pct: "Band length percent when shape=band.",
          delay_frames: "Only fire every N frames."
        };
        const addParamHelp = (wrap, key) => {
          const lbl = document.createElement("span");
          lbl.className = "label-row";
          const name = document.createElement("span");
          name.textContent = key;
          const tip = document.createElement("button");
          tip.type = "button";
          tip.className = "help-tip";
          tip.textContent = "?";
          tip.title = helpText[key] || "";
          tip.setAttribute("aria-label", `${key} help`);
          lbl.appendChild(name);
          lbl.appendChild(tip);
          wrap.appendChild(lbl);
        };
        const grid = document.createElement("div");
        grid.className = "post-grid";
        [["count_pct", 0, 100, 1], ["size_pct", 0, 100, 1], ["bits", 1, 7, 1], ["audio_scale", 0, 1, 0.01], ["band_length_pct", 1, 100, 1], ["delay_frames", 1, 120, 1]].forEach(([key, min, max, step]) => {
          const wrap = document.createElement("label");
          addParamHelp(wrap, key);
          const input = document.createElement("input");
          input.type = "number";
          input.min = String(min);
          input.max = String(max);
          input.step = String(step);
          input.value = String(params[key]);
          input.addEventListener("change", () => {
            const n = Number(input.value);
            params[key] = key === "delay_frames" || key === "bits"
              ? clampInt(n, min, max)
              : Math.max(min, Math.min(max, Number.isFinite(n) ? n : min));
            input.value = String(params[key]);
          });
          wrap.appendChild(input);
          grid.appendChild(wrap);
        });
        [["shape", ["rectangle", "square", "circle", "band"]], ["orientation", ["horizontal", "vertical"]]].forEach(([key, opts]) => {
          const wrap = document.createElement("label");
          addParamHelp(wrap, key);
          const sel = document.createElement("select");
          opts.forEach((opt) => {
            const o = document.createElement("option");
            o.value = opt;
            o.textContent = opt;
            sel.appendChild(o);
          });
          sel.value = params[key];
          sel.addEventListener("change", () => { params[key] = sel.value; });
          wrap.appendChild(sel);
          grid.appendChild(wrap);
        });
        card.appendChild(grid);
      }
      if (layer.id === "invert_blocks") {
        const params = layer.params || (layer.params = makeInvertBlocksDefaults());
        const helpText = {
          count_pct: "Max invert-block count as percent of frame height.",
          size_pct: "Max block size as percent of min(width,height).",
          audio_scale: "How strongly activity scales count/size intensity.",
          shape: "Block shape: rectangle, square, circle, or band.",
          orientation: "Band orientation when shape=band.",
          band_length_pct: "Band length percent when shape=band.",
          delay_frames: "Only fire every N frames."
        };
        const addParamHelp = (wrap, key) => {
          const lbl = document.createElement("span");
          lbl.className = "label-row";
          const name = document.createElement("span");
          name.textContent = key;
          const tip = document.createElement("button");
          tip.type = "button";
          tip.className = "help-tip";
          tip.textContent = "?";
          tip.title = helpText[key] || "";
          tip.setAttribute("aria-label", `${key} help`);
          lbl.appendChild(name);
          lbl.appendChild(tip);
          wrap.appendChild(lbl);
        };
        const grid = document.createElement("div");
        grid.className = "post-grid";
        [["count_pct", 0, 100, 1], ["size_pct", 0, 100, 1], ["audio_scale", 0, 1, 0.01], ["band_length_pct", 1, 100, 1], ["delay_frames", 1, 120, 1]].forEach(([key, min, max, step]) => {
          const wrap = document.createElement("label");
          addParamHelp(wrap, key);
          const input = document.createElement("input");
          input.type = "number";
          input.min = String(min);
          input.max = String(max);
          input.step = String(step);
          input.value = String(params[key]);
          input.addEventListener("change", () => {
            const n = Number(input.value);
            params[key] = key === "delay_frames"
              ? clampInt(n, min, max)
              : Math.max(min, Math.min(max, Number.isFinite(n) ? n : min));
            input.value = String(params[key]);
          });
          wrap.appendChild(input);
          grid.appendChild(wrap);
        });
        [["shape", ["rectangle", "square", "circle", "band"]], ["orientation", ["horizontal", "vertical"]]].forEach(([key, opts]) => {
          const wrap = document.createElement("label");
          addParamHelp(wrap, key);
          const sel = document.createElement("select");
          opts.forEach((opt) => {
            const o = document.createElement("option");
            o.value = opt;
            o.textContent = opt;
            sel.appendChild(o);
          });
          sel.value = params[key];
          sel.addEventListener("change", () => { params[key] = sel.value; });
          wrap.appendChild(sel);
          grid.appendChild(wrap);
        });
        card.appendChild(grid);
      }
      if (layer.id === "databend") {
        const params = layer.params || (layer.params = makeDatabendDefaults());
        const helpText = {
          count: "Max number of corrupted chunks at full intensity.",
          chunk_size: "Max bytes per chunk at full intensity.",
          modes: "Set of allowed corruption modes. Each chunk randomly picks one from enabled modes; order does not matter.",
          audio_scale: "How strongly activity scales count and chunk size."
        };
        const addParamHelp = (wrap, key) => {
          const lbl = document.createElement("span");
          lbl.className = "label-row";
          const name = document.createElement("span");
          name.textContent = key;
          const tip = document.createElement("button");
          tip.type = "button";
          tip.className = "help-tip";
          tip.textContent = "?";
          tip.title = helpText[key] || "";
          tip.setAttribute("aria-label", `${key} help`);
          lbl.appendChild(name);
          lbl.appendChild(tip);
          wrap.appendChild(lbl);
        };
        const grid = document.createElement("div");
        grid.className = "post-grid";
        [["count", 1, 200, 1], ["chunk_size", 16, 65536, 16], ["audio_scale", 0, 1, 0.01]].forEach(([key, min, max, step]) => {
          const wrap = document.createElement("label");
          addParamHelp(wrap, key);
          const input = document.createElement("input");
          input.type = "number";
          input.min = String(min);
          input.max = String(max);
          input.step = String(step);
          input.value = String(params[key]);
          input.addEventListener("change", () => {
            const n = Number(input.value);
            params[key] = key === "count" || key === "chunk_size"
              ? clampInt(n, min, max)
              : Math.max(min, Math.min(max, Number.isFinite(n) ? n : min));
            input.value = String(params[key]);
          });
          wrap.appendChild(input);
          grid.appendChild(wrap);
        });
        const modesWrap = document.createElement("label");
        addParamHelp(modesWrap, "modes");
        const modesRow = document.createElement("div");
        modesRow.className = "row";
        const enabled = new Set(String(params.modes || "shift,xor,swap").split(",").map((m) => m.trim()).filter((m) => m));
        ["shift", "xor", "swap"].forEach((modeName) => {
          const opt = document.createElement("label");
          opt.style.flexDirection = "row";
          opt.style.alignItems = "center";
          opt.style.gap = "6px";
          const cb = document.createElement("input");
          cb.type = "checkbox";
          cb.checked = enabled.has(modeName);
          cb.addEventListener("change", () => {
            const on = cb.checked;
            if (on) enabled.add(modeName);
            else enabled.delete(modeName);
            if (enabled.size === 0) {
              enabled.add(modeName);
              cb.checked = true;
            }
            params.modes = Array.from(enabled).join(",");
          });
          const txt = document.createElement("span");
          txt.textContent = modeName;
          opt.appendChild(cb);
          opt.appendChild(txt);
          modesRow.appendChild(opt);
        });
        modesWrap.appendChild(modesRow);
        grid.appendChild(modesWrap);
        card.appendChild(grid);
      }
      if (layer.id === "clip_cut") {
        const params = layer.params || (layer.params = makeClipCutDefaults());
        const helpText = {
          other_path: "Secondary clip path used for cut-in moments.",
          hold_frames: "Frames to hold on secondary clip after a trigger."
        };
        const addParamHelp = (wrap, key) => {
          const lbl = document.createElement("span");
          lbl.className = "label-row";
          const name = document.createElement("span");
          name.textContent = key;
          const tip = document.createElement("button");
          tip.type = "button";
          tip.className = "help-tip";
          tip.textContent = "?";
          tip.title = helpText[key] || "";
          tip.setAttribute("aria-label", `${key} help`);
          lbl.appendChild(name);
          lbl.appendChild(tip);
          wrap.appendChild(lbl);
        };
        const grid = document.createElement("div");
        grid.className = "post-grid";

        const otherPathWrap = document.createElement("label");
        addParamHelp(otherPathWrap, "other_path");
        const otherPathInput = document.createElement("input");
        otherPathInput.type = "text";
        otherPathInput.value = String(params.other_path || "");
        otherPathInput.addEventListener("change", () => { params.other_path = String(otherPathInput.value || ""); });
        otherPathWrap.appendChild(otherPathInput);
        grid.appendChild(otherPathWrap);

        const holdWrap = document.createElement("label");
        addParamHelp(holdWrap, "hold_frames");
        const holdInput = document.createElement("input");
        holdInput.type = "number";
        holdInput.min = "1";
        holdInput.max = "300";
        holdInput.step = "1";
        holdInput.value = String(params.hold_frames);
        holdInput.addEventListener("change", () => {
          params.hold_frames = clampInt(holdInput.value, 1, 300);
          holdInput.value = String(params.hold_frames);
        });
        holdWrap.appendChild(holdInput);
        grid.appendChild(holdWrap);

        card.appendChild(grid);
      }

      const acc = layer.accumulate || (layer.accumulate = { enabled: false, bleed: 0.08, reset_sec: 2.0 });
      const accGrid = document.createElement("div");
      accGrid.className = "post-grid";
      const accEnabled = document.createElement("label");
      const accLabel = document.createElement("span");
      accLabel.className = "label-row";
      const accName = document.createElement("span");
      accName.textContent = "accumulate";
      const accQ = document.createElement("button");
      accQ.type = "button";
      accQ.className = "help-tip";
      accQ.textContent = "?";
      accQ.title = "Keeps prior glitched output in the feedback buffer.";
      accQ.setAttribute("aria-label", "accumulate help");
      accLabel.appendChild(accName);
      accLabel.appendChild(accQ);
      accEnabled.appendChild(accLabel);
      const accChk = document.createElement("input");
      accChk.type = "checkbox";
      accChk.checked = !!acc.enabled;
      accChk.addEventListener("change", () => { acc.enabled = !!accChk.checked; });
      accEnabled.appendChild(accChk);
      accGrid.appendChild(accEnabled);
      [["bleed", 0, 1, 0.01], ["reset_sec", 0, 20, 0.1]].forEach(([key, min, max, step]) => {
        const wrap = document.createElement("label");
        const row = document.createElement("span");
        row.className = "label-row";
        const txt = document.createElement("span");
        txt.textContent = key;
        const q = document.createElement("button");
        q.type = "button";
        q.className = "help-tip";
        q.textContent = "?";
        q.title = key === "bleed"
          ? "How much prior glitch frame blends into current output."
          : "Seconds before accumulation buffer resets.";
        q.setAttribute("aria-label", `${key} help`);
        row.appendChild(txt);
        row.appendChild(q);
        wrap.appendChild(row);
        const input = document.createElement("input");
        input.type = "number";
        input.min = String(min);
        input.max = String(max);
        input.step = String(step);
        input.value = String(acc[key]);
        input.addEventListener("change", () => {
          const n = Number(input.value);
          acc[key] = Math.max(min, Math.min(max, Number.isFinite(n) ? n : min));
          input.value = String(acc[key]);
        });
        wrap.appendChild(input);
        accGrid.appendChild(wrap);
      });
      card.appendChild(accGrid);
      postChainEl.appendChild(card);
    });
  }
  function renderPostFilterPills() {
    if (!postFiltersStackEl) return;
    postFiltersStackEl.innerHTML = "";
    postFilterStack.forEach((f, idx) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "chip";
      const label = f.label || f.id || "filter";
      const category = f.category ? ` [${f.category}]` : "";
      b.textContent = `${idx + 1}. ${label}${category} ×`;
      b.addEventListener("click", () => {
        postFilterStack = postFilterStack.filter((_, i) => i !== idx);
        renderPostFilterPills();
        syncSceneFromCurrentState();
      });
      postFiltersStackEl.appendChild(b);
    });
  }
  function getRenderableStack() {
    const ids = visualStack.filter((id) => id in VISUALS);
    return ids.length ? ids : [];
  }
  function renderVisualStackPills() {
    if (!visualStackEl) return;
    visualStackEl.innerHTML = "";
    visualStack.forEach((id, idx) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "chip";
      b.textContent = `${idx + 1}. ${VISUALS[id] ? VISUALS[id].label : titleFromId(id)} ×`;
      b.addEventListener("click", () => {
        visualStack = visualStack.filter((_, i) => i !== idx);
        resetPortedStates();
        renderVisualStackPills();
        syncSceneFromCurrentState();
        refreshStatus("Removed visual layer.");
      });
      visualStackEl.appendChild(b);
    });
  }
  function getRenderableEffectStack() {
    return effectStack.filter((id) => id in EFFECTS && id !== "__none__");
  }
  function renderEffectStackPills() {
    if (!effectStackEl) return;
    effectStackEl.innerHTML = "";
    effectStack.forEach((id, idx) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "chip";
      b.textContent = `${idx + 1}. ${EFFECTS[id] || id} ×`;
      b.addEventListener("click", () => {
        effectStack = effectStack.filter((_, i) => i !== idx);
        renderEffectStackPills();
        syncSceneFromCurrentState();
        refreshStatus("Removed effect layer.");
      });
      effectStackEl.appendChild(b);
    });
  }
  function titleFromId(id) {
    return String(id).replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  }
  function hash01(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return ((h >>> 0) % 1000) / 1000;
  }

  function hslToRgb(h, s, l) {
    let r, g, b;
    if (s === 0) r = g = b = l;
    else {
      const hue2rgb = (p, q, tt) => {
        if (tt < 0) tt += 1;
        if (tt > 1) tt -= 1;
        if (tt < 1 / 6) return p + (q - p) * 6 * tt;
        if (tt < 1 / 2) return q;
        if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }
  function rgbToHsv01(r, g, b) {
    const rf = r / 255;
    const gf = g / 255;
    const bf = b / 255;
    const max = Math.max(rf, gf, bf);
    const min = Math.min(rf, gf, bf);
    const d = max - min;
    let h = 0;
    if (d !== 0) {
      if (max === rf) h = ((gf - bf) / d + (gf < bf ? 6 : 0)) / 6;
      else if (max === gf) h = ((bf - rf) / d + 2) / 6;
      else h = ((rf - gf) / d + 4) / 6;
    }
    const s = max === 0 ? 0 : d / max;
    return [h, s, max];
  }
  const IDX_METRIC_CACHE = new Array(256);
  function idxMetric(idx, sortBy) {
    let c = IDX_METRIC_CACHE[idx];
    if (!c) {
      const [r, g, b] = idxColorToRgb(idx, 0);
      const [h, s] = rgbToHsv01(r, g, b);
      const v = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      c = { h, s, v };
      IDX_METRIC_CACHE[idx] = c;
    }
    if (sortBy === "hue") return c.h;
    if (sortBy === "saturation") return c.s;
    return c.v;
  }
  function hsvToRgb255(h, s, v) {
    const c = v * s;
    const hh = ((h % 6) + 6) % 6;
    const x = c * (1 - Math.abs((hh % 2) - 1));
    let r = 0, g = 0, b = 0;
    if (hh < 1) { r = c; g = x; b = 0; }
    else if (hh < 2) { r = x; g = c; b = 0; }
    else if (hh < 3) { r = 0; g = c; b = x; }
    else if (hh < 4) { r = 0; g = x; b = c; }
    else if (hh < 5) { r = x; g = 0; b = c; }
    else { r = c; g = 0; b = x; }
    const m = v - c;
    return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
  }
  function paletteColor(name, t) {
    const x = Math.max(0, Math.min(1, t));
    if (name === "fire") {
      const r = Math.min(255, Math.floor(x * 3 * 255));
      const g = Math.min(255, Math.max(0, Math.floor((x * 3 - 1) * 255)));
      const b = Math.min(255, Math.max(0, Math.floor((x * 3 - 2) * 255)));
      return [r, g, b];
    }
    if (name === "ice") {
      const r = Math.min(255, Math.max(0, Math.floor((x * 2 - 1) * 255)));
      const g = Math.min(255, Math.max(0, Math.floor((x * 2 - 0.5) * 255)));
      const b = Math.min(255, Math.floor(x * 1.5 * 255));
      return [r, g, b];
    }
    if (name === "electric") return hsvToRgb255((3.3 + x * 1.8) % 6, 0.9, Math.sqrt(x));
    if (name === "neon") return hsvToRgb255((x * 4 + 5) % 6, 1.0, 1.0);
    if (name === "grayscale") {
      const v = Math.floor(x * 255);
      return [v, v, v];
    }
    if (name === "ocean") {
      const r = Math.floor(x * 0.3 * 255);
      const g = Math.floor((0.2 + x * 0.6) * 255);
      const b = Math.floor((0.4 + x * 0.5) * 255);
      return [r, g, b];
    }
    if (name === "lava") {
      const r = Math.min(255, Math.floor(x * 2 * 255));
      const g = Math.min(255, Math.max(0, Math.floor((x * 2 - 0.7) * 255)));
      const b = Math.max(0, Math.min(255, Math.floor((x - 0.9) * 10 * 255)));
      return [r, g, b];
    }
    return hsvToRgb255(x * 6.0, 1.0, 1.0); // rainbow
  }
  function idxColorToRgb(idx, tt) {
    const paletteName = PALETTE_IDS.includes(activePalette) ? activePalette : DEFAULT_PALETTE_ID;
    const shift = (Math.floor(tt * 60) % 255 + 255) % 255;
    const cycled = idx === 0 ? 0 : ((((idx - 1) + shift) % 255) + 1);
    const t01 = (cycled - 1) / 254.0;
    return paletteColor(paletteName, t01);
  }
  class DazzleSpiral {
    constructor() { this.reset(); }
    reset() {
      this.theta = 0.0;
      this.colorIdx = 1 + Math.floor(Math.random() * 254);
      this.a = 0.5 + Math.random() * 1.5;
      this.direction = Math.random() < 0.5 ? 1 : -1;
    }
    step(features) {
      if (features.transient && Math.random() < 0.3) this.direction *= -1;

      const cx = Math.floor(LOW_W / 2);
      const cy = Math.floor(LOW_H / 2);
      const steps = 80 + Math.floor(features.bass * 400 + features.mid * 200);
      const dtheta = 0.02 + features.treble * 0.06;
      const a = this.a * (0.7 + features.rms * 0.8);

      let theta = this.theta;
      let ci = this.colorIdx;
      const maxR = Math.min(cx, cy) - 2;

      for (let i = 0; i < steps; i++) {
        const r = a * theta;
        if (r > maxR) {
          theta = 0.0;
          ci = 1 + (ci % 254);
          continue;
        }
        const x = Math.floor(cx + r * Math.cos(theta * this.direction));
        const y = Math.floor(cy + r * Math.sin(theta * this.direction));
        if (x >= 0 && x < LOW_W && y >= 0 && y < LOW_H) {
          lowBuf[y * LOW_W + x] = ci;
        }
        theta += dtheta;
        ci = 1 + (ci % 254);
      }
      this.theta = theta;
      this.colorIdx = ci;
    }
  }
  function randChoice(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function drawLine(x0, y0, x1, y1, c) {
    x0 |= 0; y0 |= 0; x1 |= 0; y1 |= 0;
    let dx = Math.abs(x1 - x0);
    let dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    while (true) {
      if (x0 >= 0 && x0 < LOW_W && y0 >= 0 && y0 < LOW_H) lowBuf[y0 * LOW_W + x0] = c;
      if (x0 === x1 && y0 === y1) break;
      const e2 = err * 2;
      if (e2 > -dy) { err -= dy; x0 += sx; }
      if (e2 < dx) { err += dx; y0 += sy; }
    }
  }
  function drawPolygon(points, c) {
    if (!points || points.length < 2) return;
    for (let i = 0; i < points.length; i++) {
      const a = points[i];
      const b = points[(i + 1) % points.length];
      drawLine(a[0], a[1], b[0], b[1], c);
    }
  }
  function drawCircle(cx, cy, r, c) {
    const rr = r * r;
    for (let dy = -r; dy <= r; dy++) {
      const y = cy + dy;
      if (y < 0 || y >= LOW_H) continue;
      const dxMax = Math.floor(Math.sqrt(Math.max(0, rr - dy * dy)));
      for (let dx = -dxMax; dx <= dxMax; dx++) {
        const x = cx + dx;
        if (x >= 0 && x < LOW_W) lowBuf[y * LOW_W + x] = c;
      }
    }
  }
  class DazzleHexagon {
    constructor() { this.reset(); }
    reset() {
      this.angle = Math.random() * Math.PI * 2;
      this.colorIdx = 1 + Math.floor(Math.random() * 254);
      this.ringOffset = 0;
    }
    step(features) {
      if (features.transient) this.colorIdx = 1 + Math.floor(Math.random() * 254);
      const cx = Math.floor(LOW_W / 2), cy = Math.floor(LOW_H / 2);
      this.angle += 0.02 + features.treble * 0.08;
      this.ringOffset += 0.5 + features.bass * 3;
      const rings = 5 + Math.floor(features.rms * 8);
      const baseR = 10;
      const stepR = 12 + features.mid * 10;
      let ci = this.colorIdx;
      const verts = [0, 1, 2, 3, 4, 5].map(i => i * (Math.PI / 3));
      for (let k = 0; k < rings; k++) {
        const r = baseR + k * stepR + (this.ringOffset % stepR);
        if (r > Math.max(LOW_W, LOW_H)) break;
        const ang = this.angle + k * 0.15;
        const pts = verts.map(v => [
          Math.floor(cx + r * Math.cos(ang + v)),
          Math.floor(cy + r * Math.sin(ang + v))
        ]);
        for (let i = 0; i < 6; i++) {
          const a = pts[i], b = pts[(i + 1) % 6];
          drawLine(a[0], a[1], b[0], b[1], ci);
        }
        ci = 1 + ((ci + 7) % 254);
      }
      this.colorIdx = 1 + ((this.colorIdx + 1) % 254);
    }
  }
  class DazzleTunnel {
    constructor() { this.reset(); }
    reset() {
      this.z = 0;
      this.colorIdx = 1 + Math.floor(Math.random() * 254);
      this.sides = randChoice([3, 4, 5, 6, 8]);
      this.rotation = Math.random() * Math.PI * 2;
      this.spin = (Math.random() - 0.5) * 0.1;
    }
    step(features) {
      if (features.transient && Math.random() < 0.4) this.sides = randChoice([3, 4, 5, 6, 8]);
      const cx = Math.floor(LOW_W / 2), cy = Math.floor(LOW_H / 2);
      const speed = 1.5 + features.bass * 6 + features.rms * 2;
      this.z = (this.z + speed) % 24;
      this.rotation += this.spin + features.treble * 0.05;

      const rings = 14;
      const sides = this.sides;
      const angles = Array.from({ length: sides }, (_, i) => i * (2 * Math.PI / sides));
      let ci = this.colorIdx;
      for (let k = 0; k < rings; k++) {
        const r = (k * 24 + this.z) * (1.0 + features.mid * 0.3);
        if (r < 4 || r > Math.max(LOW_W, LOW_H)) continue;
        const rot = this.rotation + k * 0.12;
        const pts = angles.map((a) => [
          Math.floor(cx + r * Math.cos(rot + a)),
          Math.floor(cy + r * Math.sin(rot + a))
        ]);
        for (let i = 0; i < sides; i++) {
          const p0 = pts[i], p1 = pts[(i + 1) % sides];
          drawLine(p0[0], p0[1], p1[0], p1[1], ci);
        }
        ci = 1 + ((ci + 5) % 254);
      }
      this.colorIdx = 1 + ((this.colorIdx + 2) % 254);
    }
  }
  class DazzleSierpinski {
    constructor() { this.reset(); }
    reset() {
      const margin = 12;
      this.vertices = [
        [Math.floor(LOW_W / 2), margin],
        [margin, LOW_H - margin],
        [LOW_W - margin, LOW_H - margin]
      ];
      this.point = [LOW_W / 2, LOW_H / 2];
      this.colorIdx = 1;
    }
    step(features) {
      if (features.transient) this.reset();
      const iters = Math.floor(200 + features.bass * 3000);
      let [px, py] = this.point;
      let ci = this.colorIdx;
      const w0 = 0.33 + features.treble * 0.4;
      const w1 = 0.33 + features.mid * 0.4;
      const w2 = 0.33 + features.bass * 0.4;
      const sw = w0 + w1 + w2;
      const p0 = w0 / sw, p1 = (w0 + w1) / sw;
      for (let i = 0; i < iters; i++) {
        const r = Math.random();
        const c = r < p0 ? 0 : (r < p1 ? 1 : 2);
        const v = this.vertices[c];
        px = (px + v[0]) * 0.5;
        py = (py + v[1]) * 0.5;
        const x = px | 0;
        const y = py | 0;
        if (x >= 0 && x < LOW_W && y >= 0 && y < LOW_H) lowBuf[y * LOW_W + x] = ci;
      }
      ci = 1 + ((ci - 1 + 1 + Math.floor(features.mid * 3)) % 254);
      this.point = [px, py];
      this.colorIdx = ci;
    }
  }
  class DazzleGrid {
    constructor() { this.reset(); }
    reset() {
      this.offset = 0.0;
      this.spacing = 12 + Math.floor(Math.random() * 20);
      this.colorIdx = 1 + Math.floor(Math.random() * 254);
    }
    step(features) {
      if (features.transient) {
        this.spacing = 8 + Math.floor(Math.random() * 24);
        this.colorIdx = 1 + Math.floor(Math.random() * 254);
      }
      this.offset += 0.3 + features.bass * 2.0 + features.treble * 1.5;
      const offX = (this.offset | 0) % this.spacing;
      const offY = ((this.offset * 0.7) | 0) % this.spacing;

      let ci = this.colorIdx;
      for (let y = offY; y < LOW_H; y += this.spacing) {
        const row = y * LOW_W;
        for (let x = 0; x < LOW_W; x++) lowBuf[row + x] = ci;
        ci = 1 + ((ci + 3) % 254);
      }
      for (let x = offX; x < LOW_W; x += this.spacing) {
        for (let y = 0; y < LOW_H; y++) lowBuf[y * LOW_W + x] = ci;
        ci = 1 + ((ci + 3) % 254);
      }
      this.colorIdx = 1 + ((this.colorIdx + 1 + Math.floor(features.mid * 4)) % 254);
    }
  }
  class DazzleLines {
    constructor() { this.colorIdx = 1; }
    reset() { this.colorIdx = 1 + Math.floor(Math.random() * 254); }
    step(features) {
      if (features.transient) this.colorIdx = 1 + Math.floor(Math.random() * 254);
      const count = 1 + Math.floor(features.bass * 8 + features.mid * 4);
      for (let i = 0; i < count; i++) {
        const x0 = Math.floor(Math.random() * LOW_W), y0 = Math.floor(Math.random() * LOW_H);
        const x1 = Math.floor(Math.random() * LOW_W), y1 = Math.floor(Math.random() * LOW_H);
        drawLine(x0, y0, x1, y1, this.colorIdx);
        this.colorIdx = 1 + (this.colorIdx % 254);
      }
    }
  }
  class DazzleBars {
    constructor() { this.reset(); }
    reset() {
      this.phase = 0.0;
      this.colorIdx = 1 + Math.floor(Math.random() * 254);
      this.nBars = randChoice([16, 20, 32, 40]);
      this.vertical = Math.random() < 0.7;
    }
    step(features) {
      if (features.transient) {
        this.colorIdx = 1 + Math.floor(Math.random() * 254);
        if (Math.random() < 0.2) {
          this.nBars = randChoice([16, 20, 32, 40]);
          this.vertical = Math.random() < 0.7;
        }
      }
      this.phase += 0.08 + features.mid * 0.25 + features.bass * 0.15;
      let ci = this.colorIdx;
      const amp = 0.4 + features.rms * 0.8;
      if (this.vertical) {
        const barW = Math.floor(LOW_W / this.nBars);
        for (let i = 0; i < this.nBars; i++) {
          let h = (Math.sin(this.phase + i * 0.35) * 0.5 + 0.5) * amp * LOW_H;
          h = Math.max(1, Math.min(LOW_H, h | 0));
          const x0 = i * barW;
          const x1 = Math.min(LOW_W, x0 + barW - 1);
          for (let y = LOW_H - h; y < LOW_H; y++) {
            const row = y * LOW_W;
            for (let x = x0; x < x1; x++) lowBuf[row + x] = ci;
          }
          ci = 1 + ((ci + 5) % 254);
        }
      } else {
        const barH = Math.floor(LOW_H / this.nBars);
        for (let i = 0; i < this.nBars; i++) {
          let w = (Math.sin(this.phase + i * 0.35) * 0.5 + 0.5) * amp * LOW_W;
          w = Math.max(1, Math.min(LOW_W, w | 0));
          const y0 = i * barH;
          const y1 = Math.min(LOW_H, y0 + barH - 1);
          for (let y = y0; y < y1; y++) {
            const row = y * LOW_W;
            for (let x = 0; x < w; x++) lowBuf[row + x] = ci;
          }
          ci = 1 + ((ci + 5) % 254);
        }
      }
      this.colorIdx = 1 + ((this.colorIdx + 1 + Math.floor(features.treble * 3)) % 254);
    }
  }
  class DazzleSine {
    constructor() { this.reset(); }
    reset() {
      this.phase = 0.0;
      this.colorIdx = 1 + Math.floor(Math.random() * 254);
      this.freq = 0.02 + Math.random() * 0.05;
      this.cy = Math.floor(LOW_H / 2) + Math.floor(Math.random() * 60) - 30;
    }
    step(features) {
      if (features.transient) {
        this.freq = 0.015 + Math.random() * 0.06;
        this.colorIdx = 1 + Math.floor(Math.random() * 254);
        this.cy = Math.floor(LOW_H / 2) + Math.floor(Math.random() * 60) - 30;
      }
      this.phase += 0.15 + features.bass * 0.5 + features.mid * 0.3;
      const amp = 10 + features.rms * 80 + features.bass * 20;
      const stepX = 2;
      const freq = this.freq * (1 + features.treble * 2);

      let ci = this.colorIdx;
      let prevX = 0;
      let prevY = this.cy | 0;
      for (let x = 0; x < LOW_W; x += stepX) {
        const y = (this.cy + amp * Math.sin(freq * x + this.phase)) | 0;
        drawLine(prevX, prevY, x, y, ci);
        prevX = x;
        prevY = y;
        ci = 1 + ((ci + 2) % 254);
      }
      this.colorIdx = 1 + ((this.colorIdx + 1) % 254);
    }
  }
  class DazzleBoxes {
    constructor() { this.reset(); }
    reset() {
      this.offset = 0.0;
      this.colorIdx = 1 + Math.floor(Math.random() * 254);
      this.cx = Math.floor(LOW_W / 2) + (Math.floor(Math.random() * 80) - 40);
      this.cy = Math.floor(LOW_H / 2) + (Math.floor(Math.random() * 60) - 30);
      this.aspect = 0.7 + Math.random() * 0.6;
    }
    step(features) {
      if (features.transient) {
        this.cx = Math.floor(LOW_W / 2) + (Math.floor(Math.random() * 80) - 40);
        this.cy = Math.floor(LOW_H / 2) + (Math.floor(Math.random() * 60) - 30);
        this.colorIdx = 1 + Math.floor(Math.random() * 254);
      }
      this.offset += 0.4 + features.bass * 3 + features.rms * 1.5;
      const step = 10 + Math.floor(features.mid * 16);
      const rings = 12 + Math.floor(features.rms * 10);
      let ci = this.colorIdx;
      const off = this.offset % step;
      for (let k = 1; k <= rings; k++) {
        const r = k * step + off;
        const hw = r | 0;
        const hh = (r * this.aspect) | 0;
        const x0 = this.cx - hw, y0 = this.cy - hh;
        const x1 = this.cx + hw, y1 = this.cy + hh;
        drawPolygon([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], ci);
        ci = 1 + ((ci + 6) % 254);
      }
      this.colorIdx = 1 + ((this.colorIdx + 2) % 254);
    }
  }
  class DazzleTriangles {
    constructor() { this.reset(); }
    reset() { this.colorIdx = 1 + Math.floor(Math.random() * 254); }
    step(features) {
      if (features.transient) this.colorIdx = 1 + Math.floor(Math.random() * 254);
      const count = 1 + Math.floor(features.rms * 4 + features.bass * 3);
      for (let i = 0; i < count; i++) {
        const pts = Array.from({ length: 3 }, () => [
          Math.floor(Math.random() * LOW_W),
          Math.floor(Math.random() * LOW_H)
        ]);
        drawPolygon(pts, this.colorIdx);
        this.colorIdx = 1 + ((this.colorIdx + 3) % 254);
      }
    }
  }
  class DazzleSweep {
    constructor() { this.reset(); }
    reset() {
      this.angle = Math.random() * Math.PI * 2;
      this.colorIdx = 1 + Math.floor(Math.random() * 254);
      this.cx = Math.floor(LOW_W / 2);
      this.cy = Math.floor(LOW_H / 2);
      this.sweepCount = randChoice([1, 2, 3]);
      this.direction = Math.random() < 0.5 ? 1 : -1;
    }
    step(features) {
      if (features.transient && Math.random() < 0.3) {
        this.direction *= -1;
        this.colorIdx = 1 + Math.floor(Math.random() * 254);
      }
      const maxR = Math.floor(Math.sqrt(this.cx * this.cx + this.cy * this.cy));
      const armSep = (2 * Math.PI) / this.sweepCount;
      const substeps = 2 + Math.floor(features.bass * 6);
      const dangle = ((0.03 + features.mid * 0.08) * this.direction) / substeps;
      let ci = this.colorIdx;
      for (let s = 0; s < substeps; s++) {
        this.angle += dangle;
        for (let arm = 0; arm < this.sweepCount; arm++) {
          const a = this.angle + arm * armSep;
          const ca = Math.cos(a), sa = Math.sin(a);
          for (let r = 0; r < maxR; r += 2) {
            const x = (this.cx + r * ca) | 0;
            const y = (this.cy + r * sa) | 0;
            if (x >= 0 && x < LOW_W && y >= 0 && y < LOW_H) lowBuf[y * LOW_W + x] = ci;
            else break;
          }
          ci = 1 + ((ci + 3) % 254);
        }
      }
      this.colorIdx = 1 + ((this.colorIdx + 1 + Math.floor(features.treble * 3)) % 254);
    }
  }
  class DazzleZigzags {
    constructor() { this.reset(); }
    reset() {
      this.x = Math.floor(Math.random() * LOW_W);
      this.y = Math.floor(Math.random() * LOW_H);
      this.angle = Math.random() * 2 * Math.PI;
      this.turn = Math.random() < 0.5 ? -1 : 1;
      this.colorIdx = 1 + Math.floor(Math.random() * 254);
    }
    step(features) {
      if (features.transient) this.angle = Math.random() * 2 * Math.PI;
      const steps = 20 + Math.floor(features.bass * 80 + features.mid * 40);
      const segmentLen = 6 + Math.floor(features.rms * 20);
      const turnAmt = 1.8 + features.treble * 0.8;
      for (let i = 0; i < steps; i++) {
        const nx = this.x + Math.floor(segmentLen * Math.cos(this.angle));
        const ny = this.y + Math.floor(segmentLen * Math.sin(this.angle));
        drawLine(this.x, this.y, nx, ny, this.colorIdx);
        this.x = ((nx % LOW_W) + LOW_W) % LOW_W;
        this.y = ((ny % LOW_H) + LOW_H) % LOW_H;
        this.angle += this.turn * turnAmt;
        this.turn *= -1;
        this.colorIdx = 1 + ((this.colorIdx + 2) % 254);
      }
    }
  }
  class DazzleDiag1 {
    constructor() { this.reset(); }
    reset() {
      this.offset = 0.0;
      this.spacing = 10 + Math.floor(Math.random() * 20);
      this.colorIdx = 1 + Math.floor(Math.random() * 254);
    }
    step(features) {
      if (features.transient) {
        this.spacing = 8 + Math.floor(Math.random() * 24);
        this.colorIdx = 1 + Math.floor(Math.random() * 254);
      }
      this.offset += 0.6 + features.bass * 4 + features.mid * 2;
      const off = (this.offset | 0) % this.spacing;
      let ci = this.colorIdx;
      for (let k = -LOW_H; k < LOW_W; k += this.spacing) {
        const x0 = k + off;
        const y0 = 0;
        const x1 = x0 + LOW_H;
        const y1 = LOW_H;
        drawLine(x0, y0, x1, y1, ci);
        ci = 1 + ((ci + 4) % 254);
      }
      this.colorIdx = 1 + ((this.colorIdx + 1 + Math.floor(features.treble * 3)) % 254);
    }
  }
  class DazzleDiag2 {
    constructor() { this.reset(); }
    reset() {
      this.offset = 0.0;
      this.spacing = 10 + Math.floor(Math.random() * 20);
      this.colorIdx = 1 + Math.floor(Math.random() * 254);
    }
    step(features) {
      if (features.transient) {
        this.spacing = 8 + Math.floor(Math.random() * 24);
        this.colorIdx = 1 + Math.floor(Math.random() * 254);
      }
      this.offset += 0.6 + features.bass * 4 + features.mid * 2;
      const off = (this.offset | 0) % this.spacing;
      let ci = this.colorIdx;
      for (let k = 0; k < LOW_W + LOW_H; k += this.spacing) {
        const x0 = k + off;
        const y0 = 0;
        const x1 = x0 - LOW_H;
        const y1 = LOW_H;
        drawLine(x0, y0, x1, y1, ci);
        ci = 1 + ((ci + 4) % 254);
      }
      this.colorIdx = 1 + ((this.colorIdx + 1 + Math.floor(features.treble * 3)) % 254);
    }
  }
  class DazzleDiag3 {
    constructor() { this.reset(); }
    reset() {
      this.offA = 0.0;
      this.offB = 0.0;
      this.spacing = 12 + Math.floor(Math.random() * 18);
      this.colorIdx = 1 + Math.floor(Math.random() * 254);
    }
    step(features) {
      if (features.transient) {
        this.spacing = 10 + Math.floor(Math.random() * 20);
        this.colorIdx = 1 + Math.floor(Math.random() * 254);
      }
      const drive = 0.5 + features.bass * 4 + features.mid * 2;
      this.offA += drive;
      this.offB -= drive * 0.8;
      const oa = (this.offA | 0) % this.spacing;
      const ob = (this.offB | 0) % this.spacing;
      let ci = this.colorIdx;
      for (let k = -LOW_H; k < LOW_W; k += this.spacing) {
        drawLine(k + oa, 0, k + oa + LOW_H, LOW_H, ci);
        ci = 1 + ((ci + 3) % 254);
      }
      ci = 1 + ((ci + 30) % 254);
      for (let k = 0; k < LOW_W + LOW_H; k += this.spacing) {
        drawLine(k + ob, 0, k + ob - LOW_H, LOW_H, ci);
        ci = 1 + ((ci + 3) % 254);
      }
      this.colorIdx = 1 + ((this.colorIdx + 1) % 254);
    }
  }
  class DazzleDiag4 {
    constructor() { this.reset(); }
    reset() {
      this.phase = 0.0;
      this.cx = 40 + Math.floor(Math.random() * (LOW_W - 80));
      this.cy = 30 + Math.floor(Math.random() * (LOW_H - 60));
      this.nRays = randChoice([12, 16, 24, 32]);
      this.colorIdx = 1 + Math.floor(Math.random() * 254);
    }
    step(features) {
      if (features.transient) {
        this.cx = 40 + Math.floor(Math.random() * (LOW_W - 80));
        this.cy = 30 + Math.floor(Math.random() * (LOW_H - 60));
        this.colorIdx = 1 + Math.floor(Math.random() * 254);
      }
      this.phase += 0.02 + features.mid * 0.1 + features.treble * 0.06;
      const maxR = Math.floor(Math.hypot(LOW_W, LOW_H));
      const stepAng = (2 * Math.PI) / this.nRays;
      let ci = this.colorIdx;
      for (let k = 0; k < this.nRays; k++) {
        const a = this.phase + k * stepAng;
        const x1 = (this.cx + maxR * Math.cos(a)) | 0;
        const y1 = (this.cy + maxR * Math.sin(a)) | 0;
        drawLine(this.cx, this.cy, x1, y1, ci);
        ci = 1 + ((ci + 7) % 254);
      }
      this.colorIdx = 1 + ((this.colorIdx + 1 + Math.floor(features.bass * 4)) % 254);
    }
  }
  class DazzleEllipse {
    constructor() { this.reset(); }
    reset() {
      this.theta = 0.0;
      this.colorIdx = 1 + Math.floor(Math.random() * 254);
      this.cx = Math.floor(LOW_W / 2) + (Math.floor(Math.random() * 80) - 40);
      this.cy = Math.floor(LOW_H / 2) + (Math.floor(Math.random() * 60) - 30);
      this.ax = 30 + Math.floor(Math.random() * 50);
      this.ay = 20 + Math.floor(Math.random() * 40);
      this.rot = Math.random() * Math.PI;
    }
    step(features) {
      if (features.transient) {
        this.rot = Math.random() * Math.PI;
        this.colorIdx = 1 + Math.floor(Math.random() * 254);
      }
      const samples = 120 + Math.floor(features.bass * 400 + features.mid * 200);
      const dtheta = 0.05 + features.treble * 0.1;
      const ax = this.ax * (0.7 + features.rms * 0.8);
      const ay = this.ay * (0.7 + features.rms * 0.6);
      const cosR = Math.cos(this.rot), sinR = Math.sin(this.rot);
      let theta = this.theta;
      let ci = this.colorIdx;
      for (let i = 0; i < samples; i++) {
        const lx = ax * Math.cos(theta);
        const ly = ay * Math.sin(theta);
        const x = (this.cx + lx * cosR - ly * sinR) | 0;
        const y = (this.cy + lx * sinR + ly * cosR) | 0;
        if (x >= 0 && x < LOW_W && y >= 0 && y < LOW_H) lowBuf[y * LOW_W + x] = ci;
        theta += dtheta;
        ci = 1 + (ci % 254);
      }
      this.theta = theta;
      this.colorIdx = ci;
      this.rot += 0.005 + features.mid * 0.02;
    }
  }
  class DazzleCurves {
    constructor() { this.reset(); }
    reset() {
      this.p0 = [Math.random() * LOW_W, Math.random() * LOW_H];
      this.p1 = [Math.random() * LOW_W, Math.random() * LOW_H];
      this.p2 = [Math.random() * LOW_W, Math.random() * LOW_H];
      this.v0 = [Math.random() * 4 - 2, Math.random() * 4 - 2];
      this.v1 = [Math.random() * 6 - 3, Math.random() * 6 - 3];
      this.v2 = [Math.random() * 4 - 2, Math.random() * 4 - 2];
      this.colorIdx = 1 + Math.floor(Math.random() * 254);
    }
    jitter(v, features) {
      const kick = 0.3 + features.bass * 2.5;
      v[0] = (v[0] + (Math.random() * 2 - 1) * kick) * 0.95;
      v[1] = (v[1] + (Math.random() * 2 - 1) * kick) * 0.95;
    }
    step(features) {
      if (features.transient) {
        this.v1[0] += Math.random() * 8 - 4;
        this.v1[1] += Math.random() * 8 - 4;
        this.colorIdx = 1 + Math.floor(Math.random() * 254);
      }
      this.jitter(this.v0, features);
      this.jitter(this.v1, features);
      this.jitter(this.v2, features);
      this.p0[0] = (this.p0[0] + this.v0[0] + LOW_W) % LOW_W;
      this.p0[1] = (this.p0[1] + this.v0[1] + LOW_H) % LOW_H;
      this.p1[0] = (this.p1[0] + this.v1[0] + LOW_W) % LOW_W;
      this.p1[1] = (this.p1[1] + this.v1[1] + LOW_H) % LOW_H;
      this.p2[0] = (this.p2[0] + this.v2[0] + LOW_W) % LOW_W;
      this.p2[1] = (this.p2[1] + this.v2[1] + LOW_H) % LOW_H;

      const samples = 24 + Math.floor(features.rms * 60 + features.mid * 40);
      let ci = this.colorIdx;
      let prevX = this.p0[0];
      let prevY = this.p0[1];
      for (let i = 1; i < samples; i++) {
        const t = i / (samples - 1);
        const one = (1 - t) * (1 - t);
        const two = 2 * (1 - t) * t;
        const thr = t * t;
        const x = one * this.p0[0] + two * this.p1[0] + thr * this.p2[0];
        const y = one * this.p0[1] + two * this.p1[1] + thr * this.p2[1];
        drawLine(prevX | 0, prevY | 0, x | 0, y | 0, ci);
        prevX = x;
        prevY = y;
        ci = 1 + ((ci + 3) % 254);
      }
      this.colorIdx = 1 + ((this.colorIdx + 1) % 254);
    }
  }
  class DazzlePedals {
    constructor() { this.reset(); }
    reset() {
      this.theta = 0.0;
      this.colorIdx = 1 + Math.floor(Math.random() * 254);
      this.k = randChoice([3, 4, 5, 6, 7]);
      this.scale = 40 + Math.floor(Math.random() * 40);
      this.cx = Math.floor(LOW_W / 2);
      this.cy = Math.floor(LOW_H / 2);
    }
    step(features) {
      if (features.transient) {
        this.k = randChoice([3, 4, 5, 6, 7]);
        this.colorIdx = 1 + Math.floor(Math.random() * 254);
      }
      const samples = 100 + Math.floor(features.bass * 400 + features.mid * 200);
      const dtheta = 0.03 + features.treble * 0.06;
      const scale = this.scale * (0.7 + features.rms * 0.8);
      let theta = this.theta;
      let ci = this.colorIdx;
      for (let i = 0; i < samples; i++) {
        const r = scale * Math.cos(this.k * theta);
        const x = (this.cx + r * Math.cos(theta)) | 0;
        const y = (this.cy + r * Math.sin(theta)) | 0;
        if (x >= 0 && x < LOW_W && y >= 0 && y < LOW_H) lowBuf[y * LOW_W + x] = ci;
        theta += dtheta;
        ci = 1 + (ci % 254);
      }
      this.theta = theta;
      this.colorIdx = ci;
    }
  }
  class DazzleRibbons {
    constructor() { this.reset(); }
    reset() {
      this.phase = 0.0;
      this.colorIdx = 1 + Math.floor(Math.random() * 254);
      this.nBands = randChoice([3, 4, 5, 6]);
      this.freq = 0.01 + Math.random() * 0.03;
      this.bandSep = 6 + Math.floor(Math.random() * 10);
    }
    step(features) {
      if (features.transient) {
        this.freq = 0.01 + Math.random() * 0.03;
        this.colorIdx = 1 + Math.floor(Math.random() * 254);
      }
      this.phase += 0.1 + features.bass * 0.4 + features.mid * 0.2;
      const amp = 20 + features.rms * 60;
      const stepX = 3;
      let ci = this.colorIdx;
      for (let b = 0; b < this.nBands; b++) {
        const yoff = (b - this.nBands / 2) * this.bandSep;
        let prevX = 0;
        let prevY = null;
        for (let x = 0; x < LOW_W; x += stepX) {
          const y = Math.floor((LOW_H / 2) + yoff + amp * Math.sin(this.freq * x + this.phase + b * 0.6));
          if (prevY !== null) drawLine(prevX, prevY, x, y, ci);
          prevX = x;
          prevY = y;
        }
        ci = 1 + ((ci + 11) % 254);
      }
      this.colorIdx = 1 + ((this.colorIdx + 1 + Math.floor(features.treble * 3)) % 254);
    }
  }
  class DazzleSquares {
    constructor() { this.reset(); }
    reset() { this.colorIdx = 1 + Math.floor(Math.random() * 254); }
    step(features) {
      if (features.transient) this.colorIdx = 1 + Math.floor(Math.random() * 254);
      const count = 1 + Math.floor(features.rms * 4 + features.bass * 3);
      for (let i = 0; i < count; i++) {
        const cx = Math.floor(Math.random() * LOW_W);
        const cy = Math.floor(Math.random() * LOW_H);
        const size = 6 + Math.floor(features.mid * 80 + Math.floor(Math.random() * 20));
        const x0 = cx - Math.floor(size / 2), y0 = cy - Math.floor(size / 2);
        const x1 = cx + Math.floor(size / 2), y1 = cy + Math.floor(size / 2);
        drawPolygon([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], this.colorIdx);
        this.colorIdx = 1 + ((this.colorIdx + 5) % 254);
      }
    }
  }
  class DazzleSweep2 {
    constructor() { this.reset(); }
    reset() {
      this.angle = Math.random() * Math.PI * 2;
      this.colorIdx = 1 + Math.floor(Math.random() * 254);
      this.cx = 60 + Math.floor(Math.random() * (LOW_W - 120));
      this.cy = 40 + Math.floor(Math.random() * (LOW_H - 80));
      this.nArms = randChoice([2, 3, 4]);
      this.direction = Math.random() < 0.5 ? 1 : -1;
      this.pulse = 0.0;
    }
    step(features) {
      if (features.transient && Math.random() < 0.3) {
        this.direction *= -1;
        this.colorIdx = 1 + Math.floor(Math.random() * 254);
      }
      this.pulse += 0.1 + features.bass * 0.5;
      const maxR = Math.floor(Math.hypot(LOW_W, LOW_H));
      const armSep = (2 * Math.PI) / this.nArms;
      const substeps = 2 + Math.floor(features.mid * 5);
      const dangle = ((0.04 + features.bass * 0.12) * this.direction) / substeps;
      let ci = this.colorIdx;
      for (let s = 0; s < substeps; s++) {
        this.angle += dangle;
        const armR = maxR * (0.55 + 0.45 * (Math.sin(this.pulse) * 0.5 + 0.5));
        for (let k = 0; k < this.nArms; k++) {
          const a = this.angle + k * armSep;
          const ca = Math.cos(a), sa = Math.sin(a);
          for (let r = 0; r < (armR | 0); r += 2) {
            const x = (this.cx + r * ca) | 0;
            const y = (this.cy + r * sa) | 0;
            if (x >= 0 && x < LOW_W && y >= 0 && y < LOW_H) lowBuf[y * LOW_W + x] = ci;
            else break;
          }
          ci = 1 + ((ci + 4) % 254);
        }
      }
      this.colorIdx = 1 + ((this.colorIdx + 1 + Math.floor(features.treble * 3)) % 254);
    }
  }
  class DazzleSweep3 {
    constructor() { this.reset(); }
    reset() {
      this.angle = Math.random() * Math.PI * 2;
      this.colorIdx = 1 + Math.floor(Math.random() * 254);
      this.cx = Math.floor(LOW_W / 2);
      this.cy = Math.floor(LOW_H / 2);
      this.dashOn = 6;
      this.dashOff = 3;
      this.direction = Math.random() < 0.5 ? 1 : -1;
      this.nArms = randChoice([1, 2, 4]);
    }
    step(features) {
      if (features.transient) {
        this.dashOn = 4 + Math.floor(Math.random() * 8);
        this.dashOff = 2 + Math.floor(Math.random() * 5);
        this.colorIdx = 1 + Math.floor(Math.random() * 254);
      }
      const maxR = Math.floor(Math.hypot(this.cx, this.cy));
      const substeps = 2 + Math.floor(features.bass * 5);
      const dangle = ((0.05 + features.mid * 0.1) * this.direction) / substeps;
      const armSep = (2 * Math.PI) / this.nArms;
      const stride = this.dashOn + this.dashOff;
      let ci = this.colorIdx;
      for (let s = 0; s < substeps; s++) {
        this.angle += dangle;
        for (let k = 0; k < this.nArms; k++) {
          const a = this.angle + k * armSep;
          const ca = Math.cos(a), sa = Math.sin(a);
          let r = 0;
          while (r < maxR) {
            for (let j = 0; j < this.dashOn; j++) {
              const rr = r + j;
              const x = (this.cx + rr * ca) | 0;
              const y = (this.cy + rr * sa) | 0;
              if (x >= 0 && x < LOW_W && y >= 0 && y < LOW_H) lowBuf[y * LOW_W + x] = ci;
            }
            r += stride;
            ci = 1 + ((ci + 5) % 254);
          }
        }
      }
      this.colorIdx = 1 + ((this.colorIdx + 1) % 254);
    }
  }
  class DazzleStreamer {
    constructor() { this.reset(); }
    reset() {
      this.x = Math.floor(Math.random() * LOW_W);
      this.y = Math.floor(Math.random() * LOW_H);
      this.vx = Math.random() * 6 - 3;
      this.vy = Math.random() * 4 - 2;
      this.colorIdx = 1 + Math.floor(Math.random() * 254);
    }
    step(features) {
      if (features.transient) {
        this.vx += Math.random() * 4 - 2;
        this.vy += Math.random() * 4 - 2;
      }
      const accel = 0.2 + features.bass * 2.0;
      this.vx += Math.random() * 2 * accel - accel;
      this.vy += Math.random() * 2 * accel - accel;
      this.vx *= 0.95;
      this.vy *= 0.95;
      const speed = 1 + Math.floor(features.rms * 5);
      for (let i = 0; i < speed * 4; i++) {
        const nx = this.x + this.vx;
        const ny = this.y + this.vy;
        drawLine(this.x | 0, this.y | 0, nx | 0, ny | 0, this.colorIdx);
        this.x = ((nx % LOW_W) + LOW_W) % LOW_W;
        this.y = ((ny % LOW_H) + LOW_H) % LOW_H;
        this.colorIdx = 1 + ((this.colorIdx + 1) % 254);
      }
    }
  }
  class DazzleAtom {
    constructor() { this.reset(); }
    reset() {
      this.phase = 0.0;
      this.colorIdx = 1 + Math.floor(Math.random() * 254);
      this.nOrbits = randChoice([3, 4, 5, 6]);
      this.tilts = Array.from({ length: this.nOrbits }, () => Math.random() * Math.PI);
      this.rx = 30 + Math.floor(Math.random() * 60);
      this.ry = 15 + Math.floor(Math.random() * 30);
      this.cx = Math.floor(LOW_W / 2);
      this.cy = Math.floor(LOW_H / 2);
    }
    step(features) {
      if (features.transient && Math.random() < 0.4) {
        this.tilts = Array.from({ length: this.nOrbits }, () => Math.random() * Math.PI);
        this.colorIdx = 1 + Math.floor(Math.random() * 254);
      }
      this.phase += 0.08 + features.bass * 0.3 + features.mid * 0.15;
      const rx = this.rx * (0.7 + features.rms * 0.8);
      const ry = this.ry * (0.7 + features.mid * 0.8);
      let ci = this.colorIdx;
      const samples = 80 + Math.floor(features.rms * 120);
      const dtheta = (2 * Math.PI) / samples;
      for (let k = 0; k < this.nOrbits; k++) {
        const cosR = Math.cos(this.tilts[k]), sinR = Math.sin(this.tilts[k]);
        let theta = 0.0;
        for (let i = 0; i < samples; i++) {
          const lx = rx * Math.cos(theta);
          const ly = ry * Math.sin(theta);
          const x = (this.cx + lx * cosR - ly * sinR) | 0;
          const y = (this.cy + lx * sinR + ly * cosR) | 0;
          if (x >= 0 && x < LOW_W && y >= 0 && y < LOW_H) lowBuf[y * LOW_W + x] = ci;
          theta += dtheta;
        }
        ci = 1 + ((ci + 9) % 254);
      }
      let ec = 1 + ((this.colorIdx + 40) % 254);
      for (let k = 0; k < this.nOrbits; k++) {
        const cosR = Math.cos(this.tilts[k]), sinR = Math.sin(this.tilts[k]);
        const a = this.phase * (1 + 0.3 * k) + k * 0.9;
        const lx = rx * Math.cos(a);
        const ly = ry * Math.sin(a);
        const x = (this.cx + lx * cosR - ly * sinR) | 0;
        const y = (this.cy + lx * sinR + ly * cosR) | 0;
        drawCircle(x, y, 2 + Math.floor(features.treble * 3), ec);
        ec = 1 + ((ec + 17) % 254);
      }
      drawCircle(this.cx, this.cy, 3 + Math.floor(features.bass * 6), ci);
      this.colorIdx = 1 + ((this.colorIdx + 1) % 254);
    }
  }
  class DazzlePuffs {
    constructor() { this.reset(); }
    reset() { this.colorIdx = 1 + Math.floor(Math.random() * 254); }
    step(features) {
      if (features.transient) this.colorIdx = 1 + Math.floor(Math.random() * 254);
      const puffCount = 1 + Math.floor(features.rms * 4 + features.mid * 3);
      const raysPerPuff = 6 + Math.floor(features.bass * 12);
      const radius = 8 + Math.floor(features.rms * 30);
      for (let p = 0; p < puffCount; p++) {
        const cx = Math.floor(Math.random() * LOW_W);
        const cy = Math.floor(Math.random() * LOW_H);
        const base = Math.random() * 2 * Math.PI;
        for (let k = 0; k < raysPerPuff; k++) {
          const ang = base + k * ((2 * Math.PI) / raysPerPuff);
          const ex = (cx + radius * Math.cos(ang)) | 0;
          const ey = (cy + radius * Math.sin(ang)) | 0;
          drawLine(cx, cy, ex, ey, this.colorIdx);
          this.colorIdx = 1 + ((this.colorIdx + 2) % 254);
        }
      }
    }
  }
  class DazzleWandering {
    constructor() { this.reset(); }
    reset() {
      this.x = Math.floor(LOW_W / 2);
      this.y = Math.floor(LOW_H / 2);
      this.colorIdx = 1 + Math.floor(Math.random() * 254);
      this.dirBias = [Math.random(), Math.random(), Math.random(), Math.random()];
      const s = this.dirBias[0] + this.dirBias[1] + this.dirBias[2] + this.dirBias[3];
      this.dirBias = this.dirBias.map(v => v / s);
    }
    pickDir() {
      const r = Math.random();
      let acc = 0;
      for (let i = 0; i < 4; i++) {
        acc += this.dirBias[i];
        if (r <= acc) return i;
      }
      return 3;
    }
    step(features) {
      if (features.transient) this.reset();
      const iters = 50 + Math.floor(features.bass * 400 + features.mid * 200);
      const stepSize = 1 + Math.floor(features.treble * 3);
      let x = this.x, y = this.y, ci = this.colorIdx;
      for (let i = 0; i < iters; i++) {
        const d = this.pickDir();
        if (d === 0) x += stepSize;
        else if (d === 1) x -= stepSize;
        else if (d === 2) y += stepSize;
        else y -= stepSize;
        x = ((x % LOW_W) + LOW_W) % LOW_W;
        y = ((y % LOW_H) + LOW_H) % LOW_H;
        lowBuf[y * LOW_W + x] = ci;
        ci = 1 + (ci % 254);
      }
      this.x = x; this.y = y; this.colorIdx = ci;
    }
  }
  class DazzleZigstream {
    constructor() { this.reset(); }
    reset() {
      this.x = Math.floor(Math.random() * LOW_W);
      this.y = Math.floor(Math.random() * LOW_H);
      this.heading = Math.random() * 2 * Math.PI;
      this.turnDir = Math.random() < 0.5 ? -1 : 1;
      this.drift = Math.random() * 0.04 - 0.02;
      this.colorIdx = 1 + Math.floor(Math.random() * 254);
    }
    step(features) {
      if (features.transient) {
        this.heading = Math.random() * 2 * Math.PI;
        this.drift = Math.random() * 0.06 - 0.03;
        this.colorIdx = 1 + Math.floor(Math.random() * 254);
      }
      this.heading += this.drift + features.mid * 0.02;
      const zigs = 10 + Math.floor(features.bass * 40 + features.rms * 30);
      const segLen = 4 + Math.floor(features.rms * 14);
      const turn = 1.5 + features.treble * 0.7;
      let ci = this.colorIdx;
      for (let i = 0; i < zigs; i++) {
        const a = this.heading + this.turnDir * turn;
        const nx = this.x + segLen * Math.cos(a);
        const ny = this.y + segLen * Math.sin(a);
        drawLine(this.x | 0, this.y | 0, nx | 0, ny | 0, ci);
        this.x = ((nx % LOW_W) + LOW_W) % LOW_W;
        this.y = ((ny % LOW_H) + LOW_H) % LOW_H;
        this.turnDir *= -1;
        this.heading += this.drift;
        ci = 1 + ((ci + 3) % 254);
      }
      this.colorIdx = 1 + ((this.colorIdx + 1) % 254);
    }
  }
  class DazzleLotsaDots {
    constructor() { this.colorIdx = 1; }
    reset() { this.colorIdx = 1 + Math.floor(Math.random() * 254); }
    step(features) {
      const count = 20 + Math.floor(features.rms * 600 + features.treble * 400);
      if (features.transient) this.colorIdx = 1 + Math.floor(Math.random() * 254);
      const bandWidth = 1 + Math.floor(features.mid * 20);
      for (let i = 0; i < count; i++) {
        const x = Math.floor(Math.random() * LOW_W);
        const y = Math.floor(Math.random() * LOW_H);
        const color = ((this.colorIdx + Math.floor(Math.random() * bandWidth)) % 254) + 1;
        lowBuf[y * LOW_W + x] = color;
      }
      this.colorIdx = 1 + ((this.colorIdx + 1 + Math.floor(features.bass * 5)) % 254);
    }
  }
  class DazzleLotsaDots2 {
    constructor() { this.reset(); }
    reset() {
      this.nClusters = randChoice([3, 4, 5, 6]);
      this.centers = Array.from({ length: this.nClusters }, () => [Math.random() * LOW_W, Math.random() * LOW_H]);
      this.vels = Array.from({ length: this.nClusters }, () => [Math.random() * 4 - 2, Math.random() * 4 - 2]);
      this.colorIdx = 1 + Math.floor(Math.random() * 254);
    }
    step(features) {
      if (features.transient) {
        for (let i = 0; i < this.nClusters; i++) {
          this.vels[i][0] += Math.random() * 6 - 3;
          this.vels[i][1] += Math.random() * 6 - 3;
        }
        this.colorIdx = 1 + Math.floor(Math.random() * 254);
      }
      const kick = 0.2 + features.bass * 1.5;
      for (let i = 0; i < this.nClusters; i++) {
        this.vels[i][0] = (this.vels[i][0] + (Math.random() * 2 - 1) * kick) * 0.93;
        this.vels[i][1] = (this.vels[i][1] + (Math.random() * 2 - 1) * kick) * 0.93;
        this.centers[i][0] = (this.centers[i][0] + this.vels[i][0] + LOW_W) % LOW_W;
        this.centers[i][1] = (this.centers[i][1] + this.vels[i][1] + LOW_H) % LOW_H;
      }
      const sigma = 6 + features.rms * 20;
      const perCluster = 20 + Math.floor(features.rms * 200 + features.treble * 200);
      let ci = this.colorIdx;
      for (let k = 0; k < this.nClusters; k++) {
        const cx = this.centers[k][0], cy = this.centers[k][1];
        for (let i = 0; i < perCluster; i++) {
          const x = Math.max(0, Math.min(LOW_W - 1, Math.floor(cx + (Math.random() * 2 - 1) * sigma)));
          const y = Math.max(0, Math.min(LOW_H - 1, Math.floor(cy + (Math.random() * 2 - 1) * sigma)));
          lowBuf[y * LOW_W + x] = ci;
        }
        ci = 1 + ((ci + 19) % 254);
      }
      this.colorIdx = 1 + ((this.colorIdx + 1 + Math.floor(features.mid * 3)) % 254);
    }
  }
  class DazzleFormula1 {
    constructor() { this.reset(); }
    reset() {
      this.theta = 0.0;
      this.colorIdx = 1 + Math.floor(Math.random() * 254);
      this.a = randChoice([2, 3, 4, 5]);
      this.b = randChoice([3, 4, 5, 7]);
      this.phi = Math.random() * Math.PI;
      this.cx = Math.floor(LOW_W / 2);
      this.cy = Math.floor(LOW_H / 2);
    }
    step(features) {
      if (features.transient) {
        this.a = randChoice([2, 3, 4, 5]);
        this.b = randChoice([3, 4, 5, 7]);
        this.phi = Math.random() * Math.PI;
        this.colorIdx = 1 + Math.floor(Math.random() * 254);
      }
      const samples = 200 + Math.floor(features.bass * 500 + features.mid * 250);
      const dtheta = 0.02 + features.treble * 0.06;
      const ax = (Math.floor(LOW_W / 2) - 10) * (0.6 + features.rms * 0.6);
      const ay = (Math.floor(LOW_H / 2) - 10) * (0.6 + features.rms * 0.6);
      let theta = this.theta;
      let ci = this.colorIdx;
      const phi = this.phi + features.mid * 0.8;
      for (let i = 0; i < samples; i++) {
        const x = (this.cx + ax * Math.sin(this.a * theta + phi)) | 0;
        const y = (this.cy + ay * Math.sin(this.b * theta)) | 0;
        if (x >= 0 && x < LOW_W && y >= 0 && y < LOW_H) lowBuf[y * LOW_W + x] = ci;
        theta += dtheta;
        ci = 1 + (ci % 254);
      }
      this.theta = theta;
      this.colorIdx = ci;
    }
  }
  class DazzleSpiral1 {
    constructor() { this.reset(); }
    reset() {
      this.theta = 0.0;
      this.colorIdx = 1 + Math.floor(Math.random() * 254);
      this.a = 1.2 + Math.random() * 1.8;
      this.b = 0.12 + Math.random() * 0.12;
      this.direction = Math.random() < 0.5 ? 1 : -1;
    }
    step(features) {
      if (features.transient && Math.random() < 0.3) {
        this.direction *= -1;
        this.colorIdx = 1 + Math.floor(Math.random() * 254);
      }
      const cx = Math.floor(LOW_W / 2), cy = Math.floor(LOW_H / 2);
      const steps = 80 + Math.floor(features.bass * 400 + features.mid * 250);
      const dtheta = 0.02 + features.treble * 0.05;
      const maxR = Math.min(cx, cy) - 2;
      const b = this.b * (0.8 + features.rms * 0.6);
      let theta = this.theta;
      let ci = this.colorIdx;
      for (let i = 0; i < steps; i++) {
        const r = this.a * Math.exp(b * theta);
        if (r > maxR) {
          theta = 0.0;
          ci = 1 + (ci % 254);
          continue;
        }
        const x = (cx + r * Math.cos(theta * this.direction)) | 0;
        const y = (cy + r * Math.sin(theta * this.direction)) | 0;
        if (x >= 0 && x < LOW_W && y >= 0 && y < LOW_H) lowBuf[y * LOW_W + x] = ci;
        theta += dtheta;
        ci = 1 + (ci % 254);
      }
      this.theta = theta;
      this.colorIdx = ci;
    }
  }
  const spiralPort = new DazzleSpiral();
  const hexagonPort = new DazzleHexagon();
  const tunnelPort = new DazzleTunnel();
  const sierpinskiPort = new DazzleSierpinski();
  const gridPort = new DazzleGrid();
  const linesPort = new DazzleLines();
  const barsPort = new DazzleBars();
  const sinePort = new DazzleSine();
  const boxesPort = new DazzleBoxes();
  const trianglesPort = new DazzleTriangles();
  const sweepPort = new DazzleSweep();
  const zigzagsPort = new DazzleZigzags();
  const diag1Port = new DazzleDiag1();
  const diag2Port = new DazzleDiag2();
  const diag3Port = new DazzleDiag3();
  const diag4Port = new DazzleDiag4();
  const ellipsePort = new DazzleEllipse();
  const curvesPort = new DazzleCurves();
  const pedalsPort = new DazzlePedals();
  const ribbonsPort = new DazzleRibbons();
  const squaresPort = new DazzleSquares();
  const sweep2Port = new DazzleSweep2();
  const sweep3Port = new DazzleSweep3();
  const streamerPort = new DazzleStreamer();
  const atomPort = new DazzleAtom();
  const puffsPort = new DazzlePuffs();
  const wanderingPort = new DazzleWandering();
  const zigstreamPort = new DazzleZigstream();
  const lotsadotsPort = new DazzleLotsaDots();
  const lotsadots2Port = new DazzleLotsaDots2();
  const formula1Port = new DazzleFormula1();
  const spiral1Port = new DazzleSpiral1();
  function synthFeatures(tt, n) {
    const bass = 0.5 + 0.5 * Math.sin(tt * 1.6);
    const mid = 0.5 + 0.5 * Math.sin(tt * 2.3 + 0.8);
    const treble = 0.5 + 0.5 * Math.sin(tt * 3.7 + 1.5);
    const rms = Math.min(1, 0.25 + 0.5 * bass + 0.25 * mid);
    const transient = (n % 18 === 0) || (treble > 0.93);
    return { bass, mid, treble, rms, transient };
  }
  function renderLowBufToCanvas(tt, srcBuf = lowBuf) {
    const d = lowImageData.data;
    for (let i = 0; i < lowBuf.length; i++) {
      const idx = srcBuf[i];
      const o = i * 4;
      if (idx === 0) {
        d[o] = 0; d[o + 1] = 0; d[o + 2] = 0; d[o + 3] = 255;
      } else {
        const c = idxColorToRgb(idx, tt);
        d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255;
      }
    }
    lowCtx.putImageData(lowImageData, 0, 0);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const srcAspect = LOW_W / LOW_H;
    const dstAspect = canvas.width / canvas.height;
    let dw, dh, dx, dy;
    if (dstAspect > srcAspect) {
      dh = canvas.height;
      dw = Math.round(dh * srcAspect);
      dx = Math.floor((canvas.width - dw) / 2);
      dy = 0;
    } else {
      dw = canvas.width;
      dh = Math.round(dw / srcAspect);
      dx = 0;
      dy = Math.floor((canvas.height - dh) / 2);
    }
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(lowImg, 0, 0, LOW_W, LOW_H, dx, dy, dw, dh);
    ctx.imageSmoothingEnabled = true;
  }
  function renderRgbBufToCanvas(srcRgb) {
    const d = lowImageData.data;
    for (let i = 0; i < lowBuf.length; i++) {
      const o = i * 4;
      d[o] = srcRgb[o];
      d[o + 1] = srcRgb[o + 1];
      d[o + 2] = srcRgb[o + 2];
      d[o + 3] = 255;
    }
    lowCtx.putImageData(lowImageData, 0, 0);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const srcAspect = LOW_W / LOW_H;
    const dstAspect = canvas.width / canvas.height;
    let dw, dh, dx, dy;
    if (dstAspect > srcAspect) {
      dh = canvas.height;
      dw = Math.round(dh * srcAspect);
      dx = Math.floor((canvas.width - dw) / 2);
      dy = 0;
    } else {
      dw = canvas.width;
      dh = Math.round(dw / srcAspect);
      dx = 0;
      dy = Math.floor((canvas.height - dh) / 2);
    }
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(lowImg, 0, 0, LOW_W, LOW_H, dx, dy, dw, dh);
    ctx.imageSmoothingEnabled = true;
  }

  function anchorPoint(anchor, availW, availH) {
    const parts = new Set(String(anchor || "center").split("-"));
    const x = parts.has("left") ? 0 : (parts.has("right") ? availW : Math.floor(availW / 2));
    const y = parts.has("top") ? 0 : (parts.has("bottom") ? availH : Math.floor(availH / 2));
    return [x, y];
  }
  function fittedBackgroundSize(img, fit) {
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    if (!iw || !ih) return [LOW_W, LOW_H];
    if (fit === "stretch") return [LOW_W, LOW_H];
    let scale = 1;
    if (fit === "native") scale = Math.min(1, LOW_W / iw, LOW_H / ih);
    else if (fit === "contain") scale = Math.min(LOW_W / iw, LOW_H / ih);
    else scale = Math.max(LOW_W / iw, LOW_H / ih);
    return [Math.max(1, Math.round(iw * scale)), Math.max(1, Math.round(ih * scale))];
  }
  function drawBackgroundPreviewToLowBuf() {
    const previewImage = currentBackgroundPreviewImage();
    if (!previewImage) return;
    bgCtx.clearRect(0, 0, LOW_W, LOW_H);
    bgCtx.imageSmoothingEnabled = true;
    if (backgroundConfig.tile) {
      const [tw, th] = fittedBackgroundSize(previewImage, "native");
      for (let y = 0; y < LOW_H; y += th) {
        for (let x = 0; x < LOW_W; x += tw) {
          bgCtx.drawImage(previewImage, x, y, tw, th);
        }
      }
    } else {
      const [dw, dh] = fittedBackgroundSize(previewImage, backgroundConfig.fit);
      const [dx, dy] = anchorPoint(backgroundConfig.anchor, LOW_W - dw, LOW_H - dh);
      bgCtx.drawImage(previewImage, dx, dy, dw, dh);
    }
    const data = bgCtx.getImageData(0, 0, LOW_W, LOW_H).data;
    const opacity = Math.max(0, Math.min(1, Number(backgroundConfig.opacity ?? 1)));
    for (let i = 0; i < lowBuf.length; i++) {
      const o = i * 4;
      const luma = Math.round(data[o] * 0.299 + data[o + 1] * 0.587 + data[o + 2] * 0.114);
      if (opacity >= 1) lowBuf[i] = luma;
      else if (opacity > 0) lowBuf[i] = Math.max(0, Math.min(255, Math.round(lowBuf[i] * (1 - opacity) + luma * opacity)));
    }
  }

  function drawSpiralFamily(seed) {
    // Base alignment to dazzle Spiral: Archimedean growth from center.
    ctx.fillStyle = "rgba(0,0,0,0.14)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const cx = canvas.width * 0.5;
    const cy = canvas.height * 0.5;
    const maxR = Math.min(cx, cy) - 2;
    const a = 0.6 + seed * 1.2;
    const dir = seed > 0.5 ? 1 : -1;
    const dtheta = 0.02 + seed * 0.05;
    const steps = 220;

    for (let i = 0; i < steps; i++) {
      const theta = (t * 2.0 + i) * dtheta;
      const r = a * theta;
      if (r > maxR) continue;
      const x = cx + r * Math.cos(theta * dir);
      const y = cy + r * Math.sin(theta * dir);
      const hue = (i * (1.2 + seed * 1.8) + t * 45) % 360;
      ctx.fillStyle = `hsl(${hue} 95% 62%)`;
      ctx.fillRect(x | 0, y | 0, 2, 2);
    }
  }

  function drawGridFamily(seed) {
    ctx.fillStyle = "rgba(3,5,10,0.3)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const cell = 26 + Math.round(seed * 24);
    const jitter = 10 + Math.round(seed * 24);
    for (let y = 0; y < canvas.height; y += cell) {
      const dx = Math.sin(y * 0.03 + t * (1.1 + seed * 0.8)) * jitter;
      for (let x = 0; x < canvas.width; x += cell) {
        const h = (x * 0.15 + y * 0.1 + t * (25 + seed * 25)) % 360;
        ctx.fillStyle = `hsla(${h},90%,60%,0.58)`;
        ctx.fillRect(x + dx, y, cell - 2, cell - 2);
      }
    }
  }

  function drawDotFamily(seed) {
    ctx.fillStyle = "rgba(0,0,0,0.16)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const cx = canvas.width / 2, cy = canvas.height / 2;
    const count = 700 + Math.floor(seed * 900);
    const dotSize = 1.5 + seed * 2;
    for (let i = 0; i < count; i++) {
      const a = i * 0.037 + t * (0.8 + seed * 0.8);
      const r = (i % 300) * (2.2 + seed);
      const x = cx + Math.cos(a + i * 0.01) * r;
      const y = cy + Math.sin(a * (1.05 + seed * 0.2) + i * 0.01) * r;
      const h = (i * 0.3 + t * (50 + seed * 30)) % 360;
      ctx.fillStyle = `hsla(${h},95%,65%,0.7)`;
      ctx.beginPath();
      ctx.arc(x, y, dotSize, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawPlasmaFamily(seed) {
    const w = canvas.width, h = canvas.height;
    const img = ctx.createImageData(w, h);
    const d = img.data;
    const scale = 16 + seed * 20;
    for (let y = 0; y < h; y += 2) {
      for (let x = 0; x < w; x += 2) {
        const v =
          Math.sin((x / scale) + t * (0.8 + seed * 0.7)) +
          Math.sin((y / (scale * 0.8)) - t * (1.0 + seed)) +
          Math.sin((x + y) / (scale * 1.2) + t * (0.5 + seed * 0.6));
        const n = Math.max(0, Math.min(1, (v / 3 + 0.5)));
        const c = hslToRgb(((n * 360 + t * (24 + seed * 30)) % 360) / 360, 0.95, 0.5);
        for (let oy = 0; oy < 2; oy++) for (let ox = 0; ox < 2; ox++) {
          const xx = x + ox, yy = y + oy;
          if (xx >= w || yy >= h) continue;
          const i = (yy * w + xx) * 4;
          d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
        }
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  function drawVisualById(id) {
    const f = synthFeatures(t, frameN);
    if (id === "spiral") {
      spiralPort.step(f);
      return;
    }
    if (id === "hexagon") {
      hexagonPort.step(f);
      return;
    }
    if (id === "tunnel") {
      tunnelPort.step(f);
      return;
    }
    if (id === "sierpinski") {
      sierpinskiPort.step(f);
      return;
    }
    if (id === "grid") {
      gridPort.step(f);
      return;
    }
    if (id === "lines") {
      linesPort.step(f);
      return;
    }
    if (id === "bars") {
      barsPort.step(f);
      return;
    }
    if (id === "sine") {
      sinePort.step(f);
      return;
    }
    if (id === "boxes") {
      boxesPort.step(f);
      return;
    }
    if (id === "triangles") {
      trianglesPort.step(f);
      return;
    }
    if (id === "sweep") {
      sweepPort.step(f);
      return;
    }
    if (id === "zigzags") {
      zigzagsPort.step(f);
      return;
    }
    if (id === "diag1") {
      diag1Port.step(f);
      return;
    }
    if (id === "diag2") {
      diag2Port.step(f);
      return;
    }
    if (id === "diag3") {
      diag3Port.step(f);
      return;
    }
    if (id === "diag4") {
      diag4Port.step(f);
      return;
    }
    if (id === "ellipse") {
      ellipsePort.step(f);
      return;
    }
    if (id === "curves") {
      curvesPort.step(f);
      return;
    }
    if (id === "pedals") {
      pedalsPort.step(f);
      return;
    }
    if (id === "ribbons") {
      ribbonsPort.step(f);
      return;
    }
    if (id === "squares") {
      squaresPort.step(f);
      return;
    }
    if (id === "sweep2") {
      sweep2Port.step(f);
      return;
    }
    if (id === "sweep3") {
      sweep3Port.step(f);
      return;
    }
    if (id === "streamer") {
      streamerPort.step(f);
      return;
    }
    if (id === "atom") {
      atomPort.step(f);
      return;
    }
    if (id === "puffs") {
      puffsPort.step(f);
      return;
    }
    if (id === "wandering") {
      wanderingPort.step(f);
      return;
    }
    if (id === "zigstream") {
      zigstreamPort.step(f);
      return;
    }
    if (id === "lotsadots") {
      lotsadotsPort.step(f);
      return;
    }
    if (id === "lotsadots2") {
      lotsadots2Port.step(f);
      return;
    }
    if (id === "formula1") {
      formula1Port.step(f);
      return;
    }
    if (id === "spiral1") {
      spiral1Port.step(f);
      return;
    }
    const seed = hash01(id || FALLBACK_VISUAL_IDS[0] || "seed");
    const family = VISUAL_FAMILY[id] || "plasma";
    if (family === "spiral") return drawSpiralFamily(seed);
    if (family === "grid") return drawGridFamily(seed);
    if (family === "dot") return drawDotFamily(seed);
    return drawPlasmaFamily(seed);
  }

  function seededRng(seed) {
    let s = (seed >>> 0) || 1;
    return () => {
      s = (1664525 * s + 1013904223) >>> 0;
      return s / 0x100000000;
    };
  }
  function applySelectedEffectToBuffer(effectId, src, frameIdx) {
    if (effectId === "__none__") return src;
    const H = LOW_H, W = LOW_W;
    const at = (b, x, y) => b[y * W + x];
    const out = new Uint8Array(src);

    if (effectId === "mirror_h") {
      const mid = Math.floor(W / 2);
      for (let y = 0; y < H; y++) for (let x = mid; x < W; x++) out[y * W + x] = out[y * W + (W - 1 - x)];
      return out;
    }
    if (effectId === "mirror_v") {
      const mid = Math.floor(H / 2);
      for (let y = mid; y < H; y++) for (let x = 0; x < W; x++) out[y * W + x] = out[(H - 1 - y) * W + x];
      return out;
    }
    if (effectId === "mirror_quad") {
      const mh = Math.floor(H / 2), mw = Math.floor(W / 2);
      for (let y = 0; y < mh; y++) for (let x = mw; x < W; x++) out[y * W + x] = out[y * W + (W - 1 - x)];
      for (let y = mh; y < H; y++) for (let x = 0; x < mw; x++) out[y * W + x] = out[(H - 1 - y) * W + x];
      for (let y = mh; y < H; y++) for (let x = mw; x < W; x++) out[y * W + x] = out[(H - 1 - y) * W + (W - 1 - x)];
      return out;
    }
    if (effectId === "mirror_diamond") {
      const s = Math.min(H, W);
      for (let y = 0; y < s; y++) {
        for (let x = 0; x < s; x++) {
          out[y * W + x] = (y <= x) ? src[y * W + x] : src[x * W + y];
        }
      }
      const mid = Math.floor(W / 2);
      for (let y = 0; y < H; y++) {
        for (let x = mid; x < W; x++) out[y * W + x] = out[y * W + (W - 1 - x)];
      }
      return out;
    }
    if (effectId === "radial" || effectId === "kaleidoscope") {
      const n = 6;
      const cy = H / 2, cx = W / 2;
      const wedge = (2 * Math.PI) / n;
      const res = new Uint8Array(src.length);
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const dy = y - cy, dx = x - cx;
          const r = Math.hypot(dx, dy);
          let a = Math.atan2(dy, dx);
          a = ((a % (2 * Math.PI)) + (2 * Math.PI)) % (2 * Math.PI);
          let folded = a % wedge;
          if (effectId === "kaleidoscope") {
            const wi = Math.floor(a / wedge);
            if ((wi % 2) === 1) folded = wedge - folded;
          }
          const sx = Math.max(0, Math.min(W - 1, Math.floor(cx + r * Math.cos(folded))));
          const sy = Math.max(0, Math.min(H - 1, Math.floor(cy + r * Math.sin(folded))));
          res[y * W + x] = src[sy * W + sx];
        }
      }
      return res;
    }
    if (effectId === "tile") {
      const nx = 2, ny = 2;
      const th = Math.floor(H / ny), tw = Math.floor(W / nx);
      if (th < 2 || tw < 2) return src;
      const cy = Math.floor(H / 2), cx = Math.floor(W / 2);
      const y0 = cy - Math.floor(th / 2), x0 = cx - Math.floor(tw / 2);
      const res = new Uint8Array(src.length);
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const py = y % th, px = x % tw;
          res[y * W + x] = src[(y0 + py) * W + (x0 + px)];
        }
      }
      return res;
    }
    if (effectId === "twist") {
      const amount = 0.8;
      const cy = H / 2, cx = W / 2;
      const maxR = Math.hypot(cy, cx);
      const res = new Uint8Array(src.length);
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const dy = y - cy, dx = x - cx;
          const r = Math.hypot(dx, dy);
          const a = Math.atan2(dy, dx);
          const na = a + amount * (1 - r / maxR);
          const sx = Math.max(0, Math.min(W - 1, Math.floor(cx + r * Math.cos(na))));
          const sy = Math.max(0, Math.min(H - 1, Math.floor(cy + r * Math.sin(na))));
          res[y * W + x] = src[sy * W + sx];
        }
      }
      return res;
    }
    if (effectId === "scroll") {
      const dx = Math.floor(frameIdx * 1.0) % W;
      const dy = Math.floor(frameIdx * 0.0) % H;
      const res = new Uint8Array(src.length);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const sx = (x - dx + W) % W;
        const sy = (y - dy + H) % H;
        res[y * W + x] = src[sy * W + sx];
      }
      return res;
    }
    if (effectId === "wave") {
      const res = new Uint8Array(src.length);
      const phase = frameIdx * 0.1;
      for (let y = 0; y < H; y++) {
        const dx = Math.floor(8.0 * Math.sin(0.04 * y + phase));
        for (let x = 0; x < W; x++) res[y * W + ((x + dx + W) % W)] = src[y * W + x];
      }
      return res;
    }
    if (effectId === "xor") {
      const dx = 10 + (Math.floor(frameIdx * 0.3) % 20);
      const dy = 5 + (Math.floor(frameIdx * 0.2) % 15);
      const mdx = ((dx % W) + W) % W;
      const mdy = ((dy % H) + H) % H;
      const shifted = new Uint8Array(src.length);
      for (let y = 0; y < H; y++) {
        const sy = (y - mdy + H) % H;
        for (let x = 0; x < W; x++) {
          const sx = (x - mdx + W) % W;
          shifted[y * W + x] = src[sy * W + sx];
        }
      }
      const res = new Uint8Array(src.length);
      for (let i = 0; i < src.length; i++) res[i] = src[i] ^ shifted[i];
      return res;
    }
    if (effectId === "drip") {
      const res = new Uint8Array(src.length);
      for (let x = 0; x < W; x++) {
        const drip = Math.floor(((Math.sin(x * 7.3 + 1.1 + frameIdx * 0.02) * 0.5 + 0.5) * 40));
        for (let y = 0; y < H; y++) res[y * W + x] = src[((y - drip + H) % H) * W + x];
      }
      return res;
    }
    if (effectId === "mesh") {
      for (let y = 0; y < H; y += 12) for (let x = 0; x < W; x++) out[y * W + x] = 0;
      for (let x = 0; x < W; x += 12) for (let y = 0; y < H; y++) out[y * W + x] = 0;
      return out;
    }
    if (effectId === "starburst") {
      const nRays = 16, thickness = 1;
      const cy = H / 2, cx = W / 2;
      const raySpacing = (2 * Math.PI) / nRays;
      const rayWidth = (thickness * raySpacing) / (2 * Math.PI);
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const a = Math.atan2(y - cy, x - cx);
          const am = ((a % raySpacing) + raySpacing) % raySpacing;
          if (am < rayWidth || am > raySpacing - rayWidth) out[y * W + x] = 0;
        }
      }
      return out;
    }
    if (effectId === "rectangles") {
      const nRects = 8;
      const rng = seededRng(Math.floor(frameIdx / 30) + 42);
      const res = new Uint8Array(src);
      for (let i = 0; i < nRects; i++) {
        const bh = 20 + Math.floor(rng() * (Math.max(21, Math.floor(H / 3)) - 20));
        const bw = 20 + Math.floor(rng() * (Math.max(21, Math.floor(W / 3)) - 20));
        const y1 = Math.floor(rng() * Math.max(1, H - bh));
        const x1 = Math.floor(rng() * Math.max(1, W - bw));
        const y2 = Math.floor(rng() * Math.max(1, H - bh));
        const x2 = Math.floor(rng() * Math.max(1, W - bw));
        for (let yy = 0; yy < bh; yy++) {
          for (let xx = 0; xx < bw; xx++) {
            const a = (y1 + yy) * W + (x1 + xx);
            const b = (y2 + yy) * W + (x2 + xx);
            const t2 = res[a]; res[a] = res[b]; res[b] = t2;
          }
        }
      }
      return res;
    }
    if (effectId === "spiral") {
      const tightness = 0.15;
      const cy = H / 2, cx = W / 2;
      const phase = frameIdx * 0.02;
      const res = new Uint8Array(src.length);
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const dy = y - cy, dx = x - cx;
          const r = Math.hypot(dx, dy);
          const a = Math.atan2(dy, dx);
          const na = a + tightness * Math.log(Math.max(r, 1)) + phase;
          const sx = Math.max(0, Math.min(W - 1, Math.floor(cx + r * Math.cos(na))));
          const sy = Math.max(0, Math.min(H - 1, Math.floor(cy + r * Math.sin(na))));
          res[y * W + x] = src[sy * W + sx];
        }
      }
      return res;
    }
    if (effectId === "wipe") {
      const direction = "left", speed = 2.0;
      const cycleLen = (direction === "left" || direction === "right") ? W : H;
      let pos = Math.floor(frameIdx * speed) % (cycleLen * 2);
      if (pos > cycleLen) pos = cycleLen * 2 - pos;
      if (direction === "left") {
        for (let y = 0; y < H; y++) for (let x = 0; x < pos; x++) out[y * W + x] = 0;
      } else if (direction === "right") {
        for (let y = 0; y < H; y++) for (let x = W - pos; x < W; x++) out[y * W + x] = 0;
      } else if (direction === "down") {
        for (let y = 0; y < pos; y++) for (let x = 0; x < W; x++) out[y * W + x] = 0;
      } else {
        for (let y = H - pos; y < H; y++) for (let x = 0; x < W; x++) out[y * W + x] = 0;
      }
      return out;
    }
    if (effectId === "movingbars") {
      const nBars = 6, barWidth = 8, direction = "horizontal";
      if (direction === "horizontal") {
        const spacing = Math.floor(H / Math.max(1, nBars));
        const offset = Math.floor(frameIdx * 0.5) % Math.max(1, spacing);
        for (let i = 0; i < nBars; i++) {
          const y = (i * spacing + offset) % H;
          const yEnd = Math.min(H, y + barWidth);
          for (let yy = y; yy < yEnd; yy++) for (let x = 0; x < W; x++) out[yy * W + x] = 0;
        }
      } else {
        const spacing = Math.floor(W / Math.max(1, nBars));
        const offset = Math.floor(frameIdx * 0.5) % Math.max(1, spacing);
        for (let i = 0; i < nBars; i++) {
          const x = (i * spacing + offset) % W;
          const xEnd = Math.min(W, x + barWidth);
          for (let xx = x; xx < xEnd; xx++) for (let y = 0; y < H; y++) out[y * W + xx] = 0;
        }
      }
      return out;
    }
    if (effectId === "linewipe") {
      const nLines = 10, speed = 1.0;
      const spacing = Math.max(1, Math.floor(H / nLines));
      for (let i = 0; i < nLines; i++) {
        const y = i * spacing;
        if (y >= H) break;
        let pos = Math.floor((frameIdx * speed + i * 17) % (W * 2));
        if (pos > W) pos = W * 2 - pos;
        const yEnd = Math.min(H, y + spacing);
        for (let yy = y; yy < yEnd; yy++) for (let x = 0; x < pos; x++) out[yy * W + x] = 0;
      }
      return out;
    }
    if (effectId === "randomize") {
      const blockSize = 20;
      const ny = Math.floor(H / blockSize), nx = Math.floor(W / blockSize);
      if (ny < 2 || nx < 2) return src;
      const rng = seededRng(Math.floor(frameIdx / 15) + 7);
      const blocks = [];
      for (let r = 0; r < ny; r++) for (let c = 0; c < nx; c++) blocks.push([r, c]);
      const shuffled = blocks.slice();
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        const tt = shuffled[i]; shuffled[i] = shuffled[j]; shuffled[j] = tt;
      }
      const res = new Uint8Array(src);
      for (let i = 0; i < blocks.length; i++) {
        const [r1, c1] = blocks[i];
        const [r2, c2] = shuffled[i];
        for (let yy = 0; yy < blockSize; yy++) for (let xx = 0; xx < blockSize; xx++) {
          const a = (r1 * blockSize + yy) * W + (c1 * blockSize + xx);
          const b = (r2 * blockSize + yy) * W + (c2 * blockSize + xx);
          res[a] = src[b];
        }
      }
      return res;
    }
    if (effectId === "blister") {
      const nBubbles = 5, maxRadius = 40;
      const rng = seededRng(Math.floor(frameIdx / 20) + 13);
      const res = new Uint8Array(src);
      for (let b = 0; b < nBubbles; b++) {
        const r = 15 + Math.floor(rng() * Math.max(1, maxRadius - 15));
        const cy = r + Math.floor(rng() * Math.max(1, H - 2 * r));
        const cx = r + Math.floor(rng() * Math.max(1, W - 2 * r));
        for (let yy = -r; yy < r; yy++) {
          for (let xx = -r; xx < r; xx++) {
            const dist = Math.hypot(xx, yy);
            if (dist >= r) continue;
            const factor = Math.pow(dist / Math.max(1, r), 1.8);
            const sy = Math.max(0, Math.min(H - 1, Math.floor(cy + yy * factor)));
            const sx = Math.max(0, Math.min(W - 1, Math.floor(cx + xx * factor)));
            const dy = cy + yy, dx = cx + xx;
            if (dy >= 0 && dy < H && dx >= 0 && dx < W) res[dy * W + dx] = src[sy * W + sx];
          }
        }
      }
      return res;
    }
    if (effectId === "firefly") {
      const res = new Uint8Array(src);
      const nFlies = 30, brightness = 200 % 256;
      for (let k = 0; k < nFlies; k++) {
        const phase = frameIdx * 0.02 + k * 2.7;
        const x = (Math.floor((Math.sin(phase * 0.3 + k) * 0.4 + 0.5) * W)) % W;
        const y = (Math.floor((Math.cos(phase * 0.4 + k * 1.3) * 0.4 + 0.5) * H)) % H;
        res[y * W + x] = brightness;
        if (y > 0) res[(y - 1) * W + x] = brightness;
        if (y < H - 1) res[(y + 1) * W + x] = brightness;
        if (x > 0) res[y * W + (x - 1)] = brightness;
        if (x < W - 1) res[y * W + (x + 1)] = brightness;
      }
      return res;
    }
    if (effectId === "umbra") {
      const cx = W / 2, cy = H / 2, maxd = Math.hypot(cx, cy);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const n = Math.pow(Math.hypot(x - cx, y - cy) / maxd, 1.5) * 0.7;
        out[y * W + x] = Math.max(0, Math.min(255, Math.floor(src[y * W + x] * (1 - n))));
      }
      return out;
    }
    if (effectId === "ziti") {
      const res = new Uint8Array(src.length);
      const cx = W / 2;
      const phase = frameIdx * 0.01;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const angle = ((x - cx) / cx) * (Math.PI * 0.3) + phase;
        const sx = Math.max(0, Math.min(W - 1, Math.floor(cx + (cx * Math.sin(angle)) / Math.max(0.1, Math.PI * 0.3))));
        res[y * W + x] = src[y * W + sx];
      }
      return res;
    }
    if (effectId === "tetrys") {
      const blockSize = 16;
      const res = new Uint8Array(src.length);
      const nCols = Math.floor(W / blockSize);
      for (let col = 0; col < nCols; col++) {
        const x0 = col * blockSize, x1 = Math.min(W, x0 + blockSize);
        const drop = Math.floor((frameIdx * (0.5 + col * 0.3)) % H);
        for (let x = x0; x < x1; x++) for (let y = 0; y < H; y++) res[y * W + x] = src[((y - drop + H) % H) * W + x];
      }
      for (let x = nCols * blockSize; x < W; x++) for (let y = 0; y < H; y++) res[y * W + x] = src[y * W + x];
      return res;
    }
    if (effectId === "juggle") {
      const mode = "shuffle";
      const map = new Uint8Array(256);
      for (let i = 0; i < 256; i++) map[i] = i;
      if (mode === "shuffle") {
        const rng = seededRng(Math.floor(frameIdx / 30) + 5);
        for (let i = 255; i > 1; i--) {
          const j = 1 + Math.floor(rng() * i);
          const tmp2 = map[i]; map[i] = map[j]; map[j] = tmp2;
        }
      } else if (mode === "invert") {
        for (let i = 1; i < 256; i++) {
          map[i] = (256 - i) % 256;
          if (map[i] === 0) map[i] = 1;
        }
      } else if (mode === "reverse") {
        for (let i = 1; i < 256; i++) map[i] = 256 - i;
      } else if (mode === "rotate") {
        const shift = (frameIdx * 3) % 255;
        for (let i = 1; i < 256; i++) map[i] = ((i - 1 + shift) % 255) + 1;
      }
      const res = new Uint8Array(src.length);
      for (let i = 0; i < src.length; i++) res[i] = map[src[i]];
      return res;
    }
    return src;
  }

  function blendWithAccumulation(layer, out, frameIdx) {
    const acc = layer.accumulate || {};
    if (!acc.enabled) {
      if (layer._state) layer._state.acc = null;
      return out;
    }
    if (!layer._state) layer._state = { acc: null, startFrame: frameIdx };
    const bleed = clamp01(acc.bleed);
    const resetSec = Number(acc.reset_sec);
    const resetFrames = resetSec > 0 ? Math.max(1, Math.floor(resetSec * 60)) : 0;
    if (!layer._state.acc || (resetFrames > 0 && frameIdx - layer._state.startFrame >= resetFrames)) {
      layer._state.acc = new Uint8Array(out);
      layer._state.startFrame = frameIdx;
      return out;
    }
    const mixed = new Uint8Array(out.length);
    for (let i = 0; i < out.length; i++) mixed[i] = Math.round(out[i] * (1 - bleed) + layer._state.acc[i] * bleed);
    layer._state.acc = mixed;
    return mixed;
  }

  function getHistoryBuffer(delayFrames) {
    if (!lowBufHistory.length) return null;
    const idx = lowBufHistory.length - 1 - Math.max(0, delayFrames);
    if (idx < 0 || idx >= lowBufHistory.length) return null;
    return lowBufHistory[idx];
  }

  function parseRgbCsv(s) {
    const parts = String(s || "").split(",").map((p) => Number(p.trim()));
    if (parts.length !== 3 || parts.some((v) => !Number.isFinite(v))) return [255, 0, 0];
    return parts.map((v) => Math.max(0, Math.min(255, Math.floor(v))));
  }

  function applyTearLayer(layer, src, frameIdx, layerIdx) {
    const p = layer.params || makeTearDefaults();
    const W = LOW_W, H = LOW_H;
    const out = new Uint8Array(src);
    const opacity = clamp01(p.opacity);
    const lengthPct = Math.max(0, Math.min(100, Number(p.length_pct) || 80));
    const thickPct = Math.max(0, Math.min(100, Number(p.thickness_pct) || 25));
    const countPct = Math.max(0, Math.min(100, Number(p.count_pct) || 5));
    const dispPct = Math.max(0, Math.min(100, Number(p.displace_max_pct) || 25));
    const delay = clampInt(p.delay_frames, 1, 120);
    const orientation = p.orientation === "vertical" ? "vertical" : "horizontal";
    const dir = p.displace_dir || "any";
    const shape = p.shape || "band";
    const edge = p.edge || "random";
    if (delay > 1 && (frameIdx % delay) !== 0) return blendWithAccumulation(layer, out, frameIdx);
    const sourceMode = p.source || "displace";
    const sourceBuf = sourceMode === "displace" ? src : null;
    const colorVal = parseRgbCsv(p.color);
    const activityPrev = getHistoryBuffer(1);
    let activity = 1.0;
    if (activityPrev && activityPrev.length === src.length) {
      let acc = 0;
      let n = 0;
      for (let i = 0; i < src.length; i += 16) {
        acc += Math.abs(src[i] - activityPrev[i]) / 255;
        n++;
      }
      activity = Math.max(0, Math.min(1, n ? acc / n : 1));
    }
    // In sim mode without real audio features, keep a floor so tear remains visible.
    activity = Math.max(0.55, activity);
    const countBaseAxis = shape === "band" ? (orientation === "horizontal" ? H : W) : Math.min(W, H);
    const count = Math.max(0, Math.floor(countBaseAxis * (countPct / 100) * activity));
    if (count <= 0) return blendWithAccumulation(layer, out, frameIdx);
    const rng = seededRng(frameIdx * 977 + layerIdx * 101 + 17);
    const signFromDir = () => {
      if (dir === "positive") return 1;
      if (dir === "negative") return -1;
      return rng() < 0.5 ? -1 : 1;
    };
    const fillPixel = (dstI, srcI) => {
      let sv = 0;
      if (sourceMode === "color") {
        sv = Math.round(colorVal[0] * 0.299 + colorVal[1] * 0.587 + colorVal[2] * 0.114);
      } else {
        sv = (sourceBuf || src)[srcI];
      }
      out[dstI] = Math.round(out[dstI] * (1 - opacity) + sv * opacity);
    };

    for (let i = 0; i < count; i++) {
      if (shape === "band") {
        if (orientation === "horizontal") {
          const bh = Math.max(1, Math.floor(H * (thickPct / 100) * activity * (0.5 + rng() * 0.5)));
          const bw = Math.max(1, Math.floor(W * (lengthPct / 100) * activity * (0.5 + rng() * 0.5)));
          const y0 = Math.floor(rng() * Math.max(1, H - bh));
          const x0 = edge === "start" ? 0 : (edge === "end" ? Math.max(0, W - bw) : Math.floor(rng() * Math.max(1, W - bw)));
          const maxDisp = Math.max(0, Math.floor(W * (dispPct / 100) * activity));
          const dx = Math.max(1, Math.floor(rng() * (maxDisp + 1))) * signFromDir();
          for (let y = y0; y < y0 + bh; y++) {
            for (let x = x0; x < x0 + bw; x++) {
              const sx = Math.max(0, Math.min(W - 1, x + dx));
              fillPixel(y * W + x, y * W + sx);
            }
          }
        } else {
          const bw = Math.max(1, Math.floor(W * (thickPct / 100) * activity * (0.5 + rng() * 0.5)));
          const bh = Math.max(1, Math.floor(H * (lengthPct / 100) * activity * (0.5 + rng() * 0.5)));
          const x0 = Math.floor(rng() * Math.max(1, W - bw));
          const y0 = edge === "start" ? 0 : (edge === "end" ? Math.max(0, H - bh) : Math.floor(rng() * Math.max(1, H - bh)));
          const maxDisp = Math.max(0, Math.floor(H * (dispPct / 100) * activity));
          const dy = Math.max(1, Math.floor(rng() * (maxDisp + 1))) * signFromDir();
          for (let y = y0; y < y0 + bh; y++) {
            for (let x = x0; x < x0 + bw; x++) {
              const sy = Math.max(0, Math.min(H - 1, y + dy));
              fillPixel(y * W + x, sy * W + x);
            }
          }
        }
      } else if (shape === "square") {
        const size = Math.max(2, Math.floor(Math.min(W, H) * (lengthPct / 100) * activity * (0.5 + rng() * 0.5)));
        const x0 = Math.floor(rng() * Math.max(1, W - size));
        const y0 = Math.floor(rng() * Math.max(1, H - size));
        const maxDx = Math.max(0, Math.floor(W * (dispPct / 100) * activity));
        const maxDy = Math.max(0, Math.floor(H * (dispPct / 100) * activity));
        const dx = Math.max(1, Math.floor(rng() * (maxDx + 1))) * signFromDir();
        const dy = Math.max(1, Math.floor(rng() * (maxDy + 1))) * signFromDir();
        for (let y = y0; y < y0 + size; y++) {
          for (let x = x0; x < x0 + size; x++) {
            const sx = Math.max(0, Math.min(W - 1, x + dx));
            const sy = Math.max(0, Math.min(H - 1, y + dy));
            fillPixel(y * W + x, sy * W + sx);
          }
        }
      } else {
        const r = Math.max(2, Math.floor(Math.min(W, H) * (lengthPct / 100) * activity * 0.5 * (0.5 + rng() * 0.5)));
        const cx = r + Math.floor(rng() * Math.max(1, W - r * 2));
        const cy = r + Math.floor(rng() * Math.max(1, H - r * 2));
        const maxDx = Math.max(0, Math.floor(W * (dispPct / 100) * activity));
        const maxDy = Math.max(0, Math.floor(H * (dispPct / 100) * activity));
        const dx = Math.max(1, Math.floor(rng() * (maxDx + 1))) * signFromDir();
        const dy = Math.max(1, Math.floor(rng() * (maxDy + 1))) * signFromDir();
        for (let y = cy - r; y <= cy + r; y++) {
          if (y < 0 || y >= H) continue;
          for (let x = cx - r; x <= cx + r; x++) {
            if (x < 0 || x >= W) continue;
            const ddx = x - cx;
            const ddy = y - cy;
            if ((ddx * ddx + ddy * ddy) > r * r) continue;
            const sx = Math.max(0, Math.min(W - 1, x + dx));
            const sy = Math.max(0, Math.min(H - 1, y + dy));
            fillPixel(y * W + x, sy * W + sx);
          }
        }
      }
    }
    return blendWithAccumulation(layer, out, frameIdx);
  }

  function applyChromaticLayer(layer, src, frameIdx) {
    const p = layer.params || makeChromaticDefaults();
    const W = LOW_W, H = LOW_H;
    const out = new Uint8Array(src.length);
    const amount = Math.max(0, Number(p.amount) || 16.0);
    const dir = p.direction || "circular";
    const audioScale = clamp01(p.audio_scale);
    const prev = getHistoryBuffer(1);
    let activity = 1.0;
    if (prev && prev.length === src.length) {
      let acc = 0;
      let n = 0;
      for (let i = 0; i < src.length; i += 16) {
        acc += Math.abs(src[i] - prev[i]) / 255;
        n++;
      }
      activity = Math.max(0, Math.min(1, n ? acc / n : 1));
    }
    activity = Math.max(0.45, activity);
    const intensity = (1.0 - audioScale) + audioScale * activity;
    const amp = amount * intensity;
    const phase = frameIdx * (0.12 + activity * 0.18);
    let dx = 0;
    let dy = 0;
    if (dir === "horizontal") {
      dx = Math.round(amp * Math.cos(phase));
      dy = 0;
    } else if (dir === "vertical") {
      dx = 0;
      dy = Math.round(amp * Math.cos(phase));
    } else {
      dx = Math.round(amp * Math.cos(phase));
      dy = Math.round(amp * Math.sin(phase) * 0.5);
    }
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        const rx = (x + dx + W) % W;
        const ry = (y + dy + H) % H;
        const bx = (x - dx + W) % W;
        const by = (y - dy + H) % H;
        const r = src[ry * W + rx];
        const g = src[i];
        const b = src[by * W + bx];
        out[i] = Math.round((r + g + b) / 3);
      }
    }
    return blendWithAccumulation(layer, out, frameIdx);
  }

  function applyNoiseLayer(layer, src, frameIdx, layerIdx) {
    const p = layer.params || makeNoiseDefaults();
    const amount = Math.max(0, Number(p.amount) || 15.0);
    const type = p.type === "uniform" ? "uniform" : "gaussian";
    const mono = p.mono !== false;
    const audioScale = clamp01(p.audio_scale);
    const out = new Uint8Array(src.length);
    const rng = seededRng(frameIdx * 19937 + layerIdx * 733 + 11);
    const prev = getHistoryBuffer(1);
    let activity = 1.0;
    if (prev && prev.length === src.length) {
      let acc = 0;
      let n = 0;
      for (let i = 0; i < src.length; i += 16) {
        acc += Math.abs(src[i] - prev[i]) / 255;
        n++;
      }
      activity = Math.max(0, Math.min(1, n ? acc / n : 1));
    }
    activity = Math.max(0.4, activity);
    const intensity = (1.0 - audioScale) + audioScale * activity;
    const amp = amount * intensity;
    if (amp < 0.5) return blendWithAccumulation(layer, new Uint8Array(src), frameIdx);
    const gauss = () => {
      const u1 = Math.max(1e-6, rng());
      const u2 = Math.max(1e-6, rng());
      return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    };
    const span = amp;
    for (let i = 0; i < src.length; i++) {
      const base = src[i];
      const n = type === "uniform" ? ((rng() * 2 - 1) * span) : gauss() * span;
      const n2 = mono ? n : (type === "uniform" ? ((rng() * 2 - 1) * span) : gauss() * span);
      const noisy = Math.max(0, Math.min(255, Math.round(base + (mono ? n : (n * 0.5 + n2 * 0.5)))));
      out[i] = noisy;
    }
    return blendWithAccumulation(layer, out, frameIdx);
  }

  function applyWarpLayer(layer, src, frameIdx) {
    const p = layer.params || makeWarpDefaults();
    const W = LOW_W;
    const H = LOW_H;
    const out = new Uint8Array(src);
    const ampPx = Math.max(0, Number(p.amplitude_px) || 20.0);
    const freq = Number.isFinite(Number(p.frequency)) ? Number(p.frequency) : 0.02;
    const speed = Number.isFinite(Number(p.speed)) ? Number(p.speed) : 3.0;
    const audioScale = clamp01(p.audio_scale);
    const dir = p.direction || "horizontal";

    const prev = getHistoryBuffer(1);
    let activity = 1.0;
    if (prev && prev.length === src.length) {
      let acc = 0;
      let n = 0;
      for (let i = 0; i < src.length; i += 16) {
        acc += Math.abs(src[i] - prev[i]) / 255;
        n++;
      }
      activity = Math.max(0, Math.min(1, n ? acc / n : 1));
    }
    activity = Math.max(0.45, activity);
    const phase = frameIdx * speed * 0.03 * (1.0 + 0.5 * activity);
    const intensity = (1.0 - audioScale) + audioScale * activity;
    const amp = ampPx * intensity;
    if (amp < 1.0) return blendWithAccumulation(layer, out, frameIdx);

    if (dir === "horizontal" || dir === "both") {
      const shifted = new Uint8Array(out);
      for (let y = 0; y < H; y++) {
        const dx = Math.round(amp * Math.sin(freq * y + phase));
        if (!dx) continue;
        for (let x = 0; x < W; x++) {
          const sx = (x - dx + W) % W;
          shifted[y * W + x] = out[y * W + sx];
        }
      }
      out.set(shifted);
    }
    if (dir === "vertical" || dir === "both") {
      const shifted = new Uint8Array(out);
      for (let x = 0; x < W; x++) {
        const dy = Math.round(amp * Math.sin(freq * x + phase * 1.1));
        if (!dy) continue;
        for (let y = 0; y < H; y++) {
          const sy = (y - dy + H) % H;
          shifted[y * W + x] = out[sy * W + x];
        }
      }
      out.set(shifted);
    }
    return blendWithAccumulation(layer, out, frameIdx);
  }

  function applySlitscanLayer(layer, src, frameIdx) {
    const p = layer.params || makeSlitscanDefaults();
    const W = LOW_W;
    const H = LOW_H;
    const out = new Uint8Array(src);
    const maxDelay = clampInt(p.max_delay_frames, 1, 120);
    const audioScale = clamp01(p.audio_scale);
    const direction = p.direction === "vertical" ? "vertical" : "horizontal";
    if (lowBufHistory.length === 0) {
      return blendWithAccumulation(layer, out, frameIdx);
    }
    const prev = getHistoryBuffer(1);
    let activity = 1.0;
    if (prev && prev.length === src.length) {
      let acc = 0;
      let n = 0;
      for (let i = 0; i < src.length; i += 16) {
        acc += Math.abs(src[i] - prev[i]) / 255;
        n++;
      }
      activity = Math.max(0, Math.min(1, n ? acc / n : 1));
    }
    activity = Math.max(0.4, activity);
    const intensity = (1.0 - audioScale) + audioScale * activity;
    let effectiveDelay = Math.floor(maxDelay * intensity);
    effectiveDelay = Math.max(0, Math.min(effectiveDelay, lowBufHistory.length - 1));
    if (effectiveDelay <= 0) return blendWithAccumulation(layer, out, frameIdx);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const axisPos = direction === "horizontal"
          ? (y / Math.max(1, H - 1))
          : (x / Math.max(1, W - 1));
        const delay = Math.round(axisPos * effectiveDelay);
        const hist = getHistoryBuffer(delay) || src;
        const i = y * W + x;
        out[i] = hist[i];
      }
    }
    return blendWithAccumulation(layer, out, frameIdx);
  }

  function applyPixelSortLayer(layer, src, frameIdx) {
    const p = layer.params || makePixelSortDefaults();
    const W = LOW_W;
    const H = LOW_H;
    const out = new Uint8Array(src);
    const sortBy = p.sort_by || "brightness";
    const low = clamp01(p.lower_threshold);
    const high = clamp01(p.upper_threshold);
    const audioScale = clamp01(p.audio_scale);
    const reverse = !!p.reverse;
    const direction = p.direction || "horizontal";
    const angle = clampInt(p.angle, 0, 359);
    let activity = 1.0;
    const prev = getHistoryBuffer(1);
    if (prev && prev.length === src.length) {
      let acc = 0;
      const stride = 16;
      let n = 0;
      for (let i = 0; i < src.length; i += stride) {
        acc += Math.abs(src[i] - prev[i]) / 255;
        n++;
      }
      activity = Math.max(0, Math.min(1, n ? acc / n : 1));
    }
    const mid = (low + high) * 0.5;
    const shrink = 1.0 - audioScale * (1.0 - activity);
    const half = (high - low) * 0.5 * shrink;
    const lo = Math.max(0, mid - half);
    const hi = Math.min(1, mid + half);

    const sampleRotated = (x, y) => {
      if (angle === 0) return src[y * W + x];
      const cx = (W - 1) * 0.5;
      const cy = (H - 1) * 0.5;
      const a = (angle * Math.PI) / 180;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      const dx = x - cx;
      const dy = y - cy;
      const sx = Math.round(cx + dx * ca - dy * sa);
      const sy = Math.round(cy + dx * sa + dy * ca);
      if (sx < 0 || sx >= W || sy < 0 || sy >= H) return 0;
      return src[sy * W + sx];
    };
    const valueAt = (x, y) => idxMetric(sampleRotated(x, y), sortBy);

    const sortRun = (coords, values) => {
      if (coords.length < 2) return;
      const pairs = coords.map((ci, i) => ({ ci, v: values[i], px: out[ci] }));
      pairs.sort((a, b) => reverse ? (a.v - b.v) : (b.v - a.v));
      for (let i = 0; i < coords.length; i++) {
        const ci = coords[i];
        out[ci] = pairs[i].px;
      }
    };

    const runHorizontal = direction === "horizontal" || direction === "both";
    const runVertical = direction === "vertical" || direction === "both";
    if (runHorizontal) {
      for (let y = 0; y < H; y++) {
        let run = [];
        let vals = [];
        for (let x = 0; x < W; x++) {
          const i = y * W + x;
          const v = valueAt(x, y);
          if (v >= lo && v <= hi) { run.push(i); vals.push(v); }
          else { sortRun(run, vals); run = []; vals = []; }
        }
        sortRun(run, vals);
      }
    }
    if (runVertical) {
      for (let x = 0; x < W; x++) {
        let run = [];
        let vals = [];
        for (let y = 0; y < H; y++) {
          const i = y * W + x;
          const v = valueAt(x, y);
          if (v >= lo && v <= hi) { run.push(i); vals.push(v); }
          else { sortRun(run, vals); run = []; vals = []; }
        }
        sortRun(run, vals);
      }
    }
    return blendWithAccumulation(layer, out, frameIdx);
  }

  function applyPixelScrambleLayer(layer, src, frameIdx, layerIdx) {
    const p = layer.params || makePixelScrambleDefaults();
    const W = LOW_W;
    const H = LOW_H;
    const out = new Uint8Array(src);
    const delay = clampInt(p.delay_frames, 1, 120);
    if (delay > 1 && (frameIdx % delay) !== 0) return blendWithAccumulation(layer, out, frameIdx);

    const prev = getHistoryBuffer(1);
    let activity = 1.0;
    if (prev && prev.length === src.length) {
      let acc = 0;
      let n = 0;
      for (let i = 0; i < src.length; i += 16) {
        acc += Math.abs(src[i] - prev[i]) / 255;
        n++;
      }
      activity = Math.max(0, Math.min(1, n ? acc / n : 1));
    }
    activity = Math.max(0.45, activity);

    const countPct = Math.max(0, Math.min(100, Number(p.count_pct) || 3.0));
    const sizePct = Math.max(0, Math.min(100, Number(p.size_pct) || 15.0));
    const bandLengthPct = Math.max(1, Math.min(100, Number(p.band_length_pct) || 100.0));
    const shape = p.shape || "rectangle";
    const orientation = p.orientation === "vertical" ? "vertical" : "horizontal";
    const count = Math.max(0, Math.floor(H * (countPct / 100) * activity));
    const maxSize = Math.floor(Math.min(H, W) * (sizePct / 100) * activity);
    if (count <= 0 || maxSize < 4) return blendWithAccumulation(layer, out, frameIdx);

    const rng = seededRng(frameIdx * 131071 + layerIdx * 127 + 29);
    const shuffle = (arr) => {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        const t = arr[i];
        arr[i] = arr[j];
        arr[j] = t;
      }
    };
    const writeScrambled = (coords) => {
      if (coords.length < 2) return;
      const vals = coords.map((ci) => out[ci]);
      shuffle(vals);
      for (let i = 0; i < coords.length; i++) out[coords[i]] = vals[i];
    };

    for (let b = 0; b < count; b++) {
      if (shape === "rectangle") {
        const bh = Math.max(4, Math.floor(rng() * maxSize));
        const bw = Math.max(4, Math.floor(rng() * maxSize));
        const y0 = Math.floor(rng() * Math.max(1, H - bh));
        const x0 = Math.floor(rng() * Math.max(1, W - bw));
        const coords = [];
        for (let y = y0; y < y0 + bh; y++) for (let x = x0; x < x0 + bw; x++) coords.push(y * W + x);
        writeScrambled(coords);
      } else if (shape === "square") {
        const s = Math.max(4, Math.floor(rng() * maxSize));
        const y0 = Math.floor(rng() * Math.max(1, H - s));
        const x0 = Math.floor(rng() * Math.max(1, W - s));
        const coords = [];
        for (let y = y0; y < y0 + s; y++) for (let x = x0; x < x0 + s; x++) coords.push(y * W + x);
        writeScrambled(coords);
      } else if (shape === "band") {
        const thickness = Math.max(4, Math.floor(rng() * maxSize));
        if (orientation === "horizontal") {
          const y0 = Math.floor(rng() * Math.max(1, H - thickness));
          const length = bandLengthPct >= 100 ? W : Math.max(4, Math.floor(W * bandLengthPct / 100));
          const x0 = bandLengthPct >= 100 ? 0 : Math.floor(rng() * Math.max(1, W - length));
          const coords = [];
          for (let y = y0; y < y0 + thickness; y++) for (let x = x0; x < x0 + length; x++) coords.push(y * W + x);
          writeScrambled(coords);
        } else {
          const x0 = Math.floor(rng() * Math.max(1, W - thickness));
          const length = bandLengthPct >= 100 ? H : Math.max(4, Math.floor(H * bandLengthPct / 100));
          const y0 = bandLengthPct >= 100 ? 0 : Math.floor(rng() * Math.max(1, H - length));
          const coords = [];
          for (let y = y0; y < y0 + length; y++) for (let x = x0; x < x0 + thickness; x++) coords.push(y * W + x);
          writeScrambled(coords);
        }
      } else {
        const r = Math.max(2, Math.floor(rng() * Math.max(3, Math.floor(maxSize / 2))));
        const cy = r + Math.floor(rng() * Math.max(1, H - 2 * r));
        const cx = r + Math.floor(rng() * Math.max(1, W - 2 * r));
        const coords = [];
        for (let y = cy - r; y <= cy + r; y++) {
          if (y < 0 || y >= H) continue;
          for (let x = cx - r; x <= cx + r; x++) {
            if (x < 0 || x >= W) continue;
            const dx = x - cx;
            const dy = y - cy;
            if (dx * dx + dy * dy <= r * r) coords.push(y * W + x);
          }
        }
        writeScrambled(coords);
      }
    }
    return blendWithAccumulation(layer, out, frameIdx);
  }

  function applyJpegCorruptLayer(layer, src, frameIdx, layerIdx) {
    const p = layer.params || makeJpegCorruptDefaults();
    const W = LOW_W;
    const H = LOW_H;
    const out = new Uint8Array(src);
    const delay = clampInt(p.delay_frames, 1, 120);
    if (delay > 1 && (frameIdx % delay) !== 0) return blendWithAccumulation(layer, out, frameIdx);

    const prev = getHistoryBuffer(1);
    let activity = 1.0;
    if (prev && prev.length === src.length) {
      let acc = 0;
      let n = 0;
      for (let i = 0; i < src.length; i += 16) {
        acc += Math.abs(src[i] - prev[i]) / 255;
        n++;
      }
      activity = Math.max(0, Math.min(1, n ? acc / n : 1));
    }
    activity = Math.max(0.45, activity);

    const countPct = Math.max(0, Math.min(100, Number(p.count_pct) || 3.0));
    const sizePct = Math.max(0, Math.min(100, Number(p.size_pct) || 20.0));
    const quality = clampInt(p.quality, 1, 100);
    const bandLengthPct = Math.max(1, Math.min(100, Number(p.band_length_pct) || 100.0));
    const shape = p.shape || "rectangle";
    const orientation = p.orientation === "vertical" ? "vertical" : "horizontal";
    const count = Math.max(0, Math.floor(H * (countPct / 100) * activity));
    const maxSize = Math.max(16, Math.floor(Math.min(H, W) * (sizePct / 100) * activity));
    if (count <= 0 || maxSize < 8) return blendWithAccumulation(layer, out, frameIdx);

    const rng = seededRng(frameIdx * 114007 + layerIdx * 149 + 7);
    const artifactizeBlock = (coords) => {
      if (coords.length < 64) return;
      const vals = coords.map((ci) => out[ci]);
      const qFactor = (101 - quality) / 100;
      const levels = Math.max(2, Math.floor(64 - qFactor * 56));
      const quant = (v) => Math.round((Math.round((v / 255) * (levels - 1)) / (levels - 1)) * 255);
      for (let i = 0; i < vals.length; i++) vals[i] = quant(vals[i]);
      const copy = vals.slice();
      const chunk = Math.max(2, Math.floor(4 + qFactor * 12));
      for (let i = 0; i < copy.length; i += chunk) {
        const end = Math.min(copy.length, i + chunk);
        let avg = 0;
        for (let j = i; j < end; j++) avg += copy[j];
        avg = Math.round(avg / Math.max(1, end - i));
        for (let j = i; j < end; j++) copy[j] = Math.round(copy[j] * (1 - qFactor * 0.7) + avg * (qFactor * 0.7));
      }
      for (let i = 0; i < coords.length; i++) out[coords[i]] = copy[i];
    };

    for (let b = 0; b < count; b++) {
      if (shape === "rectangle") {
        const bh = Math.max(8, Math.floor(rng() * maxSize));
        const bw = Math.max(8, Math.floor(rng() * maxSize));
        const y0 = Math.floor(rng() * Math.max(1, H - bh));
        const x0 = Math.floor(rng() * Math.max(1, W - bw));
        const coords = [];
        for (let y = y0; y < y0 + bh; y++) for (let x = x0; x < x0 + bw; x++) coords.push(y * W + x);
        artifactizeBlock(coords);
      } else if (shape === "square") {
        const s = Math.max(8, Math.floor(rng() * maxSize));
        const y0 = Math.floor(rng() * Math.max(1, H - s));
        const x0 = Math.floor(rng() * Math.max(1, W - s));
        const coords = [];
        for (let y = y0; y < y0 + s; y++) for (let x = x0; x < x0 + s; x++) coords.push(y * W + x);
        artifactizeBlock(coords);
      } else if (shape === "band") {
        const thickness = Math.max(8, Math.floor(rng() * maxSize));
        if (orientation === "horizontal") {
          const y0 = Math.floor(rng() * Math.max(1, H - thickness));
          const length = bandLengthPct >= 100 ? W : Math.max(8, Math.floor(W * bandLengthPct / 100));
          const x0 = bandLengthPct >= 100 ? 0 : Math.floor(rng() * Math.max(1, W - length));
          const coords = [];
          for (let y = y0; y < y0 + thickness; y++) for (let x = x0; x < x0 + length; x++) coords.push(y * W + x);
          artifactizeBlock(coords);
        } else {
          const x0 = Math.floor(rng() * Math.max(1, W - thickness));
          const length = bandLengthPct >= 100 ? H : Math.max(8, Math.floor(H * bandLengthPct / 100));
          const y0 = bandLengthPct >= 100 ? 0 : Math.floor(rng() * Math.max(1, H - length));
          const coords = [];
          for (let y = y0; y < y0 + length; y++) for (let x = x0; x < x0 + thickness; x++) coords.push(y * W + x);
          artifactizeBlock(coords);
        }
      } else {
        const r = Math.max(4, Math.floor(rng() * Math.max(5, Math.floor(maxSize / 2))));
        const cy = r + Math.floor(rng() * Math.max(1, H - 2 * r));
        const cx = r + Math.floor(rng() * Math.max(1, W - 2 * r));
        const coords = [];
        for (let y = cy - r; y <= cy + r; y++) {
          if (y < 0 || y >= H) continue;
          for (let x = cx - r; x <= cx + r; x++) {
            if (x < 0 || x >= W) continue;
            const dx = x - cx;
            const dy = y - cy;
            if (dx * dx + dy * dy <= r * r) coords.push(y * W + x);
          }
        }
        artifactizeBlock(coords);
      }
    }
    return blendWithAccumulation(layer, out, frameIdx);
  }

  function applyChannelSwapLayer(layer, src, frameIdx, layerIdx) {
    const p = layer.params || makeChannelSwapDefaults();
    const W = LOW_W;
    const H = LOW_H;
    const out = new Uint8Array(src);
    const delay = clampInt(p.delay_frames, 1, 120);
    if (delay > 1 && (frameIdx % delay) !== 0) return blendWithAccumulation(layer, out, frameIdx);
    const mode = p.mode || "random";
    const audioScale = clamp01(p.audio_scale);
    const shape = p.shape || "rectangle";
    const orientation = p.orientation === "vertical" ? "vertical" : "horizontal";
    const bandLengthPct = Math.max(1, Math.min(100, Number(p.band_length_pct) || 100.0));
    const countPct = Math.max(0, Math.min(100, Number(p.count_pct) || 5.0));
    const sizePct = Math.max(0, Math.min(100, Number(p.size_pct) || 15.0));

    const prev = getHistoryBuffer(1);
    let activity = 1.0;
    if (prev && prev.length === src.length) {
      let acc = 0;
      let n = 0;
      for (let i = 0; i < src.length; i += 16) {
        acc += Math.abs(src[i] - prev[i]) / 255;
        n++;
      }
      activity = Math.max(0, Math.min(1, n ? acc / n : 1));
    }
    activity = Math.max(0.45, activity);
    const intensity = (1.0 - audioScale) + audioScale * activity;
    const count = Math.max(0, Math.floor(H * (countPct / 100) * intensity));
    const maxSize = Math.floor(Math.min(H, W) * (sizePct / 100) * intensity);
    if (count <= 0 || maxSize < 4) return blendWithAccumulation(layer, out, frameIdx);

    const perms = { rb: [2, 1, 0], rg: [1, 0, 2], gb: [0, 2, 1], rotate: [1, 2, 0] };
    const modes = ["rb", "rg", "gb", "rotate"];
    const rng = seededRng(frameIdx * 8191 + layerIdx * 97 + 5);
    const applyPerm = (coords, perm) => {
      if (!coords.length) return;
      for (let i = 0; i < coords.length; i++) {
        const ci = coords[i];
        const [r, g, b] = idxColorToRgb(out[ci], 0);
        const c = [r, g, b];
        const rr = c[perm[0]];
        const gg = c[perm[1]];
        const bb = c[perm[2]];
        // Collapse back into palette index domain via luminance proxy.
        const y = Math.round((0.299 * rr + 0.587 * gg + 0.114 * bb));
        out[ci] = Math.max(1, Math.min(255, y));
      }
    };

    for (let bidx = 0; bidx < count; bidx++) {
      const useMode = mode === "random" ? modes[Math.floor(rng() * modes.length)] : mode;
      const perm = perms[useMode] || perms.rb;
      const coords = [];
      if (shape === "rectangle") {
        const bh = Math.max(4, Math.floor(rng() * maxSize));
        const bw = Math.max(4, Math.floor(rng() * maxSize));
        const y0 = Math.floor(rng() * Math.max(1, H - bh));
        const x0 = Math.floor(rng() * Math.max(1, W - bw));
        for (let y = y0; y < y0 + bh; y++) for (let x = x0; x < x0 + bw; x++) coords.push(y * W + x);
      } else if (shape === "square") {
        const s = Math.max(4, Math.floor(rng() * maxSize));
        const y0 = Math.floor(rng() * Math.max(1, H - s));
        const x0 = Math.floor(rng() * Math.max(1, W - s));
        for (let y = y0; y < y0 + s; y++) for (let x = x0; x < x0 + s; x++) coords.push(y * W + x);
      } else if (shape === "band") {
        const thickness = Math.max(4, Math.floor(rng() * maxSize));
        if (orientation === "horizontal") {
          const y0 = Math.floor(rng() * Math.max(1, H - thickness));
          const length = bandLengthPct >= 100 ? W : Math.max(4, Math.floor(W * bandLengthPct / 100));
          const x0 = bandLengthPct >= 100 ? 0 : Math.floor(rng() * Math.max(1, W - length));
          for (let y = y0; y < y0 + thickness; y++) for (let x = x0; x < x0 + length; x++) coords.push(y * W + x);
        } else {
          const x0 = Math.floor(rng() * Math.max(1, W - thickness));
          const length = bandLengthPct >= 100 ? H : Math.max(4, Math.floor(H * bandLengthPct / 100));
          const y0 = bandLengthPct >= 100 ? 0 : Math.floor(rng() * Math.max(1, H - length));
          for (let y = y0; y < y0 + length; y++) for (let x = x0; x < x0 + thickness; x++) coords.push(y * W + x);
        }
      } else {
        const r = Math.max(2, Math.floor(rng() * Math.max(3, Math.floor(maxSize / 2))));
        const cy = r + Math.floor(rng() * Math.max(1, H - 2 * r));
        const cx = r + Math.floor(rng() * Math.max(1, W - 2 * r));
        for (let y = cy - r; y <= cy + r; y++) {
          if (y < 0 || y >= H) continue;
          for (let x = cx - r; x <= cx + r; x++) {
            if (x < 0 || x >= W) continue;
            const dx = x - cx;
            const dy = y - cy;
            if (dx * dx + dy * dy <= r * r) coords.push(y * W + x);
          }
        }
      }
      applyPerm(coords, perm);
    }
    return blendWithAccumulation(layer, out, frameIdx);
  }

  function applyBitCrushLayer(layer, src, frameIdx, layerIdx) {
    const p = layer.params || makeBitCrushDefaults();
    const W = LOW_W;
    const H = LOW_H;
    const out = new Uint8Array(src);
    const delay = clampInt(p.delay_frames, 1, 120);
    if (delay > 1 && (frameIdx % delay) !== 0) return blendWithAccumulation(layer, out, frameIdx);
    const bits = clampInt(p.bits, 1, 7);
    const keepBits = 8 - bits;
    const mask = (0xff << keepBits) & 0xff;
    const audioScale = clamp01(p.audio_scale);
    const shape = p.shape || "rectangle";
    const orientation = p.orientation === "vertical" ? "vertical" : "horizontal";
    const bandLengthPct = Math.max(1, Math.min(100, Number(p.band_length_pct) || 100.0));
    const countPct = Math.max(0, Math.min(100, Number(p.count_pct) || 3.0));
    const sizePct = Math.max(0, Math.min(100, Number(p.size_pct) || 20.0));

    const prev = getHistoryBuffer(1);
    let activity = 1.0;
    if (prev && prev.length === src.length) {
      let acc = 0;
      let n = 0;
      for (let i = 0; i < src.length; i += 16) {
        acc += Math.abs(src[i] - prev[i]) / 255;
        n++;
      }
      activity = Math.max(0, Math.min(1, n ? acc / n : 1));
    }
    activity = Math.max(0.45, activity);
    const intensity = (1.0 - audioScale) + audioScale * activity;
    const count = Math.max(0, Math.floor(H * (countPct / 100) * intensity));
    const maxSize = Math.floor(Math.min(H, W) * (sizePct / 100) * intensity);
    if (count <= 0 || maxSize < 4) return blendWithAccumulation(layer, out, frameIdx);

    const rng = seededRng(frameIdx * 4099 + layerIdx * 313 + 17);
    const crushCoords = (coords) => {
      for (let i = 0; i < coords.length; i++) {
        const ci = coords[i];
        const v = out[ci];
        out[ci] = v & mask;
      }
    };

    for (let bidx = 0; bidx < count; bidx++) {
      const coords = [];
      if (shape === "rectangle") {
        const bh = Math.max(4, Math.floor(rng() * maxSize));
        const bw = Math.max(4, Math.floor(rng() * maxSize));
        const y0 = Math.floor(rng() * Math.max(1, H - bh));
        const x0 = Math.floor(rng() * Math.max(1, W - bw));
        for (let y = y0; y < y0 + bh; y++) for (let x = x0; x < x0 + bw; x++) coords.push(y * W + x);
      } else if (shape === "square") {
        const s = Math.max(4, Math.floor(rng() * maxSize));
        const y0 = Math.floor(rng() * Math.max(1, H - s));
        const x0 = Math.floor(rng() * Math.max(1, W - s));
        for (let y = y0; y < y0 + s; y++) for (let x = x0; x < x0 + s; x++) coords.push(y * W + x);
      } else if (shape === "band") {
        const thickness = Math.max(4, Math.floor(rng() * maxSize));
        if (orientation === "horizontal") {
          const y0 = Math.floor(rng() * Math.max(1, H - thickness));
          const length = bandLengthPct >= 100 ? W : Math.max(4, Math.floor(W * bandLengthPct / 100));
          const x0 = bandLengthPct >= 100 ? 0 : Math.floor(rng() * Math.max(1, W - length));
          for (let y = y0; y < y0 + thickness; y++) for (let x = x0; x < x0 + length; x++) coords.push(y * W + x);
        } else {
          const x0 = Math.floor(rng() * Math.max(1, W - thickness));
          const length = bandLengthPct >= 100 ? H : Math.max(4, Math.floor(H * bandLengthPct / 100));
          const y0 = bandLengthPct >= 100 ? 0 : Math.floor(rng() * Math.max(1, H - length));
          for (let y = y0; y < y0 + length; y++) for (let x = x0; x < x0 + thickness; x++) coords.push(y * W + x);
        }
      } else {
        const r = Math.max(2, Math.floor(rng() * Math.max(3, Math.floor(maxSize / 2))));
        const cy = r + Math.floor(rng() * Math.max(1, H - 2 * r));
        const cx = r + Math.floor(rng() * Math.max(1, W - 2 * r));
        for (let y = cy - r; y <= cy + r; y++) {
          if (y < 0 || y >= H) continue;
          for (let x = cx - r; x <= cx + r; x++) {
            if (x < 0 || x >= W) continue;
            const dx = x - cx;
            const dy = y - cy;
            if (dx * dx + dy * dy <= r * r) coords.push(y * W + x);
          }
        }
      }
      crushCoords(coords);
    }
    return blendWithAccumulation(layer, out, frameIdx);
  }

  function applyInvertBlocksLayer(layer, src, frameIdx, layerIdx) {
    const p = layer.params || makeInvertBlocksDefaults();
    const W = LOW_W;
    const H = LOW_H;
    const out = new Uint8Array(src);
    const delay = clampInt(p.delay_frames, 1, 120);
    if (delay > 1 && (frameIdx % delay) !== 0) return blendWithAccumulation(layer, out, frameIdx);
    const audioScale = clamp01(p.audio_scale);
    const shape = p.shape || "rectangle";
    const orientation = p.orientation === "vertical" ? "vertical" : "horizontal";
    const bandLengthPct = Math.max(1, Math.min(100, Number(p.band_length_pct) || 100.0));
    const countPct = Math.max(0, Math.min(100, Number(p.count_pct) || 3.0));
    const sizePct = Math.max(0, Math.min(100, Number(p.size_pct) || 20.0));

    const prev = getHistoryBuffer(1);
    let activity = 1.0;
    if (prev && prev.length === src.length) {
      let acc = 0;
      let n = 0;
      for (let i = 0; i < src.length; i += 16) {
        acc += Math.abs(src[i] - prev[i]) / 255;
        n++;
      }
      activity = Math.max(0, Math.min(1, n ? acc / n : 1));
    }
    activity = Math.max(0.45, activity);
    const intensity = (1.0 - audioScale) + audioScale * activity;
    const count = Math.max(0, Math.floor(H * (countPct / 100) * intensity));
    const maxSize = Math.floor(Math.min(H, W) * (sizePct / 100) * intensity);
    if (count <= 0 || maxSize < 4) return blendWithAccumulation(layer, out, frameIdx);

    const rng = seededRng(frameIdx * 65537 + layerIdx * 181 + 31);
    const invertCoords = (coords) => {
      for (let i = 0; i < coords.length; i++) {
        const ci = coords[i];
        out[ci] = 255 - out[ci];
      }
    };

    for (let bidx = 0; bidx < count; bidx++) {
      const coords = [];
      if (shape === "rectangle") {
        const bh = Math.max(4, Math.floor(rng() * maxSize));
        const bw = Math.max(4, Math.floor(rng() * maxSize));
        const y0 = Math.floor(rng() * Math.max(1, H - bh));
        const x0 = Math.floor(rng() * Math.max(1, W - bw));
        for (let y = y0; y < y0 + bh; y++) for (let x = x0; x < x0 + bw; x++) coords.push(y * W + x);
      } else if (shape === "square") {
        const s = Math.max(4, Math.floor(rng() * maxSize));
        const y0 = Math.floor(rng() * Math.max(1, H - s));
        const x0 = Math.floor(rng() * Math.max(1, W - s));
        for (let y = y0; y < y0 + s; y++) for (let x = x0; x < x0 + s; x++) coords.push(y * W + x);
      } else if (shape === "band") {
        const thickness = Math.max(4, Math.floor(rng() * maxSize));
        if (orientation === "horizontal") {
          const y0 = Math.floor(rng() * Math.max(1, H - thickness));
          const length = bandLengthPct >= 100 ? W : Math.max(4, Math.floor(W * bandLengthPct / 100));
          const x0 = bandLengthPct >= 100 ? 0 : Math.floor(rng() * Math.max(1, W - length));
          for (let y = y0; y < y0 + thickness; y++) for (let x = x0; x < x0 + length; x++) coords.push(y * W + x);
        } else {
          const x0 = Math.floor(rng() * Math.max(1, W - thickness));
          const length = bandLengthPct >= 100 ? H : Math.max(4, Math.floor(H * bandLengthPct / 100));
          const y0 = bandLengthPct >= 100 ? 0 : Math.floor(rng() * Math.max(1, H - length));
          for (let y = y0; y < y0 + length; y++) for (let x = x0; x < x0 + thickness; x++) coords.push(y * W + x);
        }
      } else {
        const r = Math.max(2, Math.floor(rng() * Math.max(3, Math.floor(maxSize / 2))));
        const cy = r + Math.floor(rng() * Math.max(1, H - 2 * r));
        const cx = r + Math.floor(rng() * Math.max(1, W - 2 * r));
        for (let y = cy - r; y <= cy + r; y++) {
          if (y < 0 || y >= H) continue;
          for (let x = cx - r; x <= cx + r; x++) {
            if (x < 0 || x >= W) continue;
            const dx = x - cx;
            const dy = y - cy;
            if (dx * dx + dy * dy <= r * r) coords.push(y * W + x);
          }
        }
      }
      invertCoords(coords);
    }
    return blendWithAccumulation(layer, out, frameIdx);
  }

  function applyDatabendLayer(layer, src, frameIdx, layerIdx) {
    const p = layer.params || makeDatabendDefaults();
    const out = new Uint8Array(src);
    const baseCount = Math.max(1, clampInt(p.count, 1, 200));
    const baseChunk = Math.max(16, clampInt(p.chunk_size, 16, 65536));
    const audioScale = clamp01(p.audio_scale);
    const modeTokens = String(p.modes || "shift,xor,swap").split(",").map((m) => m.trim()).filter((m) => m);
    const allowed = ["shift", "xor", "swap"];
    const modes = modeTokens.filter((m) => allowed.includes(m));
    const activeModes = modes.length ? modes : allowed;

    const prev = getHistoryBuffer(1);
    let activity = 1.0;
    if (prev && prev.length === src.length) {
      let acc = 0;
      let n = 0;
      for (let i = 0; i < src.length; i += 16) {
        acc += Math.abs(src[i] - prev[i]) / 255;
        n++;
      }
      activity = Math.max(0, Math.min(1, n ? acc / n : 1));
    }
    activity = Math.max(0.35, activity);
    const intensity = (1.0 - audioScale) + audioScale * activity;
    let nChunks = Math.max(1, Math.floor(baseCount * intensity));
    let chunkSize = Math.max(16, Math.floor(baseChunk * intensity));
    if (activity > 0.78) chunkSize *= 2;

    const rng = seededRng(frameIdx * 104729 + layerIdx * 271 + 19);
    const total = out.length;
    for (let i = 0; i < nChunks; i++) {
      const size = Math.min(chunkSize, total);
      if (size <= 0) break;
      const start = Math.floor(rng() * Math.max(1, total - size));
      const end = start + size;
      const mode = activeModes[Math.floor(rng() * activeModes.length)];
      if (mode === "shift") {
        const off = Math.max(1, Math.floor(rng() * 64));
        const tmp = out.slice(start, end);
        for (let k = 0; k < tmp.length; k++) out[start + k] = tmp[(k - off + tmp.length) % tmp.length];
      } else if (mode === "xor") {
        const mask = Math.max(1, Math.floor(rng() * 64));
        for (let k = start; k < end; k++) out[k] = out[k] ^ mask;
      } else {
        const size2 = end - start;
        const start2 = Math.floor(rng() * Math.max(1, total - size2));
        for (let k = 0; k < size2; k++) {
          const a = start + k;
          const b = start2 + k;
          const t = out[a];
          out[a] = out[b];
          out[b] = t;
        }
      }
    }
    return blendWithAccumulation(layer, out, frameIdx);
  }

  function applyClipCutLayer(layer, src, frameIdx) {
    const p = layer.params || makeClipCutDefaults();
    const holdFrames = clampInt(p.hold_frames, 1, 300);
    if (!layer._state) layer._state = {};
    if (typeof layer._state.cutRemaining !== "number") layer._state.cutRemaining = 0;

    const prev = getHistoryBuffer(1);
    let activity = 0;
    if (prev && prev.length === src.length) {
      let acc = 0;
      let n = 0;
      for (let i = 0; i < src.length; i += 16) {
        acc += Math.abs(src[i] - prev[i]) / 255;
        n++;
      }
      activity = Math.max(0, Math.min(1, n ? acc / n : 0));
    }
    // Sim fallback for analyzer section_change: trigger on strong activity spikes.
    if (activity > 0.78) layer._state.cutRemaining = holdFrames;

    if (layer._state.cutRemaining > 0) {
      layer._state.cutRemaining -= 1;
      const delayed = getHistoryBuffer(Math.min(30, lowBufHistory.length - 1));
      // If no secondary clip reader exists in sim, use delayed frame as a temporal cut proxy.
      return blendWithAccumulation(layer, delayed ? new Uint8Array(delayed) : new Uint8Array(src), frameIdx);
    }
    return blendWithAccumulation(layer, new Uint8Array(src), frameIdx);
  }

  function applyPostEffects(src, frameIdx) {
    let out = src;
    for (let i = 0; i < postEffectStack.length; i++) {
      const layer = postEffectStack[i];
      if (!layer || !layer.id) continue;
      if (layer.id === "tear") out = applyTearLayer(layer, out, frameIdx, i);
      else if (layer.id === "chromatic") out = applyChromaticLayer(layer, out, frameIdx);
      else if (layer.id === "noise") out = applyNoiseLayer(layer, out, frameIdx, i);
      else if (layer.id === "warp") out = applyWarpLayer(layer, out, frameIdx);
      else if (layer.id === "slitscan") out = applySlitscanLayer(layer, out, frameIdx);
      else if (layer.id === "pixel_sort") out = applyPixelSortLayer(layer, out, frameIdx);
      else if (layer.id === "pixel_scramble") out = applyPixelScrambleLayer(layer, out, frameIdx, i);
      else if (layer.id === "jpeg_corrupt") out = applyJpegCorruptLayer(layer, out, frameIdx, i);
      else if (layer.id === "channel_swap") out = applyChannelSwapLayer(layer, out, frameIdx, i);
      else if (layer.id === "bit_crush") out = applyBitCrushLayer(layer, out, frameIdx, i);
      else if (layer.id === "invert_blocks") out = applyInvertBlocksLayer(layer, out, frameIdx, i);
      else if (layer.id === "databend") out = applyDatabendLayer(layer, out, frameIdx, i);
    }
    return out;
  }

  async function loadSupportedVisuals() {
    const ids = loadFallbackVisuals();
    return ids;
  }
  function loadFallbackVisuals() {
    FALLBACK_VISUAL_IDS.forEach((id) => { VISUALS[id] = { id, label: titleFromId(id) }; });
    return FALLBACK_VISUAL_IDS.slice();
  }

  function refreshVisualSelect() {
    visualSelect.innerHTML = "";
    Object.entries(VISUALS).forEach(([id, meta]) => {
      const o = document.createElement("option");
      o.value = id;
      o.textContent = meta.label;
      visualSelect.appendChild(o);
    });
    visualSelect.value = active;
  }
  function refreshPaletteSelect() {
    if (!paletteSelect) return;
    paletteSelect.innerHTML = "";
    PALETTE_IDS.forEach((id) => {
      const o = document.createElement("option");
      o.value = id;
      o.textContent = id;
      paletteSelect.appendChild(o);
    });
    paletteSelect.value = PALETTE_IDS.includes(activePalette) ? activePalette : DEFAULT_PALETTE_ID;
  }
  function refreshEffectSelect() {
    if (!effectSelect) return;
    effectSelect.innerHTML = "";
    SUPPORTED_EFFECT_IDS.forEach((id) => {
      const label = EFFECTS[id];
      if (!label) return;
      const o = document.createElement("option");
      o.value = id;
      o.textContent = label;
      effectSelect.appendChild(o);
    });
    effectSelect.value = activeEffect;
  }
  function refreshPostEffectSelect() {
    if (!postEffectSelect) return;
    postEffectSelect.innerHTML = "";
    const none = document.createElement("option");
    none.value = "__none__";
    none.textContent = "None";
    postEffectSelect.appendChild(none);
    POST_EFFECT_IMPLEMENTATION_ORDER.forEach((id) => {
      const o = document.createElement("option");
      o.value = id;
      o.textContent = id;
      postEffectSelect.appendChild(o);
    });
    postEffectSelect.value = activePostEffect;
  }
  function refreshPostFilterSelect() {
    if (!postFilterSelect) return;
    postFilterSelect.innerHTML = "";
    const none = document.createElement("option");
    none.value = "__none__";
    none.textContent = "None";
    postFilterSelect.appendChild(none);
    const byCategory = new Map();
    postFilterCatalog.forEach((f) => {
      const cat = f.category || "Uncategorized";
      if (!byCategory.has(cat)) byCategory.set(cat, []);
      byCategory.get(cat).push(f);
    });
    byCategory.forEach((items, cat) => {
      const group = document.createElement("optgroup");
      group.label = cat;
      items.forEach((f) => {
        const o = document.createElement("option");
        o.value = f.id;
        o.textContent = f.label || f.id;
        group.appendChild(o);
      });
      postFilterSelect.appendChild(group);
    });
    postFilterSelect.value = activePostFilter;
  }

  async function loadPostFiltersCatalog() {
    const presets = FILTER_PRESETS.slice();
    postFilterPresetsById = Object.fromEntries(presets.map((p) => [p.id, p]));
    return presets.map((p) => ({ id: p.id, label: p.label, category: p.category }));
  }

  // Thin shim — defers to the canonical apply_post_filters implementation.
  // ctx is built from the IIFE's closure (LOW_W, LOW_H, frameN).
  function applyFilterOpToBuffer(op, src) {
    return GPF.applyFilterOp(op, src, { W: LOW_W, H: LOW_H, frameN });
  }

  function clamp255(v) { return Math.max(0, Math.min(255, Math.round(v))); }
  function idxBufToRgb(src) {
    const rgb = new Uint8ClampedArray(src.length * 4);
    for (let i = 0; i < src.length; i++) {
      const o = i * 4;
      if (src[i] === 0) {
        rgb[o] = 0;
        rgb[o + 1] = 0;
        rgb[o + 2] = 0;
      } else {
        const [r, g, b] = idxColorToRgb(src[i], 0);
        rgb[o] = r;
        rgb[o + 1] = g;
        rgb[o + 2] = b;
      }
      rgb[o + 3] = 255;
    }
    return rgb;
  }

  function applyPostFilters(src) {
    let out = idxBufToRgb(src);
    for (let i = 0; i < postFilterStack.length; i++) {
      const ref = postFilterStack[i];
      const preset = ref && ref.id ? postFilterPresetsById[ref.id] : null;
      if (!preset || !Array.isArray(preset.ops)) continue;
      for (let j = 0; j < preset.ops.length; j++) out = applyFilterOpToBuffer(preset.ops[j], out);
    }
    return out;
  }

  visualSelect.addEventListener("change", () => {
    active = visualSelect.value;
    refreshStatus();
  });
  if (paletteSelect) {
    paletteSelect.addEventListener("change", () => {
      activePalette = PALETTE_IDS.includes(paletteSelect.value) ? paletteSelect.value : DEFAULT_PALETTE_ID;
      syncSceneFromCurrentState();
      refreshStatus(`Palette set to ${activePalette}.`);
    });
  }
  function syncBackgroundFromControls() {
    backgroundConfig = makeBackgroundConfig({
      image: backgroundImagePathInput ? backgroundImagePathInput.value.trim() : backgroundConfig.image,
      fit: backgroundFitSelect ? backgroundFitSelect.value : backgroundConfig.fit,
      anchor: backgroundAnchorSelect ? backgroundAnchorSelect.value : backgroundConfig.anchor,
      opacity: backgroundOpacityInput ? backgroundOpacityInput.value : backgroundConfig.opacity,
      tile: backgroundTileInput ? backgroundTileInput.checked : backgroundConfig.tile
    });
    syncSceneFromCurrentState();
  }
  if (backgroundImagePathInput) {
    backgroundImagePathInput.addEventListener("input", () => {
      syncBackgroundFromControls();
      refreshStatus("Background render path updated.");
    });
  }
  if (backgroundFitSelect) {
    backgroundFitSelect.addEventListener("change", () => {
      syncBackgroundFromControls();
      refreshStatus("Background fit updated.");
    });
  }
  if (backgroundAnchorSelect) {
    backgroundAnchorSelect.addEventListener("change", () => {
      syncBackgroundFromControls();
      refreshStatus("Background anchor updated.");
    });
  }
  if (backgroundOpacityInput) {
    backgroundOpacityInput.addEventListener("input", () => {
      syncBackgroundFromControls();
      refreshStatus("Background opacity updated.");
    });
  }
  if (backgroundTileInput) {
    backgroundTileInput.addEventListener("change", () => {
      syncBackgroundFromControls();
      refreshStatus("Background tiling updated.");
    });
  }
  if (backgroundPreviewFileInput) {
    backgroundPreviewFileInput.addEventListener("change", () => {
      const f = backgroundPreviewFileInput.files && backgroundPreviewFileInput.files[0];
      if (!f) return;
      clearBackgroundPreviewForActiveScene();
      const url = URL.createObjectURL(f);
      const img = new Image();
      img.onload = () => {
        const key = activeScenePreviewKey();
        if (key) setBackgroundPreviewForScene(key, img, url, f.name || "selected image", true);
        const filledPath = maybeFillBackgroundRenderPathFromPreview(f.name || "");
        refreshBackgroundPreviewName();
        refreshStatus(filledPath
          ? "Background preview loaded and render path filled."
          : "Background preview loaded.");
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        refreshStatus("Background preview failed to load.");
      };
      img.src = url;
    });
  }
  if (backgroundPreviewBaseDirInput) {
    backgroundPreviewBaseDirInput.value = backgroundPreviewBaseDir;
    backgroundPreviewBaseDirInput.addEventListener("input", () => {
      backgroundPreviewBaseDir = String(backgroundPreviewBaseDirInput.value || "").trim();
      saveBackgroundPreviewBaseDir(backgroundPreviewBaseDir);
      refreshStatus("Background preview base updated.");
    });
    backgroundPreviewBaseDirInput.addEventListener("change", () => {
      backgroundPreviewBaseDir = String(backgroundPreviewBaseDirInput.value || "").trim();
      saveBackgroundPreviewBaseDir(backgroundPreviewBaseDir);
      reloadBackgroundPreviewsFromBase();
      refreshStatus(backgroundPreviewBaseDir
        ? "Background previews reloaded from base."
        : "Background preview base cleared.");
    });
  }
  if (clearBackgroundPreviewBtn) {
    clearBackgroundPreviewBtn.addEventListener("click", () => {
      clearBackgroundPreviewForActiveScene();
      refreshStatus("Background preview cleared.");
    });
  }
  if (replaceStackBtn) {
    replaceStackBtn.addEventListener("click", () => {
      visualStack = [active];
      resetPortedStates();
      renderVisualStackPills();
      syncSceneFromCurrentState();
      refreshStatus("Visual stack replaced.");
    });
  }
  if (addLayerBtn) {
    addLayerBtn.addEventListener("click", () => {
      if (visualStack.includes(active)) {
        window.alert("That visual is already in the stack.");
        return;
      }
      visualStack.push(active);
      resetPortedStates();
      renderVisualStackPills();
      syncSceneFromCurrentState();
      refreshStatus("Visual layer added.");
    });
  }
  if (clearStackBtn) {
    clearStackBtn.addEventListener("click", () => {
      visualStack = [];
      resetPortedStates();
      renderVisualStackPills();
      syncSceneFromCurrentState();
      refreshStatus("Visual stack cleared.");
    });
  }

  if (effectSelect) {
    effectSelect.addEventListener("change", () => {
      activeEffect = effectSelect.value;
      refreshStatus();
    });
  }
  if (replaceEffectStackBtn) {
    replaceEffectStackBtn.addEventListener("click", () => {
      effectStack = activeEffect === "__none__" ? [] : [activeEffect];
      renderEffectStackPills();
      syncSceneFromCurrentState();
      refreshStatus("Effect stack replaced.");
    });
  }
  if (addEffectLayerBtn) {
    addEffectLayerBtn.addEventListener("click", () => {
      if (activeEffect === "__none__") {
        refreshStatus("Select an effect first.");
        return;
      }
      if (effectStack.includes(activeEffect)) {
        window.alert("That visual effect is already in the stack.");
        return;
      }
      effectStack.push(activeEffect);
      renderEffectStackPills();
      syncSceneFromCurrentState();
      refreshStatus("Effect layer added.");
    });
  }
  if (clearEffectStackBtn) {
    clearEffectStackBtn.addEventListener("click", () => {
      effectStack = [];
      renderEffectStackPills();
      syncSceneFromCurrentState();
      refreshStatus("Effect stack cleared.");
    });
  }
  if (postEffectSelect) {
    postEffectSelect.addEventListener("change", () => {
      activePostEffect = postEffectSelect.value;
      refreshStatus();
    });
  }
  if (replacePostEffectStackBtn) {
    replacePostEffectStackBtn.addEventListener("click", () => {
      postEffectStack = activePostEffect === "__none__" ? [] : [createPostLayer(activePostEffect)];
      renderPostChainPills();
      syncSceneFromCurrentState();
      refreshStatus("Post effect stack replaced.");
    });
  }
  if (addPostEffectLayerBtn) {
    addPostEffectLayerBtn.addEventListener("click", () => {
      if (activePostEffect === "__none__") {
        refreshStatus("Select a post effect first.");
        return;
      }
      if (postEffectStack.some((layer) => layer.id === activePostEffect)) {
        refreshStatus("That post effect is already in the stack.");
        return;
      }
      postEffectStack.push(createPostLayer(activePostEffect));
      renderPostChainPills();
      syncSceneFromCurrentState();
      refreshStatus("Post effect layer added.");
    });
  }
  if (clearPostEffectStackBtn) {
    clearPostEffectStackBtn.addEventListener("click", () => {
      postEffectStack = [];
      renderPostChainPills();
      syncSceneFromCurrentState();
      refreshStatus("Post effect stack cleared.");
    });
  }
  if (postFilterSelect) {
    postFilterSelect.addEventListener("change", () => {
      activePostFilter = postFilterSelect.value;
    });
  }
  if (addPostFilterLayerBtn) {
    addPostFilterLayerBtn.addEventListener("click", () => {
      if (activePostFilter === "__none__") return;
      if (postFilterStack.some((f) => f.id === activePostFilter)) {
        window.alert("That post filter is already in the stack.");
        return;
      }
      const match = postFilterCatalog.find((f) => f.id === activePostFilter);
      if (!match) return;
      postFilterStack.push({ ...match });
      renderPostFilterPills();
      syncSceneFromCurrentState();
    });
  }
  if (replacePostFilterStackBtn) {
    replacePostFilterStackBtn.addEventListener("click", () => {
      if (activePostFilter === "__none__") {
        postFilterStack = [];
      } else {
        const match = postFilterCatalog.find((f) => f.id === activePostFilter);
        postFilterStack = match ? [{ ...match }] : [];
      }
      renderPostFilterPills();
      syncSceneFromCurrentState();
    });
  }
  if (clearPostFilterStackBtn) {
    clearPostFilterStackBtn.addEventListener("click", () => {
      postFilterStack = [];
      renderPostFilterPills();
      syncSceneFromCurrentState();
    });
  }

  if (sceneSelect) {
    sceneSelect.addEventListener("change", () => {
      const next = Number(sceneSelect.value);
      if (!Number.isInteger(next) || next < 0 || next >= scenes.length) return;
      syncSceneFromCurrentState();
      activeSceneIndex = next;
      loadSceneIntoCurrentState(scenes[activeSceneIndex]);
      refreshSceneUi();
      refreshStatus(`Loaded ${scenes[activeSceneIndex].name}.`);
    });
  }
  if (sceneNameInput) {
    sceneNameInput.addEventListener("change", () => {
      const s = scenes[activeSceneIndex];
      if (!s) return;
      s.name = String(sceneNameInput.value || "").trim() || s.name;
      refreshSceneUi();
    });
  }
  if (addSceneBtn) {
    addSceneBtn.addEventListener("click", () => {
      syncSceneFromCurrentState();
      const id = `scene_${scenes.length + 1}`;
      const name = `Scene ${scenes.length + 1}`;
      scenes.push(makeScene(id, name));
      activeSceneIndex = scenes.length - 1;
      refreshSceneUi();
      loadSceneIntoCurrentState(scenes[activeSceneIndex]);
      refreshStatus(`Added ${name}.`);
    });
  }
  if (duplicateSceneBtn) {
    duplicateSceneBtn.addEventListener("click", () => {
      const src = scenes[activeSceneIndex];
      if (!src) return;
      syncSceneFromCurrentState();
      const id = `scene_${scenes.length + 1}`;
      const name = `${src.name} Copy`;
      const dup = {
        id,
        name,
        palette: PALETTE_IDS.includes(src.palette) ? src.palette : DEFAULT_PALETTE_ID,
        visualStack: [...(src.visualStack || [])],
        background: cloneBackgroundConfig(src.background),
        effectStack: [...(src.effectStack || [])],
        effectParams: src.effectParams ? JSON.parse(JSON.stringify(src.effectParams)) : {},
        postEffectStack: (src.postEffectStack || []).map(clonePostLayer),
        postFilterStack: clonePostFilterStack(src.postFilterStack || [])
      };
      scenes.push(dup);
      activeSceneIndex = scenes.length - 1;
      refreshSceneUi();
      loadSceneIntoCurrentState(dup);
      refreshStatus(`Duplicated to ${name}.`);
    });
  }
  if (removeSceneBtn) {
    removeSceneBtn.addEventListener("click", () => {
      if (scenes.length <= 1) {
        refreshStatus("At least one scene is required.");
        return;
      }
      const removed = scenes[activeSceneIndex];
      const ref = removed ? backgroundPreviewBySceneId.get(removed.id) : null;
      if (ref && ref.revokeUrl && ref.url) URL.revokeObjectURL(ref.url);
      if (removed) backgroundPreviewBySceneId.delete(removed.id);
      scenes.splice(activeSceneIndex, 1);
      activeSceneIndex = Math.max(0, Math.min(activeSceneIndex, scenes.length - 1));
      refreshSceneUi();
      loadSceneIntoCurrentState(scenes[activeSceneIndex]);
      refreshStatus(`Removed scene. Active: ${scenes[activeSceneIndex].name}.`);
    });
  }
  if (exportConfigBtn) {
    exportConfigBtn.addEventListener("click", exportConfigJson);
  }

  // ---------- Undo / Redo ----------
  // Snapshot the full editable scene state. We DON'T capture transient render
  // state (active*, lowBuf, history buffers) — only the data the user can
  // actually mutate via the UI: scenes[] + which scene is active.
  // Undo/Redo live in the scene-tab strip (right after the Export tab) so
  // they're visible regardless of which scene/tab is active. We create them
  // once here; refreshSceneUi() re-appends them after rebuilding the tabs.
  // Scene clipboard — copies the visual/post settings of one scene so they can
  // be pasted onto another. Page-scoped (lost on refresh). Excludes scene id,
  // name, label, and start/end_sec — those are per-scene identity, not settings.
  let sceneClipboard = null;
  const copyBtn = document.createElement("button");
  copyBtn.type = "button";
  copyBtn.className = "tab";
  copyBtn.textContent = "Copy";
  const pasteBtn = document.createElement("button");
  pasteBtn.type = "button";
  pasteBtn.className = "tab";
  pasteBtn.textContent = "Paste";
  pasteBtn.disabled = true;
  const undoBtn = document.createElement("button");
  undoBtn.type = "button";
  undoBtn.className = "tab";
  undoBtn.textContent = "Undo";
  undoBtn.disabled = true;
  const redoBtn = document.createElement("button");
  redoBtn.type = "button";
  redoBtn.className = "tab";
  redoBtn.textContent = "Redo";
  redoBtn.disabled = true;
  const historyStack = [];
  let historyIndex = -1;
  let restoringHistory = false;
  const HISTORY_LIMIT = 100;

  function snapshotState() {
    syncSceneFromCurrentState();
    return JSON.stringify({
      scenes,
      activeSceneIndex,
      activePalette,
      importedTimelineSourceName,
      importedTimelineName
    });
  }
  function refreshHistoryButtons() {
    if (undoBtn) undoBtn.disabled = historyIndex <= 0;
    if (redoBtn) redoBtn.disabled = historyIndex >= historyStack.length - 1;
  }
  function commitHistory() {
    if (restoringHistory) return;
    const snap = snapshotState();
    if (historyStack[historyIndex] === snap) return;
    historyStack.length = historyIndex + 1; // truncate redo branch
    historyStack.push(snap);
    if (historyStack.length > HISTORY_LIMIT) {
      historyStack.shift();
    } else {
      historyIndex++;
    }
    refreshHistoryButtons();
  }
  function restoreSnapshot(snap) {
    const obj = JSON.parse(snap);
    restoringHistory = true;
    scenes = (obj.scenes || []).map((s) => ({
      ...s,
      visualStack: [...(s.visualStack || [])],
      background: cloneBackgroundConfig(s.background),
      effectStack: [...(s.effectStack || [])],
      effectParams: s.effectParams ? JSON.parse(JSON.stringify(s.effectParams)) : {},
      postEffectStack: (s.postEffectStack || []).map((p) => ({
        ...p,
        params: JSON.parse(JSON.stringify(p.params || {})),
        accumulate: JSON.parse(JSON.stringify(p.accumulate || { enabled: false, bleed: 0.08, reset_sec: 2.0 })),
        _state: { acc: null, startFrame: 0 }
      })),
      postFilterStack: (s.postFilterStack || []).map((f) => ({ ...f }))
    }));
    activeSceneIndex = Math.min(obj.activeSceneIndex || 0, scenes.length - 1);
    if (obj.importedTimelineSourceName) importedTimelineSourceName = obj.importedTimelineSourceName;
    if (obj.importedTimelineName) importedTimelineName = obj.importedTimelineName;
    if (PALETTE_IDS.includes(obj.activePalette)) activePalette = obj.activePalette;
    refreshSceneUi();
    if (scenes[activeSceneIndex]) loadSceneIntoCurrentState(scenes[activeSceneIndex]);
    restoringHistory = false;
    refreshHistoryButtons();
  }
  if (undoBtn) {
    undoBtn.addEventListener("click", () => {
      if (historyIndex > 0) {
        historyIndex--;
        restoreSnapshot(historyStack[historyIndex]);
        refreshStatus("Undo");
      }
    });
  }
  if (redoBtn) {
    redoBtn.addEventListener("click", () => {
      if (historyIndex < historyStack.length - 1) {
        historyIndex++;
        restoreSnapshot(historyStack[historyIndex]);
        refreshStatus("Redo");
      }
    });
  }
  // ---------- Scene Copy / Paste ----------
  // Capture only the settings the user can mutate on a scene — not identity
  // (id, name, label, timing). Deep-cloned so future edits don't bleed in.
  function captureSceneSettings(scene) {
    if (!scene) return null;
    return {
      palette: scene.palette,
      visualStack: [...(scene.visualStack || [])],
      background: cloneBackgroundConfig(scene.background),
      effectStack: [...(scene.effectStack || [])],
      effectParams: scene.effectParams ? JSON.parse(JSON.stringify(scene.effectParams)) : {},
      postEffectStack: (scene.postEffectStack || []).map((p) => ({
        ...p,
        params: JSON.parse(JSON.stringify(p.params || {})),
        accumulate: JSON.parse(JSON.stringify(p.accumulate || { enabled: false, bleed: 0.08, reset_sec: 2.0 })),
        _state: { acc: null, startFrame: 0 }
      })),
      postFilterStack: (scene.postFilterStack || []).map((f) => ({ ...f }))
    };
  }
  if (copyBtn) {
    copyBtn.addEventListener("click", () => {
      syncSceneFromCurrentState();
      const src = scenes[activeSceneIndex];
      sceneClipboard = captureSceneSettings(src);
      pasteBtn.disabled = !sceneClipboard;
      refreshStatus(`Copied ${src && src.name ? src.name : "scene"}`);
    });
  }
  if (pasteBtn) {
    pasteBtn.addEventListener("click", () => {
      if (!sceneClipboard) return;
      const dst = scenes[activeSceneIndex];
      if (!dst) return;
      const next = captureSceneSettings(sceneClipboard); // clone-on-paste
      Object.assign(dst, next);
      // Re-load the active scene so the workspace UI re-renders with the new
      // values; the debounced click listener will snapshot for undo.
      loadSceneIntoCurrentState(dst);
      refreshStatus(`Pasted into ${dst.name || "scene"}`);
    });
  }
  // Snapshot on any user interaction (debounced) to avoid wiring every handler.
  // Skip clicks on the undo/redo buttons themselves.
  let historyDebounce = null;
  function scheduleCommit(target) {
    if (target && (target === undoBtn || target === redoBtn)) return;
    if (historyDebounce) clearTimeout(historyDebounce);
    historyDebounce = setTimeout(commitHistory, 150);
  }
  document.addEventListener("click", (e) => scheduleCommit(e.target), true);
  document.addEventListener("change", (e) => scheduleCommit(e.target), true);
  document.addEventListener("input", (e) => scheduleCommit(e.target), true);
  // Seed the history with the initial state once scenes are populated.
  setTimeout(() => { commitHistory(); refreshHistoryButtons(); }, 0);
  if (importTimelineBtn) {
    importTimelineBtn.addEventListener("click", importTimelineFromFileInput);
  }

  if (persistentBuffer) {
    persist = !!persistentBuffer.checked;
    persistentBuffer.addEventListener("change", () => {
      persist = !!persistentBuffer.checked;
      resetPortedStates();
      refreshStatus();
    });
  }

  playPause.addEventListener("click", () => {
    playing = !playing;
    playPause.textContent = playing ? "Pause" : "Play";
  });

  function renderCurrentSceneFrame(advanceTime) {
    if (advanceTime) {
      t += 0.016;
      frameN += 1;
    }
    if (!persist) lowBuf.fill(0);
    drawBackgroundPreviewToLowBuf();
    const drawIds = getRenderableStack();
    for (let i = 0; i < drawIds.length; i++) drawVisualById(drawIds[i]);
    let postBuf = lowBuf;
    const effectIds = getRenderableEffectStack();
    for (let i = 0; i < effectIds.length; i++) {
      postBuf = applySelectedEffectToBuffer(effectIds[i], postBuf, frameN);
    }
    lowBufHistory.push(new Uint8Array(postBuf));
    if (lowBufHistory.length > 32) lowBufHistory.shift();
    postBuf = applyPostEffects(postBuf, frameN);
    const filteredRgb = applyPostFilters(postBuf);
    if (filteredRgb && filteredRgb.length === lowBuf.length * 4) renderRgbBufToCanvas(filteredRgb);
    else renderLowBufToCanvas(t, postBuf);
  }

  function frame() {
    requestAnimationFrame(frame);
    if (!playing) return;
    if (activeTab === "export") {
      if (frameN % 2 === 0) updateExportThumbnailFrame(false);
      frameN += 1;
      return;
    }
    renderCurrentSceneFrame(true);
  }

  Promise.allSettled([loadSupportedVisuals(), loadPostFiltersCatalog()])
    .then((results) => {
      const visualsRes = results[0];
      const filtersRes = results[1];
      let ids = [];
      if (visualsRes.status === "fulfilled") {
        ids = visualsRes.value || [];
      } else {
        ids = loadFallbackVisuals();
      }
      postFilterCatalog = filtersRes.status === "fulfilled" ? (filtersRes.value || []) : [];
      activePostFilter = "__none__";
      active = ids[0] || DEFAULT_VISUAL_ID;
      visualStack = active ? [active] : [];
      scenes = [];
      activeSceneIndex = 0;
      refreshVisualSelect();
      refreshPaletteSelect();
      renderVisualStackPills();
      refreshEffectSelect();
      renderEffectStackPills();
      refreshPostEffectSelect();
      renderPostChainPills();
      refreshPostFilterSelect();
      renderPostFilterPills();
      if (visualsRes.status === "fulfilled") {
        refreshStatus(`Loaded ${ids.length} supported Dazzle visuals.`);
      } else {
        const msg = visualsRes.reason && visualsRes.reason.message ? visualsRes.reason.message : "manifest load failed";
        refreshStatus(`Manifest load failed (${msg}). Loaded fallback visual list (${ids.length}).`);
      }
      frame();
    });
})();
