const body = document.body;
const siteHeader = document.querySelector(".site-header");
const introView = document.querySelector(".intro-view");
const workView = document.querySelector(".work-view");
const nameButton = document.querySelector(".name-button");
const logo = document.querySelector(".logo");
const workButton = document.querySelector(".nav-work");
const aboutButton = document.querySelector(".nav-about");
const aboutPanel = document.querySelector(".about-panel");
const aboutClose = document.querySelector(".about-close");
const gallery = document.querySelector(".gallery");
const slides = [...document.querySelectorAll(".project-slide")];
const projectCards = [...document.querySelectorAll(".project-card")];
const currentCounter = document.querySelector(".gallery-status .current");
const projectDetail = document.querySelector(".project-detail");
const projectDetailClose = document.querySelector(".project-detail-close");
const projectDetailTitle = document.querySelector("#project-detail-title");
const projectDetailDescription = document.querySelector(".project-detail-description");
const projectDetailYear = document.querySelector(".project-detail-year");
const projectDetailMedium = document.querySelector(".project-detail-medium");
const projectDetailVisual = document.querySelector(".project-detail-visual");
const projectDetailImage = projectDetailVisual.querySelector("img");
const foldCaseStudy = document.querySelector(".fold-wix-case");
const finePointer = window.matchMedia("(pointer: fine)").matches;
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const baseTitle = document.title;
let activeProjectIndex = 0;
let projectOpenedFromGallery = false;
let aboutOpener = null;

function setBackgroundInert(isInert) {
  [siteHeader, introView, workView, projectDetail].forEach((region) => {
    region.inert = isInert;
  });
}

function closeAbout({ restoreFocus = true } = {}) {
  aboutPanel.classList.remove("is-visible");
  aboutPanel.setAttribute("aria-hidden", "true");
  setBackgroundInert(false);
  if (restoreFocus && aboutOpener) aboutOpener.focus({ preventScroll: true });
}

function projectIndexFromHash() {
  const slug = window.location.hash.slice(1);
  return projectCards.findIndex((card) => card.dataset.project === slug);
}

function hideProjectDetail({ clearUrl = false, restoreFocus = false } = {}) {
  const wasVisible = projectDetail.classList.contains("is-visible");
  projectDetail.classList.remove("is-visible");
  projectDetail.classList.remove("is-fold-detail", "is-drawing-detail");
  body.classList.remove("detail-open");
  projectDetail.setAttribute("aria-hidden", "true");
  projectDetailVisual.style.setProperty("--detail-x", "0px");
  projectDetailVisual.style.setProperty("--detail-y", "0px");
  document.title = baseTitle;

  if (clearUrl && projectIndexFromHash() !== -1) {
    history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
  }

  if (wasVisible && restoreFocus) projectCards[activeProjectIndex]?.focus({ preventScroll: true });
}

function openProject(index, historyMode = "push") {
  const normalizedIndex = (index + projectCards.length) % projectCards.length;
  const card = projectCards[normalizedIndex];
  const image = card.querySelector("img");
  const cardTitle = card.querySelector("strong").textContent;
  const title = card.dataset.detailTitle;
  const isFold = card.dataset.project === "fold-with-nara";
  const isDrawing = card.querySelector("small").textContent.trim().startsWith("Drawing");

  activeProjectIndex = normalizedIndex;
  aboutPanel.classList.remove("is-visible");
  aboutPanel.setAttribute("aria-hidden", "true");
  body.dataset.view = "work";
  setActiveSlide(normalizedIndex);
  slides[normalizedIndex].scrollIntoView({ block: "center", behavior: "auto" });

  projectDetailTitle.textContent = title;
  projectDetailTitle.hidden = !title;
  projectDetailDescription.textContent = card.dataset.description;
  projectDetailYear.textContent = card.dataset.year;
  projectDetailMedium.textContent = card.dataset.medium;
  projectDetailImage.src = image.getAttribute("src");
  projectDetailImage.alt = image.alt;
  foldCaseStudy.hidden = !isFold;
  projectDetail.scrollTop = 0;
  projectDetail.classList.toggle("is-fold-detail", isFold);
  projectDetail.classList.toggle("is-drawing-detail", isDrawing);
  projectDetail.classList.add("is-visible");
  body.classList.add("detail-open");
  projectDetail.setAttribute("aria-hidden", "false");
  document.title = `${cardTitle} — Sophia Li`;
  requestAnimationFrame(() => { projectDetail.scrollTop = 0; });

  const url = `#${card.dataset.project}`;
  if (historyMode === "push") {
    projectOpenedFromGallery = true;
    history.pushState({ portfolioProject: card.dataset.project }, "", url);
  }
  if (historyMode === "replace") history.replaceState({ portfolioProject: card.dataset.project }, "", url);

  if (historyMode === "push") window.setTimeout(() => projectDetailClose.focus({ preventScroll: true }), 350);
}

function showWork() {
  hideProjectDetail({ clearUrl: true });
  closeAbout({ restoreFocus: false });
  body.dataset.view = "work";
  window.setTimeout(() => gallery.focus({ preventScroll: true }), 450);
}

function showIntro() {
  hideProjectDetail({ clearUrl: true });
  closeAbout({ restoreFocus: false });
  body.dataset.view = "intro";
  gallery.scrollTo({ top: 0, behavior: "auto" });
  setActiveSlide(0);
}

function showAbout() {
  hideProjectDetail({ clearUrl: true });
  aboutOpener = document.activeElement;
  aboutPanel.classList.add("is-visible");
  aboutPanel.setAttribute("aria-hidden", "false");
  setBackgroundInert(true);
  window.setTimeout(() => aboutClose.focus({ preventScroll: true }), 250);
}

nameButton.addEventListener("click", showWork);
logo.addEventListener("click", showIntro);
workButton.addEventListener("click", showWork);
aboutButton.addEventListener("click", showAbout);
aboutClose.addEventListener("click", () => closeAbout());

projectCards.forEach((card, index) => {
  card.addEventListener("click", (event) => {
    event.preventDefault();
    openProject(index, "push");
  });
});

projectDetailClose.addEventListener("click", () => {
  if (history.state?.portfolioProject && projectOpenedFromGallery) {
    history.back();
  } else {
    hideProjectDetail({ clearUrl: true, restoreFocus: true });
  }
});

window.addEventListener("popstate", () => {
  const projectIndex = projectIndexFromHash();
  if (projectIndex === -1) {
    projectOpenedFromGallery = false;
    hideProjectDetail({ restoreFocus: true });
  }
  else openProject(projectIndex, "none");
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    if (projectDetail.classList.contains("is-visible")) projectDetailClose.click();
    else if (aboutPanel.classList.contains("is-visible")) aboutClose.click();
  }
});

function setActiveSlide(index) {
  slides.forEach((slide, slideIndex) => slide.classList.toggle("is-active", slideIndex === index));
  currentCounter.textContent = String(index + 1).padStart(2, "0");
}

let scrollFrame = 0;
function updateActiveFromScroll() {
  scrollFrame = 0;
  const galleryRect = gallery.getBoundingClientRect();
  const center = galleryRect.top + galleryRect.height / 2;
  let closestIndex = 0;
  let closestDistance = Infinity;

  slides.forEach((slide, index) => {
    const rect = slide.getBoundingClientRect();
    const distance = Math.abs(rect.top + rect.height / 2 - center);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestIndex = index;
    }
  });

  setActiveSlide(closestIndex);
}

gallery.addEventListener("scroll", () => {
  if (!scrollFrame) scrollFrame = requestAnimationFrame(updateActiveFromScroll);
}, { passive: true });

if (finePointer && !reduceMotion) {
  const cursor = document.querySelector(".cursor");
  const trails = document.querySelector(".cursor-trails");
  const letters = [...document.querySelectorAll(".name-button h1 span")];
  const hoverTargets = document.querySelectorAll("a, button, .project-card");
  let pointerX = innerWidth / 2;
  let pointerY = innerHeight / 2;
  let cursorX = pointerX;
  let cursorY = pointerY;
  let lastTrailTime = 0;

  function animateCursor() {
    cursorX += (pointerX - cursorX) * .22;
    cursorY += (pointerY - cursorY) * .22;
    cursor.style.left = `${cursorX}px`;
    cursor.style.top = `${cursorY}px`;
    requestAnimationFrame(animateCursor);
  }
  animateCursor();

  window.addEventListener("pointermove", (event) => {
    pointerX = event.clientX;
    pointerY = event.clientY;

    if (body.dataset.view === "intro") {
      letters.forEach((letter) => {
        const rect = letter.getBoundingClientRect();
        const dx = pointerX - (rect.left + rect.width / 2);
        const dy = pointerY - (rect.top + rect.height / 2);
        const distance = Math.max(Math.hypot(dx, dy), 1);
        const influence = Math.max(0, 1 - distance / 360);
        letter.style.setProperty("--tx", `${dx * influence * .09}px`);
        letter.style.setProperty("--ty", `${dy * influence * .12}px`);
        letter.style.setProperty("--rot", `${dx * influence * .018}deg`);
      });
    }

    const card = event.target.closest?.(".project-card");
    if (card && card.closest(".is-active")) {
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - .5;
      const y = (event.clientY - rect.top) / rect.height - .5;
      card.style.setProperty("--ry", `${x * 2.5}deg`);
      card.style.setProperty("--rx", `${y * -2.5}deg`);
      card.style.setProperty("--mx", `${x * 8}px`);
      card.style.setProperty("--my", `${y * 8}px`);
    }

    if (event.timeStamp - lastTrailTime > 48) {
      const dot = document.createElement("i");
      dot.className = "trail";
      dot.style.left = `${pointerX}px`;
      dot.style.top = `${pointerY}px`;
      trails.append(dot);
      dot.addEventListener("animationend", () => dot.remove());
      lastTrailTime = event.timeStamp;
    }
  }, { passive: true });

  document.querySelectorAll(".project-card").forEach((card) => {
    card.addEventListener("pointerleave", () => {
      card.style.setProperty("--ry", "0deg");
      card.style.setProperty("--rx", "0deg");
      card.style.setProperty("--mx", "0px");
      card.style.setProperty("--my", "0px");
    });
  });

  hoverTargets.forEach((target) => {
    target.addEventListener("pointerenter", () => cursor.classList.add("is-hovering"));
    target.addEventListener("pointerleave", () => cursor.classList.remove("is-hovering"));
  });

  introView.addEventListener("pointerleave", () => {
    letters.forEach((letter) => {
      letter.style.setProperty("--tx", "0px");
      letter.style.setProperty("--ty", "0px");
      letter.style.setProperty("--rot", "0deg");
    });
  });
}

setActiveSlide(0);

const initialProjectIndex = projectIndexFromHash();
if (initialProjectIndex !== -1) openProject(initialProjectIndex, "none");
