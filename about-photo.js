// About portrait: the photo with feathered edges and a shimmering grid of
// ASCII characters over it, tinted from the photo itself.
(() => {
  const fig = document.querySelector(".about-photo");
  if (!fig) return;
  const panel = document.querySelector(".about-panel");
  const canvas = fig.querySelector("canvas");
  const ctx = canvas.getContext("2d");
  const src = fig.querySelector("img");
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';
  const GLYPHS = [".", ":", "-", "+", "*", "x", "#"];
  const sample = document.createElement("canvas");
  const sctx = sample.getContext("2d", { willReadFrequently: true });
  const base = document.createElement("canvas");
  const bctx = base.getContext("2d");
  let W = 0, H = 0, dpr = 1, cell = 8, cols = 0, rows = 0, data = null, phase = new Float32Array(0), ready = false;

  function layout() {
    const r = canvas.getBoundingClientRect();
    if (!r.width || !src.naturalWidth) return;
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = r.width; H = r.height;
    canvas.width = base.width = Math.round(W * dpr);
    canvas.height = base.height = Math.round(H * dpr);
    // photo, cover-fit, with soft feathered edges
    const s = Math.max(W / src.naturalWidth, H / src.naturalHeight);
    const iw = src.naturalWidth * s, ih = src.naturalHeight * s;
    bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    bctx.clearRect(0, 0, W, H);
    bctx.drawImage(src, (W - iw) / 2, (H - ih) / 2, iw, ih);
    bctx.globalCompositeOperation = "destination-in";
    const f = Math.min(W, H) * 0.09;
    for (const [x0, y0, x1, y1] of [[0, 0, f, 0], [W, 0, W - f, 0], [0, 0, 0, f], [0, H, 0, H - f]]) {
      const g = bctx.createLinearGradient(x0, y0, x1, y1);
      g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,1)");
      bctx.fillStyle = g; bctx.fillRect(0, 0, W, H);
    }
    bctx.globalCompositeOperation = "source-over";
    // ASCII grid
    cell = Math.max(7, Math.round(W / 34));
    cols = Math.ceil(W / cell); rows = Math.ceil(H / cell);
    sample.width = cols; sample.height = rows;
    sctx.drawImage(base, 0, 0, cols, rows);
    data = sctx.getImageData(0, 0, cols, rows).data;
    phase = new Float32Array(cols * rows).map(() => Math.random());
    ready = true;
    draw(performance.now());
  }

  function draw(now) {
    if (!ready) return;
    const t = reduceMotion ? 0 : now / 1000;
    const tick = Math.floor(t * 4);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(base, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.font = `${Math.round(cell * 0.95)}px ${MONO}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < cols; x += 1) {
        const k = (y * cols + x) * 4;
        const a = data[k + 3] / 255;
        if (a < 0.25) continue;
        const r = data[k], g = data[k + 1], b = data[k + 2];
        const lum = (r * 0.3 + g * 0.59 + b * 0.11) / 255;
        const p = phase[y * cols + x];
        // brighter areas get denser glyphs; a gentle wave makes them breathe
        const wave = reduceMotion ? 0 : 0.12 * Math.sin(t * 1.1 + x * 0.35 + y * 0.22 + p * 6);
        const level = Math.max(0, Math.min(GLYPHS.length - 1, Math.round((lum + wave) * (GLYPHS.length - 1))));
        const glyph = GLYPHS[(p < 0.18 && !reduceMotion) ? (level + tick + Math.floor(p * 9)) % GLYPHS.length : level];
        const mix = 0.55 + lum * 0.35;
        ctx.globalAlpha = a * (0.28 + lum * 0.5);
        ctx.fillStyle = `rgb(${Math.round(r + (255 - r) * mix)},${Math.round(g + (255 - g) * mix)},${Math.round(b + (255 - b) * mix)})`;
        ctx.fillText(glyph, x * cell + cell / 2, y * cell + cell / 2);
      }
    }
    ctx.globalAlpha = 1;
  }

  let last = 0;
  function loop(now) {
    requestAnimationFrame(loop);
    if (!panel || !panel.classList.contains("is-visible") || now - last < 80) return;
    if (Math.abs(canvas.getBoundingClientRect().width - W) > 1) layout();
    last = now;
    draw(now);
  }

  const start = () => { layout(); requestAnimationFrame(loop); };
  if (!canvas.getContext) { fig.classList.add("no-canvas"); return; }
  if (src.complete && src.naturalWidth) start(); else src.addEventListener("load", start);
  addEventListener("resize", () => layout());
})();
