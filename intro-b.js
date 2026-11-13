// Front page, option B: mostly ASCII. The cyanotype wall redrawn in fine
// blue characters over a faint hint of its soft shadows. The shadows drift,
// sway and shimmer; the name is set in a bold monospace built from dense
// characters and stays still.
(() => {
  const view = document.querySelector(".intro-view");
  if (!view) return;

  const canvas = document.createElement("canvas");
  canvas.className = "intro-wall";
  canvas.setAttribute("aria-hidden", "true");
  view.prepend(canvas);
  const ctx = canvas.getContext("2d");

  const make = () => { const c = document.createElement("canvas"); return [c, c.getContext("2d", { willReadFrequently: true })]; };
  const [sample, sampleCtx] = make();  // the image, one pixel per character cell
  const [nameMask, nameCtx] = make();  // the name, one pixel per character cell

  const source = new Image();
  source.src = "assets/intro-cyanotype.jpg";
  let sourceReady = false;
  source.onload = () => { sourceReady = true; draw(performance.now()); };

  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const NAME = "sophia";
  const NAME_GLYPHS = ["#", "@", "&", "%", "#", "$"];
  const NAME_FONT = '"Space Mono", "DejaVu Sans Mono", "Liberation Mono", Menlo, monospace';
  const MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace';
  const PAPER = "#f8f8f6";
  const INK = "rgb(58, 96, 148)";
  const INK_FAINT = "rgba(84, 122, 170, 0.6)";
  const NAME_INK = "rgb(30, 60, 108)";
  const LEVELS = [[" "], [".", "`", "'"], [":", ",", "-"], ["~", "-", ";", "\""], ["=", "+", "/"], ["+", "*", "x"], ["x", "X", "%"], ["X", "#", "&"]];

  let W = 0, H = 0, dpr = 1, mobile = false;
  let cols = 0, rows = 0, cellW = 7, cellH = 12, fontPx = 11;
  let gust = 0, lastPointer = null;
  let keepClear = new Uint8Array(0), cellPhase = new Float32Array(0), nameCells = new Uint8Array(0);

  function layout() {
    W = view.clientWidth; H = view.clientHeight;
    dpr = Math.min(devicePixelRatio || 1, 2);
    mobile = W < 700;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    fontPx = mobile ? 7 : 9;
    ctx.font = `${fontPx}px ${MONO}`;
    cellW = Math.max(4, ctx.measureText("X").width);
    cellH = Math.round(fontPx * 1.18);
    cols = Math.ceil(W / cellW) + 1;
    rows = Math.ceil(H / cellH) + 1;
    sample.width = nameMask.width = cols;
    sample.height = nameMask.height = rows;
    cellPhase = new Float32Array(cols * rows).map(() => Math.random());

    // keep the page text readable
    keepClear = new Uint8Array(cols * rows);
    const box = view.getBoundingClientRect();
    const targets = [...view.querySelectorAll(".intro-line, .intro-hint"), ...document.querySelectorAll(".site-header .logo, .site-header nav > *")];
    for (const el of targets) {
      const r = el.getBoundingClientRect();
      if (!r.width) continue;
      const pad = 10;
      const x0 = Math.max(0, Math.floor((r.left - box.left - pad) / cellW)), x1 = Math.min(cols - 1, Math.ceil((r.right - box.left + pad) / cellW));
      const y0 = Math.max(0, Math.floor((r.top - box.top - pad) / cellH)), y1 = Math.min(rows - 1, Math.ceil((r.bottom - box.top + pad) / cellH));
      for (let y = y0; y <= y1; y += 1) keepClear.fill(1, y * cols + x0, y * cols + x1 + 1);
    }

    // the name is still, so its cells are worked out once
    nameCtx.setTransform(1, 0, 0, 1, 0, 0);
    nameCtx.clearRect(0, 0, cols, rows);
    nameCtx.setTransform(cols / W, 0, 0, rows / H, 0, 0);
    const size = mobile ? Math.min(W * 0.27, H * 0.14) : Math.min(W * 0.14, H * 0.26, 240);
    nameCtx.font = `700 ${size}px ${NAME_FONT}`;
    nameCtx.textAlign = "center";
    nameCtx.textBaseline = "middle";
    nameCtx.fillStyle = nameCtx.strokeStyle = "#000";
    nameCtx.translate((mobile ? 0.52 : 0.6) * W, (mobile ? 0.58 : 0.56) * H);
        nameCtx.fillText(NAME, 0, 0);
    nameCtx.lineWidth = size * (mobile ? 0.04 : 0.02);
    nameCtx.strokeText(NAME, 0, 0);
    const nm = nameCtx.getImageData(0, 0, cols, rows).data;
    nameCells = new Uint8Array(cols * rows);
    for (let i = 0; i < nameCells.length; i += 1) nameCells[i] = nm[i * 4 + 3] > 90 ? 1 : 0;
  }

  const wave = (t, a, b) => (reduceMotion ? 0 : Math.sin(t * a + b));

  // Where the image sits this frame: cover-fit, drifting slowly.
  function placement(t) {
    const ratio = source.naturalWidth / source.naturalHeight;
    const scale = Math.max(W / ratio, H) * (1.05 + wave(t, 0.11, 0) * 0.015);
    const iw = ratio * scale, ih = scale;
    const posX = mobile ? 0.22 : 0.5;
    return {
      x: (W - iw) * posX + wave(t, 0.17, 1) * W * 0.008 + gust * W * 0.01,
      y: (H - ih) * 0.5 + wave(t, 0.13, 2) * H * 0.008,
      w: iw, h: ih,
    };
  }

  function draw(time) {
    const t = reduceMotion ? 6 : time / 1000;
    gust *= 0.95;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = 1;
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, W, H);

    // 1. the soft shadows: the cyanotype itself, underneath
    sampleCtx.setTransform(1, 0, 0, 1, 0, 0);
    sampleCtx.fillStyle = PAPER;
    sampleCtx.fillRect(0, 0, cols, rows);
    if (sourceReady) {
      const p = placement(t);
      ctx.globalAlpha = 0.3;
      ctx.drawImage(source, p.x, p.y, p.w, p.h);
      ctx.globalAlpha = 1;
      sampleCtx.setTransform(cols / W, 0, 0, rows / H, 0, 0);
      sampleCtx.drawImage(source, p.x, p.y, p.w, p.h);
    }
    const px = sampleCtx.getImageData(0, 0, cols, rows).data;

    // 2. the ASCII layer, one string per row per colour
    ctx.font = `${fontPx}px ${MONO}`;
    ctx.textBaseline = "top";
    const last = LEVELS.length - 1;
    const tick = Math.floor(t * 5);
    for (let y = 0; y < rows; y += 1) {
      let wall = "", faint = "", name = "";
      // leaf-shadow sway: each row samples slightly to the side, in slow waves
      const shift = reduceMotion ? 0 : Math.round(Math.sin(y * 0.11 + t * 0.55) * 1.3 + Math.sin(y * 0.043 - t * 0.31) * 1.6 + gust * 2);
      for (let x = 0; x < cols; x += 1) {
        const c = y * cols + x;
        if (keepClear[c]) { wall += " "; faint += " "; name += " "; continue; }
        if (nameCells[c]) {
          wall += " "; faint += " ";
          const q = cellPhase[c];
          name += NAME_GLYPHS[(q < 0.2 && !reduceMotion ? Math.floor(q * 53 + tick) : Math.floor(q * 17)) % NAME_GLYPHS.length];
          continue;
        }
        name += " ";
        const sx = Math.min(cols - 1, Math.max(0, x + shift));
        const sk = (y * cols + sx) * 4;
        const lum = (px[sk] * 0.3 + px[sk + 1] * 0.59 + px[sk + 2] * 0.11) / 255;
        let d = (0.95 - lum) / 0.5;
        d += 0.05 * wave(t, 0.9, x * 0.31 + y * 0.17) * wave(t, 0.6, x * 0.07 - y * 0.23);
        d = Math.min(1, Math.max(0, d));
        const set = LEVELS[Math.round(Math.pow(d, 0.8) * last)];
        // shimmer: about one cell in seven keeps swapping between same-density glyphs
        const p = cellPhase[c];
        const pick = p < 0.15 && !reduceMotion ? Math.floor(p * 97 + tick) : Math.floor(p * 31);
        const g = set[pick % set.length];
        if (d < 0.42) { faint += g; wall += " "; } else { wall += g; faint += " "; }
      }
      const py = y * cellH;
      ctx.fillStyle = INK_FAINT;
      ctx.fillText(faint, 0, py);
      ctx.fillStyle = INK;
      ctx.fillText(wall, 0, py);
      ctx.fillStyle = NAME_INK;
      ctx.fillText(name, 0, py);
    }
  }

  let last = 0;
  function loop(now) {
    requestAnimationFrame(loop);
    if (document.body.dataset.view !== "intro" || now - last < 60) return;
    last = now;
    draw(now);
  }

  window.addEventListener("pointermove", (event) => {
    if (document.body.dataset.view !== "intro" || reduceMotion) return;
    if (lastPointer) {
      const dx = event.clientX - lastPointer[0];
      gust = Math.max(-1, Math.min(1, gust + Math.sign(dx) * Math.min(Math.abs(dx), 40) * 0.003));
    }
    lastPointer = [event.clientX, event.clientY];
  }, { passive: true });

  let resizeTimer = 0;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { layout(); draw(performance.now()); }, 120);
  });

  layout();
  draw(performance.now());
  (document.fonts ? Promise.all([document.fonts.load(`700 100px ${NAME_FONT}`), document.fonts.load(`9px ${MONO}`)]) : Promise.resolve()).finally(() => {
    layout();
    draw(performance.now());
    if (!reduceMotion) requestAnimationFrame(loop);
  });
})();
