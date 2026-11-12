(() => {
  const galleryImage = "assets/battery-gallery-original.jpg";
  const sketchImage = "assets/battery-box-sketch-correct.png";
  const normalize = (value) => (value || "").replace(/\s+/g, " ").trim().toLowerCase();
  const headings = () => Array.from(document.querySelectorAll("h1,h2,h3,h4,h5,h6"));
  const findHeading = (names) => headings().find((element) => names.includes(normalize(element.textContent)));

  const closestImage = (element) => {
    let node = element;
    for (let index = 0; node && index < 8; index += 1, node = node.parentElement) {
      const image = node.querySelector("img");
      if (image) return image;
    }
    return null;
  };

  const closestParagraph = (heading) => {
    let node = heading && heading.parentElement;
    for (let index = 0; node && index < 8; index += 1, node = node.parentElement) {
      const paragraph = Array.from(node.querySelectorAll("p")).find((item) => normalize(item.textContent));
      if (paragraph) return paragraph;
    }
    return null;
  };

  const replaceImage = (image, source) => {
    if (!image || image.getAttribute("src") === source) return;
    image.setAttribute("src", source);
    image.removeAttribute("srcset");
    image.removeAttribute("data-src");
  };

  const replaceCopy = (names, title, copy) => {
    const heading = findHeading(names);
    if (!heading) return;
    if (title && heading.textContent.trim() !== title) heading.textContent = title;
    const paragraph = closestParagraph(heading);
    if (paragraph && paragraph.textContent.trim() !== copy) paragraph.textContent = copy;
  };

  const patchBatteryProject = () => {
    Array.from(document.querySelectorAll("h1,h2,h3,h4,p,span,strong,a")).forEach((element) => {
      if (!normalize(element.textContent).includes("interactive battery recycling box")) return;
      const card = element.closest("a,article,section,.project-card,.work-item,.project-panel,.slide,.project") || element.parentElement;
      const image = (card && card.querySelector("img")) || closestImage(element);
      replaceImage(image, galleryImage);
    });

    Array.from(document.querySelectorAll('a[href*="battery-recycling-box"]')).forEach((link) => {
      const card = link.closest("article,section,.project-card,.work-item,.project-panel,.slide,.project") || link;
      if (normalize(card.textContent).includes("interactive battery")) replaceImage(card.querySelector("img"), galleryImage);
    });

    const boxSketch = findHeading(["box sketch"]);
    replaceImage(closestImage(boxSketch), sketchImage);

    replaceCopy(
      ["box sketch"],
      "Box sketch",
      "Explored different arrangements for the battery openings and experimented with how the front door could open to allow easy access to the collected batteries."
    );
    replaceCopy(
      ["story board", "storyboard"],
      null,
      "The storyboard follows a student's experience with the recycling box, starting with her uncertainty about which bin to use for her batteries. After noticing other students using the box, she becomes curious and decides to try it herself. She matches her battery to the correct shaped opening and scans the QR code with her phone to learn more about battery recycling."
    );
    replaceCopy(
      ["physical recycling box"],
      null,
      "Easy to obtain and fast to produce. Used an Amazon cardboard box as the base material and a pre-made laser-cutting file for the battery shapes"
    );
    replaceCopy(
      ["webar interaction", "ar interaction"],
      "AR interaction",
      'After placing a battery in the correct opening, students scan the QR code to bring the battery character to life. Its cheerful "Thank you, Earth Lover!" encourages students to continue recycling and making environmentally friendly choices.'
    );
  };

  let pending = false;
  const schedulePatch = () => {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => {
      pending = false;
      patchBatteryProject();
    });
  };

  window.addEventListener("DOMContentLoaded", schedulePatch);
  window.addEventListener("hashchange", () => setTimeout(schedulePatch, 0));
  new MutationObserver(schedulePatch).observe(document.documentElement, { childList: true, subtree: true });
  setTimeout(schedulePatch, 50);
  setTimeout(schedulePatch, 500);
})();
// Keep the complete battery-box sketch visible in its project detail layout.
(() => {
  const fitBatteryBoxSketch = () => {
    document.querySelectorAll("img").forEach((image) => {
      const signature = `${image.getAttribute("src") || ""} ${image.getAttribute("alt") || ""}`.toLowerCase();
      const isBatterySketch =
        signature.includes("battery-box-sketch") ||
        signature.includes("box-sketch-correct") ||
        signature.includes("box sketch");

      if (!isBatterySketch) return;

      image.style.setProperty("width", "100%", "important");
      image.style.setProperty("height", "auto", "important");
      image.style.setProperty("max-height", "none", "important");
      image.style.setProperty("object-fit", "contain", "important");
      image.style.setProperty("object-position", "center", "important");

      const wrapper = image.parentElement;
      if (wrapper) {
        wrapper.style.setProperty("height", "auto", "important");
        wrapper.style.setProperty("max-height", "none", "important");
        wrapper.style.setProperty("overflow", "visible", "important");
      }
    });
  };

  const start = () => {
    fitBatteryBoxSketch();
    new MutationObserver(fitBatteryBoxSketch).observe(document.body, {
      childList: true,
      subtree: true,
    });
  };

  if (document.body) start();
  else document.addEventListener("DOMContentLoaded", start, { once: true });
  window.addEventListener("hashchange", () => requestAnimationFrame(fitBatteryBoxSketch));
})();

// Keep the complete battery-box sketch visible in its project detail layout.
(() => {
  const fitBatteryBoxSketch = () => {
    document.querySelectorAll("img").forEach((image) => {
      const signature = `${image.getAttribute("src") || ""} ${image.getAttribute("alt") || ""}`.toLowerCase();
      const isBatterySketch =
        signature.includes("battery-box-sketch") ||
        signature.includes("box-sketch-correct") ||
        signature.includes("box sketch");

      if (!isBatterySketch) return;

      image.style.setProperty("width", "100%", "important");
      image.style.setProperty("height", "auto", "important");
      image.style.setProperty("max-height", "none", "important");
      image.style.setProperty("object-fit", "contain", "important");
      image.style.setProperty("object-position", "center", "important");

      const wrapper = image.parentElement;
      if (wrapper) {
        wrapper.style.setProperty("height", "auto", "important");
        wrapper.style.setProperty("max-height", "none", "important");
        wrapper.style.setProperty("overflow", "visible", "important");
      }
    });
  };

  const start = () => {
    fitBatteryBoxSketch();
    new MutationObserver(fitBatteryBoxSketch).observe(document.body, {
      childList: true,
      subtree: true,
    });
  };

  if (document.body) start();
  else document.addEventListener("DOMContentLoaded", start, { once: true });
  window.addEventListener("hashchange", () => requestAnimationFrame(fitBatteryBoxSketch));
})();

