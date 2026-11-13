// Front page: a sunlit wall with a window shadow, swaying leaf shadows,
// the name written in light inside the shadow, and an ASCII dissolve.
(() => {
  const view = document.querySelector(".intro-view");
  if (!view) return;

  const canvas = document.createElement("canvas");
  canvas.className = "intro-wall";
  canvas.setAttribute("aria-hidden", "true");
  view.prepend(canvas);
  const grain = document.createElement("div");
  grain.className = "intro-grain";
  grain.setAttribute("aria-hidden", "true");
  canvas.after(grain);

  const ctx = canvas.getContext("2d");
  const soft = document.createElement("canvas");
  const softCtx = soft.getContext("2d");
  const field = document.createElement("canvas");
  const fieldCtx = field.getContext("2d", { willReadFrequently: true });
  const softRaw = document.createElement("canvas");
  const softRawCtx = softRaw.getContext("2d");
  const leafRaw = document.createElement("canvas");
  const leafRawCtx = leafRaw.getContext("2d");
  const leafSoft = document.createElement("canvas");
  const leafSoftCtx = leafSoft.getContext("2d");
  const type = document.createElement("canvas");
  const typeCtx = type.getContext("2d");

  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasFilter = "filter" in CanvasRenderingContext2D.prototype;
  const NAME = "Sophia";
  const SERIF = '"Instrument Serif", "Cormorant Garamond", Georgia, serif';
  const MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';
  const SHADOW = [74, 106, 150];
  const LIGHT = "rgb(250, 245, 234)";

  // Glyph ramp from light to dense, mixing the two ASCII references.
  const RAMP = [
    [" "],
    [".", "`", "'", "."],
    [":", ",", "-", ":"],
    ["-", "~", ";", "\"", "="],
    ["=", "+", "/", "\\", "|", "(", ")"],
    ["+", "t", "{", "}", "[", "]", "1", "x"],
    ["x", "j", "f", "u", "n", "v", "X"],
    ["X", "X", "#", "m", "w", "&", "%", "X"],
  ];

  let W = 0, H = 0, dpr = 1, mobile = false;
  let branches = [];
  let cols = 0, rows = 0, cellW = 8, cellH = 13;
  let cellSeed = new Float32Array(0);
  let gust = 0, lastPointer = null;

  const rng = (seed) => () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  // Window shadow: a slanted block, as if the sun comes in at an angle.
  function block() {
    return mobile
      ? { tl: [0.05 * W, -0.05 * H], tr: [0.86 * W, -0.05 * H], br: [0.74 * W, 0.62 * H], bl: [-0.04 * W, 0.62 * H] }
      : { tl: [0.11 * W, -0.06 * H], tr: [0.61 * W, -0.06 * H], br: [0.52 * W, 0.80 * H], bl: [0.03 * W, 0.80 * H] };
  }
  const rightEdgeAt = (b, y) => {
    const t = (y - b.tr[1]) / (b.br[1] - b.tr[1]);
    return b.tr[0] + (b.br[0] - b.tr[0]) * Math.min(1, Math.max(0, t));
  };

  function makeBranch(rand, ax, ay, angle, length, leafScale, depth = 0, sparse = false) {
    const leaves = [];
    const count = Math.round((sparse ? 7 : 11) + rand() * (sparse ? 3 : 5));
    for (let i = 0; i < count; i += 1) {
      const along = 0.12 + (i / count) * 0.88;
      const side = i % 2 ? 1 : -1;
      const size = leafScale * (1.15 - along * 0.55) * (0.75 + rand() * 0.5);
      leaves.push({ along, side, size, tilt: (0.5 + rand() * 0.7) * side, phase: rand() * Math.PI * 2, wide: 0.36 + rand() * 0.16 });
    }
    const children = [];
    if (depth < 1) {
      const n = (sparse ? 2 : 3) + Math.round(rand());
      for (let i = 0; i < n; i += 1) {
        children.push({ along: 0.3 + rand() * 0.45, branch: makeBranch(rand, 0, 0, (rand() > 0.5 ? 1 : -1) * (0.45 + rand() * 0.4), length * (0.35 + rand() * 0.2), leafScale * 0.8, depth + 1, sparse) });
      }
    }
    return { ax, ay, angle, length, leaves, children, phase: rand() * Math.PI * 2, bend: (rand() - 0.5) * 0.5 };
  }

  function layout() {
    W = view.clientWidth; H = view.clientHeight;
    dpr = Math.min(devicePixelRatio || 1, 2);
    mobile = W < 700;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    type.width = canvas.width; type.height = canvas.height;
    soft.width = softRaw.width = leafRaw.width = leafSoft.width = Math.max(1, Math.round(W / 4));
    soft.height = softRaw.height = leafRaw.height = leafSoft.height = Math.max(1, Math.round(H / 4));
    cellW = mobile ? 7 : 8; cellH = mobile ? 11 : 13;
    cols = Math.ceil(W / cellW); rows = Math.ceil(H / cellH);
    field.width = cols; field.height = rows;
    const r = rng(7);
    cellSeed = new Float32Array(cols * rows).map(() => r());

    const rand = rng(2026);
    const s = Math.min(W, H * 1.4);
    const shadow = (b) => Object.assign(b, { role: "shadow" });
    const light = (b) => Object.assign(b, { role: "light" });
    branches = mobile
      ? [
          shadow(makeBranch(rand, 1.05 * W, 0.56 * H, Math.PI * 0.88, 0.5 * H, s * 0.13, 0, true)),
          light(makeBranch(rand, -0.06 * W, 0.08 * H, Math.PI * 0.12, 0.62 * W, s * 0.12)),
          light(makeBranch(rand, 0.55 * W, 0.66 * H, -Math.PI * 0.7, 0.32 * H, s * 0.1)),
        ]
      : [
          shadow(makeBranch(rand, 1.04 * W, 0.08 * H, Math.PI * 0.76, 0.72 * H, s * 0.09, 0, true)),
          shadow(makeBranch(rand, 0.74 * W, 1.08 * H, -Math.PI * 0.56, 0.42 * H, s * 0.075, 0, true)),
          light(makeBranch(rand, 0.02 * W, -0.04 * H, Math.PI * 0.2, 0.4 * W, s * 0.07)),
          light(makeBranch(rand, 0.12 * W, 0.86 * H, -Math.PI * 0.3, 0.3 * W, s * 0.06)),
        ];
  }

  function leafPath(c, len, wide) {
    c.moveTo(0, 0);
    c.bezierCurveTo(len * 0.25, -len * wide, len * 0.7, -len * wide * 0.8, len, 0);
    c.bezierCurveTo(len * 0.7, len * wide * 0.8, len * 0.25, len * wide, 0, 0);
  }

  function drawBranch(c, b, t, sway) {
    c.save();
    c.translate(b.ax, b.ay);
    const swing = sway * (Math.sin(t * 0.32 + b.phase) * 0.028 + Math.sin(t * 0.71 + b.phase * 1.7) * 0.012) + gust * 0.06;
    c.rotate(b.angle + swing);
    // stem as a gentle curve
    c.beginPath();
    c.moveTo(0, 0);
    c.quadraticCurveTo(b.length * 0.5, b.length * b.bend * 0.2, b.length, b.length * b.bend * 0.1);
    c.lineWidth = Math.max(1.5, b.length * 0.012);
    c.stroke();
    for (const leaf of b.leaves) {
      const x = b.length * leaf.along;
      const y = b.length * b.bend * 0.2 * (2 * leaf.along * (1 - leaf.along)) + b.length * b.bend * 0.1 * leaf.along * leaf.along;
      c.save();
      c.translate(x, y);
      c.rotate(leaf.tilt + sway * Math.sin(t * 1.1 + leaf.phase) * 0.07 + gust * 0.12 * leaf.side);
      c.beginPath();
      leafPath(c, leaf.size, leaf.wide);
      c.fill();
      c.restore();
    }
    for (const child of b.children) {
      const sub = { ...child.branch, ax: b.length * child.along, ay: 0, angle: child.branch.angle };
      drawBranch(c, sub, t, sway);
    }
    c.restore();
  }

  // Draws the shadow-casting shapes in the current fill colour; "light"
  // leaves are cut out of the block as sun dapples.
  function drawShapes(c, t, { blockAlpha = 1, leafAlpha = 1, lightAlpha = 0, withBlock = true }) {
    const b = block();
    const sway = reduceMotion ? 0 : 1;
    if (withBlock) {
      c.globalAlpha = blockAlpha;
      c.beginPath();
      c.moveTo(...b.tl); c.lineTo(...b.tr); c.lineTo(...b.br); c.lineTo(...b.bl);
      c.closePath();
      c.fill();
    }
    c.globalAlpha = leafAlpha;
    branches.filter((br) => br.role === "shadow").forEach((br) => drawBranch(c, br, t, sway));
    if (lightAlpha > 0) {
      const op = c.globalCompositeOperation;
      c.globalCompositeOperation = "destination-out";
      c.globalAlpha = lightAlpha;
      branches.filter((br) => br.role === "light").forEach((br) => drawBranch(c, br, t, sway * 1.2));
      c.globalCompositeOperation = op;
    }
    c.globalAlpha = 1;
  }

  // Where the wall turns into ASCII: just inside the block's right edge.
  const band = () => (mobile ? 0.16 : 0.09) * W;
  const asciiWeight = (b, x, y) => {
    const edge = rightEdgeAt(b, y);
    const start = edge - band() * 1.1, end = edge - band() * 0.25;
    const k = Math.min(1, Math.max(0, (x - start) / (end - start)));
    // keep the header links and the scroll cue clear
    const header = Math.min(1, Math.max(0, (y - H * (mobile ? 0.06 : 0.07)) / (H * 0.05)));
    const cue = mobile ? 1 : Math.min(1, Math.max(0, (H * 0.85 - y) / (H * 0.05)) + Math.max(0, (W * 0.84 - x) / (W * 0.04)));
    return k * k * (3 - 2 * k) * (x > W * 0.6 || mobile ? header : 1) * Math.min(1, cue);
  };

  function blurField(data) {
    const out = new Float32Array(cols * rows);
    for (let i = 0; i < cols * rows; i += 1) out[i] = data[i * 4 + 3] / 255;
    const tmp = new Float32Array(out.length);
    const pass = (src, dst, dx, dy, r) => {
      for (let y = 0; y < rows; y += 1) for (let x = 0; x < cols; x += 1) {
        let sum = 0, n = 0;
        for (let k = -r; k <= r; k += 1) {
          const xx = x + k * dx, yy = y + k * dy;
          if (xx < 0 || yy < 0 || xx >= cols || yy >= rows) continue;
          sum += src[yy * cols + xx]; n += 1;
        }
        dst[y * cols + x] = sum / n;
      }
    };
    pass(out, tmp, 1, 0, 1); pass(tmp, out, 0, 1, 1);
    return out;
  }

  function render(time) {
    const t = reduceMotion ? 12 : time / 1000;
    const b = block();
    gust *= 0.94;

    // 1. warm lit wall
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "#f3eee4";
    ctx.fillRect(0, 0, W, H);
    const glow = ctx.createRadialGradient(W * 0.78, H * 0.28, 0, W * 0.78, H * 0.28, Math.max(W, H) * 0.75);
    glow.addColorStop(0, "rgba(255, 228, 170, 0.42)");
    glow.addColorStop(0.55, "rgba(252, 214, 196, 0.16)");
    glow.addColorStop(1, "rgba(243, 238, 228, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    // 2. soft shadow layer (drawn once, blurred once), faded where the ASCII takes over
    const sx = soft.width / W, sy = soft.height / H;
    softRawCtx.setTransform(1, 0, 0, 1, 0, 0);
    softRawCtx.clearRect(0, 0, soft.width, soft.height);
    softRawCtx.setTransform(sx, 0, 0, sy, 0, 0);
    softRawCtx.fillStyle = softRawCtx.strokeStyle = `rgb(${SHADOW.join(",")})`;
    const breathe = reduceMotion ? 0 : Math.sin(t * 0.21) * 0.02;
    drawShapes(softRawCtx, t, { blockAlpha: 0.8 + breathe, leafAlpha: 0.42, lightAlpha: 0.5 });
    softCtx.setTransform(1, 0, 0, 1, 0, 0);
    softCtx.clearRect(0, 0, soft.width, soft.height);
    if (hasFilter) softCtx.filter = `blur(${mobile ? 1 : 1.4}px)`;
    softCtx.drawImage(softRaw, 0, 0);
    softCtx.filter = "none";
    softCtx.setTransform(sx, 0, 0, sy, 0, 0);
    softCtx.globalCompositeOperation = "destination-out";
    const fadeStart = rightEdgeAt(b, H * 0.4) - band() * 1.1;
    const fade = softCtx.createLinearGradient(fadeStart, 0, fadeStart + band() * 0.85, 0);
    fade.addColorStop(0, "rgba(0,0,0,0)");
    fade.addColorStop(1, "rgba(0,0,0,1)");
    softCtx.fillStyle = fade;
    // follow the slanted edge
    const skew = (b.br[0] - b.tr[0]) / (b.br[1] - b.tr[1]);
    softCtx.save();
    softCtx.translate(0, H * 0.4);
    softCtx.transform(1, 0, skew, 1, 0, 0);
    softCtx.translate(0, -H * 0.4);
    softCtx.fillRect(-W, -H, W * 3, H * 3);
    softCtx.restore();
    softCtx.globalCompositeOperation = "source-over";
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(soft, 0, 0, W, H);

    // 3. the name, in light, with leaf shadows passing over it
    typeCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    typeCtx.clearRect(0, 0, W, H);
    const size = mobile ? Math.min(W * 0.19, H * 0.13) : Math.min(W * 0.125, H * 0.26, 240);
    typeCtx.font = `italic 400 ${size}px ${SERIF}`;
    typeCtx.textAlign = "center";
    typeCtx.textBaseline = "alphabetic";
    const nameY = mobile ? H * 0.40 : H * 0.55;
    const centre = ((mobile ? b.bl[0] + 0.08 * W : b.bl[0] + 0.05 * W) + rightEdgeAt(b, nameY) - band() * 1.3) / 2;
    typeCtx.shadowColor = "rgba(255, 246, 228, 0.55)";
    typeCtx.shadowBlur = size * 0.08;
    typeCtx.fillStyle = LIGHT;
    typeCtx.fillText(NAME, centre, nameY);
    typeCtx.shadowBlur = 0;
    leafRawCtx.setTransform(1, 0, 0, 1, 0, 0);
    leafRawCtx.clearRect(0, 0, leafRaw.width, leafRaw.height);
    leafRawCtx.setTransform(sx, 0, 0, sy, 0, 0);
    leafRawCtx.fillStyle = leafRawCtx.strokeStyle = `rgb(${SHADOW.join(",")})`;
    drawShapes(leafRawCtx, t, { leafAlpha: 0.5, withBlock: false });
    leafSoftCtx.clearRect(0, 0, leafSoft.width, leafSoft.height);
    if (hasFilter) leafSoftCtx.filter = "blur(2px)";
    leafSoftCtx.drawImage(leafRaw, 0, 0);
    leafSoftCtx.filter = "none";
    typeCtx.globalCompositeOperation = "source-atop";
    typeCtx.drawImage(leafSoft, 0, 0, W, H);
    typeCtx.globalCompositeOperation = "source-over";
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(type, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // 4. ASCII dissolve on the sunlit side
    fieldCtx.setTransform(1, 0, 0, 1, 0, 0);
    fieldCtx.clearRect(0, 0, cols, rows);
    fieldCtx.setTransform(cols / W, 0, 0, rows / H, 0, 0);
    fieldCtx.fillStyle = fieldCtx.strokeStyle = "#000";
    drawShapes(fieldCtx, t, { blockAlpha: 1, leafAlpha: 0.72, lightAlpha: 0.6 });
    const values = blurField(fieldCtx.getImageData(0, 0, cols, rows).data);
    ctx.font = `${cellH - 2}px ${MONO}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillStyle = `rgba(${SHADOW.join(",")}, 0.92)`;
    for (let y = 0; y < rows; y += 1) {
      const py = y * cellH;
      for (let x = 0; x < cols; x += 1) {
        const px = x * cellW;
        const w = asciiWeight(b, px, py);
        if (w <= 0.01) continue;
        const v = values[y * cols + x] * w;
        if (v < 0.07) continue;
        const level = Math.min(RAMP.length - 1, Math.round(Math.pow(v, 0.85) * (RAMP.length - 1)));
        const set = RAMP[level];
        const glyph = set[Math.floor(cellSeed[y * cols + x] * set.length)];
        if (glyph !== " ") ctx.fillText(glyph, px, py);
      }
    }
  }

  let frame = 0, last = 0;
  function loop(now) {
    frame = requestAnimationFrame(loop);
    if (document.body.dataset.view !== "intro" || now - last < 33) return;
    last = now;
    render(now);
  }

  window.addEventListener("pointermove", (event) => {
    if (document.body.dataset.view !== "intro" || reduceMotion) return;
    if (lastPointer) {
      const speed = Math.hypot(event.clientX - lastPointer[0], event.clientY - lastPointer[1]);
      gust = Math.max(-1, Math.min(1, gust + Math.sign(event.clientX - lastPointer[0]) * Math.min(speed, 40) * 0.004));
    }
    lastPointer = [event.clientX, event.clientY];
  }, { passive: true });

  let resizeTimer = 0;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { layout(); render(performance.now()); }, 120);
  });

  layout();
  render(performance.now());
  (document.fonts ? document.fonts.load(`italic 100px ${SERIF}`) : Promise.resolve()).finally(() => {
    render(performance.now());
    if (!reduceMotion) frame = requestAnimationFrame(loop);
  });
})();
