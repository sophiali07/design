(() => {
  const replacements = [
    {
      headings: ["box sketch"],
      src: "assets/battery-box-sketch-2026.jpg",
      className: "battery-updated-image battery-sketch-image",
    },
    {
      headings: ["story board", "storyboard"],
      src: "assets/battery-storyboard-2026.jpg",
      className: "battery-updated-image battery-storyboard-image",
    },
    {
      headings: ["physical recycling box", "physical prototype"],
      src: "assets/battery-physical-box-2026.jpg",
      className: "battery-updated-image battery-physical-image",
    },
  ];

  function normalizedText(element) {
    return (element?.textContent || "").trim().toLowerCase().replace(/\s+/g, " ");
  }

  function findHeading(labels) {
    const candidates = document.querySelectorAll("h1, h2, h3, h4, h5, h6, [class*='title']");
    return [...candidates].find((element) => labels.includes(normalizedText(element)));
  }

  function findNearestImage(heading) {
    let node = heading;
    for (let depth = 0; depth < 8 && node; depth += 1, node = node.parentElement) {
      const images = [...node.querySelectorAll("img")];
      if (images.length) return images[0];
    }
    return null;
  }

  function applyBatteryAssets() {
    replacements.forEach(({ headings, src, className }) => {
      const heading = findHeading(headings);
      const image = heading && findNearestImage(heading);
      if (!image) return;

      image.src = src;
      image.removeAttribute("srcset");
      image.removeAttribute("sizes");
      image.className = `${image.className || ""} ${className}`.trim();
      image.loading = "eager";
      image.decoding = "async";
    });
  }

  const style = document.createElement("style");
  style.textContent = `
    .battery-updated-image {
      display: block !important;
      width: auto !important;
      height: auto !important;
      object-fit: contain !important;
      object-position: center !important;
      margin-inline: auto !important;
    }
    .battery-sketch-image { max-width: min(680px, 82vw) !important; }
    .battery-storyboard-image { max-width: min(900px, 88vw) !important; }
    .battery-physical-image { max-width: min(560px, 76vw) !important; }
  `;
  document.head.appendChild(style);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyBatteryAssets, { once: true });
  } else {
    applyBatteryAssets();
  }

  [250, 750, 1500].forEach((delay) => setTimeout(applyBatteryAssets, delay));
})();
