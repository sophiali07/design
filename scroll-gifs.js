// GIFs that only play when scrolled into view (and restart each time).
(() => {
  const gifs = [...document.querySelectorAll("img.scroll-gif[data-gif]")];
  if (!gifs.length) return;
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) return; // keep the still frame
  const blobs = new Map();

  async function play(img) {
    const url = img.dataset.gif;
    try {
      if (!blobs.has(url)) blobs.set(url, fetch(url).then((r) => r.blob()));
      const blob = await blobs.get(url);
      if (!img.classList.contains("is-in-view")) return;
      if (img.dataset.objectUrl) URL.revokeObjectURL(img.dataset.objectUrl);
      const objectUrl = URL.createObjectURL(blob); // a fresh URL restarts the animation from frame one
      img.dataset.objectUrl = objectUrl;
      img.src = objectUrl;
    } catch {
      img.src = url;
    }
  }

  function stop(img) {
    if (!img.dataset.poster) return;
    img.src = img.dataset.poster;
    if (img.dataset.objectUrl) { URL.revokeObjectURL(img.dataset.objectUrl); delete img.dataset.objectUrl; }
  }

  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      const img = entry.target;
      if (entry.isIntersecting && !img.classList.contains("is-in-view")) {
        img.classList.add("is-in-view");
        play(img);
      } else if (!entry.isIntersecting && img.classList.contains("is-in-view")) {
        img.classList.remove("is-in-view");
        stop(img);
      }
    }
  }, { threshold: 0.35 });

  gifs.forEach((img) => {
    img.dataset.poster = img.getAttribute("src");
    observer.observe(img);
  });
})();
