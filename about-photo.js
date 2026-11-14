// About portrait: the photo among the moving plant shadows. Its soft faded edge
// dissolves into ASCII characters in the photo's own colours, and a shimmer of
// light characters runs over the photo's background (never over her).
(() => {
  const fig = document.querySelector(".about-photo");
  if (!fig) return;
  const panel = document.querySelector(".about-panel");
  const canvas = fig.querySelector("canvas");
  const ctx = canvas.getContext && canvas.getContext("2d");
  const src = fig.querySelector("img");
  // where Sophia is in the photo (white = her), so the characters stay on the background only
  const person = new Image();
  person.src = "assets/sophia-portrait-mask.png?v=1";
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
  let pix = null, perP = null, halP = null, fadeP = null, phase = new Float32Array(0), blot = new Float32Array(0), ready = false;

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
    softMask(hctx, null, pw, ph, m * 0.1, m * 0.05);

    cellW = 6; cellH = 11;   // same character grid as the leaf shadows
    cols = Math.ceil(W / cellW); rows = Math.ceil(H / cellH);
    sample.width = hs.width = cols; sample.height = hs.height = rows;
    // photo colour per cell, sampled from the unfaded photo
    sctx.clearRect(0, 0, cols, rows);
    sctx.drawImage(src, ox / pw * cols, oy / ph * rows, iw / pw * cols, ih / ph * rows);
    pix = sctx.getImageData(0, 0, cols, rows).data;
    sctx.clearRect(0, 0, cols, rows);
    if (person.complete && person.naturalWidth) sctx.drawImage(person, ox / pw * cols, oy / ph * rows, iw / pw * cols, ih / ph * rows);
    perP = sctx.getImageData(0, 0, cols, rows).data;
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
        const photo = fadeP[k + 3] / 255;        // 1 = clear photo, 0 = faded out
        const edge = 1 - photo;
        const p = phase[i];
        // the edge dissolves into characters; the boundary is uneven and drifts slowly
        const drift = reduceMotion ? 0 : 0.08 * Math.sin(t * 0.6 + x * 0.1 - y * 0.08 + p);
        const reach = halP[k + 3] / 255 + (blot[i] * 1.1 + drift) * edge;
        if (reach < 0.12 + p * 0.5) continue;
        const her = perP[k] / 255 * (perP[k + 3] / 255);
        if (her > 0.35) continue;                 // no characters on her face, hair or clothes
        const r = pix[k], g = pix[k + 1], b = pix[k + 2];
        const lum = (r * 0.3 + g * 0.59 + b * 0.11) / 255;
        const wave = reduceMotion ? 0 : 0.1 * Math.sin(t * 1.1 + x * 0.33 + y * 0.21 + p * 6);
        // on the photo: light glyphs, brighter = denser. In the faded edge: the photo's own
        // colour carried by the characters, darker = denser
        const dense = photo * lum + edge * (0.25 + (1 - lum) * 0.75);
        let level = Math.round(Math.max(0, Math.min(1, dense + wave)) * (LEVELS.length - 1));
        if (p < 0.15 && !reduceMotion) level = (level + tick + Math.floor(p * 40)) % LEVELS.length;
        const lift = photo * (0.6 + lum * 0.3);  // lighten on the photo, keep true colour at the edge
        ctx.fillStyle = `rgb(${Math.round(r + (255 - r) * lift)},${Math.round(g + (255 - g) * lift)},${Math.round(b + (255 - b) * lift)})`;
        ctx.globalAlpha = (1 - her) * Math.min(1, reach * 1.3) * (photo * (0.22 + lum * 0.4) + edge * 0.75);
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
  person.addEventListener("load", () => layout());
  addEventListener("resize", () => layout());
})();
