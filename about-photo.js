// About portrait: a clear photo with a soft faded edge, sitting among the moving
// plant shadows (they show through where the edge fades), plus a very light
// shimmer of ASCII characters tinted from the photo.
(() => {
  const fig = document.querySelector(".about-photo");
  if (!fig) return;
  const panel = document.querySelector(".about-panel");
  const canvas = fig.querySelector("canvas");
  const ctx = canvas.getContext && canvas.getContext("2d");
  const src = fig.querySelector("img");
  if (!ctx) { fig.classList.add("no-canvas"); return; }
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace';
  const LEVELS = [".", "`", ":", "-", "~", ";", "=", "+", "/", "*", "x", "X", "%", "#"];
  const INK = [66, 104, 156];
  const mk = () => { const c = document.createElement("canvas"); return [c, c.getContext("2d", { willReadFrequently: true })]; };
  const [base, bctx] = mk();     // faded photo, full res
  const [halo, hctx] = mk();     // wider soft mask: where characters may appear
  const [sample, sctx] = mk();   // one pixel per character cell (photo colour)
  const [hs, hsctx] = mk();      // one pixel per character cell (halo + fade)
  let W = 0, H = 0, dpr = 1, cellW = 6, cellH = 10, cols = 0, rows = 0;
  let pix = null, halP = null, fadeP = null, phase = new Float32Array(0), blot = new Float32Array(0), ready = false;

  function softMask(c, cx, w, h, inset, blur) {
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, w, h);
    c.filter = `blur(${blur}px)`;
    c.fillStyle = "#000";
    c.fillRect(inset, inset, w - inset * 2, h - inset * 2);
    c.filter = "none";
  }

  function layout() {
    const r = canvas.getBoundingClientRect();
    if (!r.width || !src.naturalWidth) return;
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = r.width; H = r.height;
    const pw = Math.round(W * dpr), ph = Math.round(H * dpr);
    canvas.width = base.width = halo.width = pw;
    canvas.height = base.height = halo.height = ph;

    // photo, cover-fit, slightly zoomed with the face centred
    const s = Math.max(pw / src.naturalWidth, ph / src.naturalHeight) * 1.12;
    const iw = src.naturalWidth * s, ih = src.naturalHeight * s;
    const ox = Math.min(0, Math.max(pw - iw, pw / 2 - iw * 0.51));
    const oy = Math.min(0, Math.max(ph - ih, ph * 0.5 - ih * 0.46));
    const m = Math.min(pw, ph);
    // soft fade: a blurred rectangle used as the photo's alpha
    softMask(bctx, null, pw, ph, m * 0.15, m * 0.06);
    bctx.globalCompositeOperation = "source-in";
    bctx.drawImage(src, ox, oy, iw, ih);
    bctx.globalCompositeOperation = "source-over";
    // characters reach a little past the photo before they thin out
    softMask(hctx, null, pw, ph, m * 0.13, m * 0.04);

    cellW = 6; cellH = 11;   // same character grid as the leaf shadows
    cols = Math.ceil(W / cellW); rows = Math.ceil(H / cellH);
    sample.width = hs.width = cols; sample.height = hs.height = rows;
    // photo colour per cell, sampled from the unfaded photo
    sctx.clearRect(0, 0, cols, rows);
    sctx.drawImage(src, ox / pw * cols, oy / ph * rows, iw / pw * cols, ih / ph * rows);
    pix = sctx.getImageData(0, 0, cols, rows).data;
    hsctx.clearRect(0, 0, cols, rows);
    hsctx.drawImage(halo, 0, 0, cols, rows);
    halP = hsctx.getImageData(0, 0, cols, rows).data;
    hsctx.clearRect(0, 0, cols, rows);
    hsctx.drawImage(base, 0, 0, cols, rows);
    fadeP = hsctx.getImageData(0, 0, cols, rows).data;
    phase = new Float32Array(cols * rows).map(() => Math.random());
    // low-frequency blotches so the dissolving edge is uneven, like the leaves
    blot = new Float32Array(cols * rows);
    const seeds = Array.from({ length: 4 }, () => [Math.random() * 6.28, Math.random() * 6.28, 0.05 + Math.random() * 0.07, 0.03 + Math.random() * 0.05]);
    for (let y = 0; y < rows; y += 1) for (let x = 0; x < cols; x += 1) {
      let v = 0;
      for (const [a, b, fx, fy] of seeds) v += Math.sin(x * fx + a) * Math.cos(y * fy + b);
      blot[y * cols + x] = v / 4;
    }
    ready = true;
    draw(performance.now());
  }

  function draw(now) {
    if (!ready) return;
    const t = reduceMotion ? 0 : now / 1000;
    const tick = Math.floor(t * 3);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(base, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.font = `9px ${MONO}`;
    ctx.textBaseline = "top";
    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < cols; x += 1) {
        const i = y * cols + x, k = i * 4;
        const photo = fadeP[k + 3] / 255;
        if (photo < 0.5) continue;
        const r = pix[k], g = pix[k + 1], b = pix[k + 2];
        const lum = (r * 0.3 + g * 0.59 + b * 0.11) / 255;
        const p = phase[i];
        const wave = reduceMotion ? 0 : 0.1 * Math.sin(t * 1.1 + x * 0.33 + y * 0.21 + p * 6);
        let level = Math.round(Math.max(0, Math.min(1, lum + wave)) * (LEVELS.length - 1));
        if (p < 0.15 && !reduceMotion) level = (level + tick + Math.floor(p * 40)) % LEVELS.length;
        const mix = 0.65 + lum * 0.3;
        ctx.fillStyle = `rgb(${Math.round(r + (255 - r) * mix)},${Math.round(g + (255 - g) * mix)},${Math.round(b + (255 - b) * mix)})`;
        ctx.globalAlpha = (photo - 0.5) * 2 * (0.06 + lum * 0.16);
        ctx.fillText(LEVELS[level], x * cellW, y * cellH);
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
  if (src.complete && src.naturalWidth) start(); else src.addEventListener("load", start);
  addEventListener("resize", () => layout());
})();
