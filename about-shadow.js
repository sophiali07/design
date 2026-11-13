// About page: blue plant shadows on a white wall, drawn as moving ASCII.
// Leafy branches sway from their stems; leaves flutter; characters shimmer.
(() => {
  const panel = document.querySelector(".about-panel");
  if (!panel) return;

  const canvas = document.createElement("canvas");
  canvas.className = "about-shadow";
  canvas.setAttribute("aria-hidden", "true");
  panel.prepend(canvas);
  const ctx = canvas.getContext("2d");
  const field = document.createElement("canvas");
  const fieldCtx = field.getContext("2d", { willReadFrequently: true });
  const soft = document.createElement("canvas");
  const softCtx = soft.getContext("2d");

  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasFilter = "filter" in CanvasRenderingContext2D.prototype;
  const MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace';
  const PAPER = "#f8f8f6";
  const SHADE = "rgba(96, 134, 182, 0.16)";
  const FAINT = "rgba(84, 122, 170, 0.55)";
  const STRONG = "rgb(70, 108, 160)";
  const LEVELS = [[" "], [".", "`", "'"], [":", ",", "-"], ["~", "-", ";", "\""], ["=", "+", "/"], ["+", "*", "x"], ["x", "X", "%"], ["X", "#", "&"]];

  let W = 0, H = 0, dpr = 1, mobile = false, cols = 0, rows = 0, cellW = 6, cellH = 11, fontPx = 9;
  let cellPhase = new Float32Array(0), branches = [];

  const rng = (seed) => () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  function makeBranch(r, ax, ay, angle, length, scale, depth = 0) {
    const leaves = [];
    const count = Math.round(5 + r() * 3);
    for (let i = 0; i < count; i += 1) {
      const along = 0.14 + (i / count) * 0.86;
      const side = i % 2 ? 1 : -1;
      leaves.push({ along, side, size: scale * (1.05 - along * 0.3) * (0.8 + r() * 0.4), tilt: (0.6 + r() * 0.5) * side, wide: 0.32 + r() * 0.12, phase: r() * 6.28 });
    }
    leaves.push({ along: 1, side: 0, size: scale * 0.85, tilt: (r() - 0.5) * 0.3, wide: 0.34, phase: r() * 6.28 });
    const children = [];
    if (depth < 1) for (let i = 0, n = 1 + Math.round(r()); i < n; i += 1) {
      children.push({ along: 0.3 + r() * 0.45, branch: makeBranch(r, 0, 0, (r() > 0.5 ? 1 : -1) * (0.5 + r() * 0.35), length * (0.35 + r() * 0.2), scale * 0.85, depth + 1) });
    }
    return { ax, ay, angle, length, leaves, children, phase: r() * 6.28, bend: (r() - 0.5) * 0.25 };
  }

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
    field.width = cols; field.height = rows;
    soft.width = Math.max(1, Math.round(W / 4)); soft.height = Math.max(1, Math.round(H / 4));
    cellPhase = new Float32Array(cols * rows).map(() => Math.random());

    // branches reaching in from the edges, mostly on the left and along the bottom
    const r = rng(41);
    const s = Math.min(W, H * 1.5);
    const k = mobile ? 1.6 : 1;
    branches = mobile
      ? [
          makeBranch(r, -0.05 * W, 0.04 * H, Math.PI * 0.18, 0.7 * W, s * 0.13),
          makeBranch(r, 1.05 * W, 0.86 * H, Math.PI * 1.1, 0.75 * W, s * 0.12),
          makeBranch(r, 0.3 * W, 1.05 * H, -Math.PI * 0.4, 0.3 * H, s * 0.11),
        ]
      : [
          makeBranch(r, -0.03 * W, 0.06 * H, Math.PI * 0.12, 0.42 * W, s * 0.075 * k),
          makeBranch(r, 0.04 * W, -0.05 * H, Math.PI * 0.38, 0.62 * H, s * 0.07 * k),
          makeBranch(r, -0.04 * W, 0.78 * H, -Math.PI * 0.1, 0.36 * W, s * 0.068 * k),
          makeBranch(r, 0.42 * W, 1.06 * H, -Math.PI * 0.62, 0.42 * H, s * 0.062 * k),
          makeBranch(r, 1.04 * W, 0.12 * H, Math.PI * 0.8, 0.32 * H, s * 0.055 * k),
        ];
  }

  const wave = (t, a, b) => (reduceMotion ? 0 : Math.sin(t * a + b));
  const sway = (t, phase, amp) => (reduceMotion ? 0 : (Math.sin(t * 0.45 + phase) * 0.65 + Math.sin(t * 0.21 + phase * 1.7) * 0.35) * amp);

  function leafPath(c, len, wide) {
    c.moveTo(0, 0);
    c.bezierCurveTo(len * 0.18, -len * wide, len * 0.62, -len * wide * 0.95, len, 0);
    c.bezierCurveTo(len * 0.62, len * wide * 0.95, len * 0.18, len * wide, 0, 0);
  }

  function drawBranch(c, b, t) {
    c.save();
    c.translate(b.ax, b.ay);
    c.rotate(b.angle + sway(t, b.phase, 0.07));
    c.beginPath(); c.moveTo(0, 0);
    c.quadraticCurveTo(b.length * 0.5, b.length * b.bend, b.length, 0);
    c.lineWidth = Math.max(3, b.length * 0.012);
    c.stroke();
    for (const l of b.leaves) {
      c.save();
      c.translate(b.length * l.along, 2 * b.length * b.bend * l.along * (1 - l.along));
      c.rotate(l.tilt + sway(t * 1.9, l.phase, 0.14));
      c.beginPath(); leafPath(c, l.size, l.wide); c.fill();
      c.restore();
    }
    for (const ch of b.children) drawBranch(c, { ...ch.branch, ax: b.length * ch.along, ay: 2 * b.length * b.bend * ch.along * (1 - ch.along) }, t);
    c.restore();
  }

  function draw(time) {
    if (!cols) return;
    const t = reduceMotion ? 6 : time / 1000;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, W, H);

    // soft shadow underneath, so it reads as shadow and not just type
    softCtx.setTransform(1, 0, 0, 1, 0, 0);
    softCtx.clearRect(0, 0, soft.width, soft.height);
    softCtx.setTransform(soft.width / W, 0, 0, soft.height / H, 0, 0);
    if (hasFilter) softCtx.filter = "blur(2px)";
    softCtx.fillStyle = softCtx.strokeStyle = SHADE;
    branches.forEach((b) => drawBranch(softCtx, b, t));
    softCtx.filter = "none";
    ctx.drawImage(soft, 0, 0, W, H);

    // the ASCII
    fieldCtx.setTransform(1, 0, 0, 1, 0, 0);
    fieldCtx.clearRect(0, 0, cols, rows);
    fieldCtx.setTransform(cols / W, 0, 0, rows / H, 0, 0);
    fieldCtx.fillStyle = fieldCtx.strokeStyle = "rgba(0,0,0,0.9)";
    branches.forEach((b) => drawBranch(fieldCtx, b, t));
    const fd = fieldCtx.getImageData(0, 0, cols, rows).data;

    ctx.font = `${fontPx}px ${MONO}`;
    ctx.textBaseline = "top";
    const last = LEVELS.length - 1;
    const tick = Math.floor(t * 5);
    for (let y = 0; y < rows; y += 1) {
      let faint = "", strong = "";
      for (let x = 0; x < cols; x += 1) {
        const c = y * cols + x;
        let d = fd[c * 4 + 3] / 255;
        if (d < 0.04) { faint += " "; strong += " "; continue; }
        d += 0.05 * wave(t, 0.9, x * 0.31 + y * 0.17);
        d = Math.min(1, Math.max(0, d));
        const set = LEVELS[Math.round(Math.pow(d, 0.85) * last)];
        const p = cellPhase[c];
        const g = set[(p < 0.15 && !reduceMotion ? Math.floor(p * 97 + tick) : Math.floor(p * 31)) % set.length];
        if (d < 0.45) { faint += g; strong += " "; } else { strong += g; faint += " "; }
      }
      ctx.fillStyle = FAINT; ctx.fillText(faint, 0, y * cellH);
      ctx.fillStyle = STRONG; ctx.fillText(strong, 0, y * cellH);
    }
  }

  let last = 0;
  function loop(now) {
    requestAnimationFrame(loop);
    if (!panel.classList.contains("is-visible") || now - last < 50) return;
    if (panel.clientWidth !== W || panel.clientHeight !== H) layout();
    last = now;
    draw(now);
  }
  layout();
  draw(performance.now());
  requestAnimationFrame(loop);
  addEventListener("resize", () => { layout(); draw(performance.now()); });
})();
