// About page: soft, grainy blue leaf shadows falling across a white wall,
// like a riso / cyanotype print. Kept to the left so the text stays the focus.
// Leaves sway slowly and the grain shimmers.
(() => {
  const panel = document.querySelector(".about-panel");
  if (!panel) return;

  const canvas = document.createElement("canvas");
  canvas.className = "about-shadow";
  canvas.setAttribute("aria-hidden", "true");
  panel.prepend(canvas);
  const ctx = canvas.getContext("2d");
  const make = () => { const c = document.createElement("canvas"); return [c, c.getContext("2d", { willReadFrequently: true })]; };
  const [far, farCtx] = make();        // quarter res, very blurred (far leaves)
  const [farBlur, farBlurCtx] = make();
  const [near, nearCtx] = make();      // quarter res, softly blurred (near leaves)
  const [nearBlur, nearBlurCtx] = make();
  const [mask, maskCtx] = make();      // half res, combined shadow
  const [print, printCtx] = make();    // half res, dithered ink

  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasFilter = "filter" in CanvasRenderingContext2D.prototype;
  const PAPER = "#f8f8f6";
  const INK = [74, 112, 164];

  let W = 0, H = 0, dpr = 1, mobile = false, MW = 0, MH = 0;
  let farBranches = [], nearBranches = [], noise = new Float32Array(0), out = null;

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
      const along = 0.12 + (i / count) * 0.88;
      const side = i % 2 ? 1 : -1;
      leaves.push({ along, side, size: scale * (1.05 - along * 0.3) * (0.75 + r() * 0.5), tilt: (0.5 + r() * 0.6) * side, wide: 0.3 + r() * 0.14, phase: r() * 6.28 });
    }
    const children = [];
    if (depth < 1) for (let i = 0, n = 1 + Math.round(r()); i < n; i += 1) {
      children.push({ along: 0.25 + r() * 0.5, branch: makeBranch(r, 0, 0, (r() > 0.5 ? 1 : -1) * (0.45 + r() * 0.4), length * (0.35 + r() * 0.25), scale * 0.85, depth + 1) });
    }
    return { ax, ay, angle, length, leaves, children, phase: r() * 6.28, bend: (r() - 0.5) * 0.3 };
  }

  function layout() {
    W = panel.clientWidth; H = panel.clientHeight;
    if (!W || !H) return;
    dpr = Math.min(devicePixelRatio || 1, 2);
    mobile = W < 700;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    MW = Math.max(1, Math.round(W / 2)); MH = Math.max(1, Math.round(H / 2));
    mask.width = print.width = MW; mask.height = print.height = MH;
    for (const c of [far, farBlur, near, nearBlur]) { c.width = Math.max(1, Math.round(W / 4)); c.height = Math.max(1, Math.round(H / 4)); }
    out = printCtx.createImageData(MW, MH);
    const nr = rng(5);
    noise = new Float32Array(MW * MH).map(() => nr());

    const r = rng(77);
    const s = Math.min(W, H * 1.5);
    // light falls from the upper left; shadows gather on the left and trail down
    farBranches = mobile
      ? [makeBranch(r, -0.1 * W, -0.05 * H, Math.PI * 0.32, 0.5 * H, s * 0.16), makeBranch(r, 0.6 * W, -0.08 * H, Math.PI * 0.62, 0.3 * H, s * 0.13)]
      : [
          makeBranch(r, -0.06 * W, -0.08 * H, Math.PI * 0.3, 0.7 * H, s * 0.1),
          makeBranch(r, -0.08 * W, 0.45 * H, Math.PI * 0.05, 0.4 * W, s * 0.09),
          makeBranch(r, 0.3 * W, 1.1 * H, -Math.PI * 0.42, 0.35 * H, s * 0.08),
        ];
    nearBranches = mobile
      ? [makeBranch(r, -0.05 * W, 0.02 * H, Math.PI * 0.2, 0.75 * W, s * 0.11)]
      : [
          makeBranch(r, -0.04 * W, 0.1 * H, Math.PI * 0.16, 0.36 * W, s * 0.06),
          makeBranch(r, 0.08 * W, -0.06 * H, Math.PI * 0.42, 0.5 * H, s * 0.055),
        ];
  }

  const sway = (t, phase, amp) => (reduceMotion ? 0 : (Math.sin(t * 0.4 + phase) * 0.65 + Math.sin(t * 0.19 + phase * 1.7) * 0.35) * amp);

  function leafPath(c, len, wide) {
    c.moveTo(0, 0);
    c.bezierCurveTo(len * 0.18, -len * wide, len * 0.62, -len * wide * 0.95, len, 0);
    c.bezierCurveTo(len * 0.62, len * wide * 0.95, len * 0.18, len * wide, 0, 0);
  }

  function drawBranch(c, b, t, k = 1) {
    c.save();
    c.translate(b.ax, b.ay);
    c.rotate(b.angle + sway(t, b.phase, 0.06 * k));
    c.beginPath(); c.moveTo(0, 0);
    c.quadraticCurveTo(b.length * 0.5, b.length * b.bend, b.length, 0);
    c.lineWidth = Math.max(2, b.length * 0.008);
    c.stroke();
    for (const l of b.leaves) {
      c.save();
      c.translate(b.length * l.along, 2 * b.length * b.bend * l.along * (1 - l.along));
      c.rotate(l.tilt + sway(t * 1.8, l.phase, 0.12 * k));
      c.beginPath(); leafPath(c, l.size, l.wide); c.fill();
      c.restore();
    }
    for (const ch of b.children) drawBranch(c, { ...ch.branch, ax: b.length * ch.along, ay: 2 * b.length * b.bend * ch.along * (1 - ch.along) }, t, k);
    c.restore();
  }

  function layer(src, srcCtx, dst, dstCtx, list, t, alpha, blur, k) {
    srcCtx.setTransform(1, 0, 0, 1, 0, 0);
    srcCtx.clearRect(0, 0, src.width, src.height);
    srcCtx.setTransform(src.width / W, 0, 0, src.height / H, 0, 0);
    srcCtx.fillStyle = srcCtx.strokeStyle = "#000";
    srcCtx.globalAlpha = alpha;
    list.forEach((b) => drawBranch(srcCtx, b, t, k));
    srcCtx.globalAlpha = 1;
    dstCtx.clearRect(0, 0, dst.width, dst.height);
    if (hasFilter) dstCtx.filter = `blur(${blur}px)`;
    dstCtx.drawImage(src, 0, 0);
    dstCtx.filter = "none";
  }

  function draw(time) {
    if (!MW) return;
    const t = reduceMotion ? 6 : time / 1000;

    layer(far, farCtx, farBlur, farBlurCtx, farBranches, t, 0.34, mobile ? 1.8 : 2.4, 1);
    layer(near, nearCtx, nearBlur, nearBlurCtx, nearBranches, t, 0.6, mobile ? 0.6 : 0.8, 1.3);

    maskCtx.clearRect(0, 0, MW, MH);
    maskCtx.drawImage(farBlur, 0, 0, MW, MH);
    maskCtx.drawImage(nearBlur, 0, 0, MW, MH);
    // keep the right side (where the words are) mostly clear
    maskCtx.globalCompositeOperation = "destination-out";
    const fade = maskCtx.createLinearGradient(MW * (mobile ? 0.2 : 0.42), 0, MW * (mobile ? 0.9 : 0.72), 0);
    fade.addColorStop(0, "rgba(0,0,0,0)");
    fade.addColorStop(1, "rgba(0,0,0,0.88)");
    maskCtx.fillStyle = fade;
    if (mobile) {
      const vf = maskCtx.createLinearGradient(0, MH * 0.32, 0, MH * 0.5);
      vf.addColorStop(0, "rgba(0,0,0,0)");
      vf.addColorStop(1, "rgba(0,0,0,0.8)");
      maskCtx.fillStyle = vf;
    }
    maskCtx.fillRect(0, 0, MW, MH);
    maskCtx.globalCompositeOperation = "source-over";

    // grain: dither the soft shadow into speckled ink; the grain shifts a little
    const src = maskCtx.getImageData(0, 0, MW, MH).data;
    const dst = out.data;
    const shift = reduceMotion ? 0 : (Math.floor(t * 6) % 4) * 7919;
    const n = noise.length;
    for (let i = 0, p = 0; i < n; i += 1, p += 4) {
      const a = src[p + 3] / 255;
      let alpha = 0;
      if (a > 0.02) {
        const v = Math.pow(a, 0.8);
        const z = noise[(i + shift) % n];
        alpha = v > z ? 210 : v > z * 0.5 ? 70 : 0;
      }
      dst[p] = INK[0]; dst[p + 1] = INK[1]; dst[p + 2] = INK[2]; dst[p + 3] = alpha;
    }
    printCtx.putImageData(out, 0, 0);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(print, 0, 0, canvas.width, canvas.height);
  }

  let last = 0;
  function loop(now) {
    requestAnimationFrame(loop);
    if (!panel.classList.contains("is-visible") || now - last < 60) return;
    if (panel.clientWidth !== W || panel.clientHeight !== H) layout();
    last = now;
    draw(now);
  }
  layout();
  draw(performance.now());
  requestAnimationFrame(loop);
  addEventListener("resize", () => { layout(); draw(performance.now()); });
})();
