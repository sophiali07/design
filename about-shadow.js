// About page: the cyanotype's leaf shadows as moving ASCII on the dark panel.
(() => {
  const panel = document.querySelector(".about-panel");
  if (!panel) return;

  const canvas = document.createElement("canvas");
  canvas.className = "about-shadow";
  canvas.setAttribute("aria-hidden", "true");
  panel.prepend(canvas);
  const ctx = canvas.getContext("2d");
  const sample = document.createElement("canvas");
  const sampleCtx = sample.getContext("2d", { willReadFrequently: true });

  const source = new Image();
  source.src = "assets/intro-cyanotype.jpg";
  let ready = false;
  source.onload = () => { ready = true; layout(); draw(performance.now()); };

  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace';
  const BG = "#080808";
  const FAINT = "rgba(115, 155, 210, 0.42)";
  const STRONG = "rgba(135, 175, 228, 0.78)";
  const LEVELS = [[" "], [".", "`", "'"], [":", ",", "-"], ["~", "-", ";", "\""], ["=", "+", "/"], ["+", "*", "x"], ["x", "X", "%"], ["X", "#", "&"]];

  let W = 0, H = 0, dpr = 1, mobile = false, cols = 0, rows = 0, cellW = 6, cellH = 11, fontPx = 9;
  let cellPhase = new Float32Array(0);

  function layout() {
    W = panel.clientWidth; H = panel.clientHeight;
    if (!W || !H) return;
    dpr = Math.min(devicePixelRatio || 1, 2);
    mobile = W < 700;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    fontPx = mobile ? 7 : 9;
    ctx.font = `${fontPx}px ${MONO}`;
    cellW = Math.max(4, ctx.measureText("X").width);
    cellH = Math.round(fontPx * 1.18);
    cols = Math.ceil(W / cellW) + 1; rows = Math.ceil(H / cellH) + 1;
    sample.width = cols; sample.height = rows;
    cellPhase = new Float32Array(cols * rows).map(() => Math.random());
  }

  const wave = (t, a, b) => (reduceMotion ? 0 : Math.sin(t * a + b));

  function draw(time) {
    if (!cols) return;
    const t = reduceMotion ? 6 : time / 1000;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);
    if (!ready) return;

    // sample the print, drifting slowly
    const ratio = source.naturalWidth / source.naturalHeight;
    const scale = Math.max(W / ratio, H) * (1.08 + wave(t, 0.1, 0.5) * 0.015);
    const iw = ratio * scale, ih = scale;
    sampleCtx.setTransform(1, 0, 0, 1, 0, 0);
    sampleCtx.fillStyle = "#fff";
    sampleCtx.fillRect(0, 0, cols, rows);
    sampleCtx.setTransform(cols / W, 0, 0, rows / H, 0, 0);
    sampleCtx.drawImage(source, (W - iw) * (mobile ? 0.22 : 0.5) + wave(t, 0.16, 2) * W * 0.008, (H - ih) * 0.5 + wave(t, 0.12, 1) * H * 0.008, iw, ih);
    const px = sampleCtx.getImageData(0, 0, cols, rows).data;

    ctx.font = `${fontPx}px ${MONO}`;
    ctx.textBaseline = "top";
    const last = LEVELS.length - 1;
    const tick = Math.floor(t * 5);
    for (let y = 0; y < rows; y += 1) {
      let faint = "", strong = "";
      const shift = reduceMotion ? 0 : Math.round(Math.sin(y * 0.11 + t * 0.55) * 1.3 + Math.sin(y * 0.043 - t * 0.31) * 1.6);
      for (let x = 0; x < cols; x += 1) {
        const sx = Math.min(cols - 1, Math.max(0, x + shift));
        const k = (y * cols + sx) * 4;
        const lum = (px[k] * 0.3 + px[k + 1] * 0.59 + px[k + 2] * 0.11) / 255;
        let d = (0.95 - lum) / 0.5;
        d += 0.05 * wave(t, 0.9, x * 0.31 + y * 0.17) * wave(t, 0.6, x * 0.07 - y * 0.23);
        d = Math.min(1, Math.max(0, d));
        const set = LEVELS[Math.round(Math.pow(d, 0.8) * last)];
        const p = cellPhase[y * cols + x];
        const g = set[(p < 0.15 && !reduceMotion ? Math.floor(p * 97 + tick) : Math.floor(p * 31)) % set.length];
        if (d < 0.42) { faint += g; strong += " "; } else { strong += g; faint += " "; }
      }
      ctx.fillStyle = FAINT; ctx.fillText(faint, 0, y * cellH);
      ctx.fillStyle = STRONG; ctx.fillText(strong, 0, y * cellH);
    }
  }

  let last = 0;
  function loop(now) {
    requestAnimationFrame(loop);
    if (!panel.classList.contains("is-visible") || now - last < 60) return;
    if (panel.clientWidth !== W || panel.clientHeight !== H) layout();
    last = now;
    draw(now);
  }
  requestAnimationFrame(loop);
  addEventListener("resize", () => { layout(); draw(performance.now()); });
})();
