const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const pages = [...document.querySelectorAll(".page")];
const pageButtons = [...document.querySelectorAll("[data-page]")];
const body = document.body;

const state = {
  activePage: "dashboard",
  capsuleCollapsed: false,
  quickOpen: false,
  rocketMode: "docked",
  searchOpen: false,
  flightPanelOpen: false
};

document.querySelectorAll(".utility-page").forEach((page) => {
  const title = page.dataset.title || "SpaceMountain";
  const copy = page.dataset.copy || "This section is ready for the next build pass.";
  page.innerHTML = `
    <div class="page-title"><h1>${title}</h1><p>${copy}</p></div>
    <article class="utility-card">
      <h2>${title} is staged.</h2>
      <p>${copy} The route now has its own clean page so the sidebar state and URL always match.</p>
      <button type="button" data-page="apps">Back to Apps</button>
    </article>
  `;
});

function normalizePage(pageName) {
  return pageName || "dashboard";
}

function setActiveNav(pageName) {
  document.querySelectorAll(".side-item").forEach((button) => {
    button.classList.toggle("active", button.dataset.page === pageName);
  });
}

function showPage(pageName, options = {}) {
  const normalized = normalizePage(pageName);
  const target = document.getElementById(`page-${normalized}`) || document.getElementById("page-dashboard");
  state.activePage = target.id.replace("page-", "");
  pages.forEach((page) => page.classList.toggle("active", page === target));
  setActiveNav(state.activePage);

  if (!options.keepScroll) {
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  }

  if (window.location.hash.slice(1) !== state.activePage) {
    history.replaceState(null, "", `#${state.activePage}`);
  }
}

function wirePageButtons(root = document) {
  root.querySelectorAll("[data-page]").forEach((button) => {
    if (button.dataset.boundPageButton === "true") return;
    button.dataset.boundPageButton = "true";
    button.addEventListener("click", () => {
      const page = button.dataset.page;
      if (!page || page === "profile") return;
      showPage(page);
      if (window.innerWidth <= 820) setQuickOpen(false);
    });
  });
}

wirePageButtons();

window.addEventListener("hashchange", () => showPage(window.location.hash.slice(1) || "dashboard"));

const capsuleDock = document.getElementById("capsuleDock");
const quickToggle = document.getElementById("capsuleQuickToggle");
const rocketBay = document.getElementById("rocketBay");

function applyCapsuleState() {
  body.classList.toggle("capsule-collapsed", state.capsuleCollapsed);
  body.classList.toggle("quick-open", state.quickOpen);
  body.classList.toggle("rocket-free", state.rocketMode === "free");
  body.classList.toggle("flight-panel-open", state.flightPanelOpen && state.rocketMode === "free");
  quickToggle?.setAttribute("aria-expanded", String(state.quickOpen));
}

function setQuickOpen(open) {
  state.quickOpen = open;
  if (open) state.capsuleCollapsed = false;
  applyCapsuleState();
  if (state.rocketMode === "docked") requestAnimationFrame(placeRocketInBay);
}

function toggleCapsuleCollapsed() {
  if (state.quickOpen) state.quickOpen = false;
  state.capsuleCollapsed = !state.capsuleCollapsed;
  applyCapsuleState();
  requestAnimationFrame(placeRocketInBay);
}

quickToggle?.addEventListener("click", (event) => {
  event.stopPropagation();
  setQuickOpen(!state.quickOpen);
});

rocketBay?.addEventListener("click", (event) => {
  event.preventDefault();
  toggleCapsuleCollapsed();
});

document.querySelectorAll(".setting-tab, .swatch, .segmented button").forEach((button) => {
  button.addEventListener("click", () => {
    button.parentElement?.querySelectorAll("button").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    saveSettingsFromUI();
  });
});

document.querySelectorAll('input[type="range"]').forEach((range) => {
  range.addEventListener("input", () => {
    const output = range.parentElement?.querySelector("output");
    if (!output) return;
    output.textContent = output.textContent.includes("px") ? `${range.value}px` : `${range.value}%`;
    saveSettingsFromUI();
  });
});

const swatchColors = {
  orange: "#ff6428",
  red: "#ff3359",
  purple: "#b24dff",
  blue: "#277eff",
  cyan: "#45e7ff",
  green: "#6df89c",
  gold: "#ffb12a"
};

function getRangeByLabel(labelText) {
  return [...document.querySelectorAll(".settings-card label")].find((label) => label.textContent.includes(labelText))?.querySelector("input");
}

function activeButtonText(selector) {
  return document.querySelector(`${selector} .active`)?.textContent.trim().toLowerCase() || "";
}

function collectSettings() {
  const activeSwatch = document.querySelector(".swatch.active");
  const swatchName = [...activeSwatch?.classList || []].find((name) => swatchColors[name]) || "orange";
  return {
    accentColor: swatchColors[swatchName],
    glassOpacity: Number(getRangeByLabel("Glass Opacity")?.value || 65),
    blurStrength: Number(getRangeByLabel("Blur Strength")?.value || 22),
    glowIntensity: Number(getRangeByLabel("Glow Intensity")?.value || 80),
    starDensity: Number(getRangeByLabel("Star Density")?.value || 70),
    nebulaIntensity: Number(getRangeByLabel("Nebula Intensity")?.value || 80),
    borderStrength: Number(getRangeByLabel("Border Strength")?.value || 60),
    uiDensity: activeButtonText(".segmented") || "comfortable",
    cornerRadius: activeButtonText(".segmented.four") || "md"
  };
}

function applySettings(settings) {
  const rootStyle = document.documentElement.style;
  rootStyle.setProperty("--orange", settings.accentColor || "#ff6428");
  rootStyle.setProperty("--panel-alpha", String(Math.max(0.22, Math.min(0.9, settings.glassOpacity / 100))));
  rootStyle.setProperty("--glass-blur", `${settings.blurStrength || 22}px`);
  rootStyle.setProperty("--glow-alpha", String(Math.max(0.02, Math.min(0.38, settings.glowIntensity / 420))));
  rootStyle.setProperty("--star-alpha", String(Math.max(0.15, Math.min(1, settings.starDensity / 70))));
  rootStyle.setProperty("--nebula-alpha", String(Math.max(0.18, Math.min(1.25, settings.nebulaIntensity / 80))));
  rootStyle.setProperty("--border-alpha", String(Math.max(0.08, Math.min(0.55, settings.borderStrength / 150))));
}

let settingsSaveTimer;
function saveSettingsFromUI() {
  const settings = collectSettings();
  applySettings(settings);
  localStorage.setItem("spacemountain-settings", JSON.stringify(settings));
  clearTimeout(settingsSaveTimer);
  settingsSaveTimer = setTimeout(() => {
    fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings)
    }).catch(() => {});
  }, 250);
}

function restoreSettings() {
  let settings;
  try {
    settings = JSON.parse(localStorage.getItem("spacemountain-settings") || "null");
  } catch {
    settings = null;
  }
  if (!settings) return;
  applySettings(settings);
  Object.entries(swatchColors).forEach(([name, value]) => {
    document.querySelector(`.swatch.${name}`)?.classList.toggle("active", value.toLowerCase() === settings.accentColor?.toLowerCase());
  });
  const ranges = {
    "Glass Opacity": settings.glassOpacity,
    "Blur Strength": settings.blurStrength,
    "Glow Intensity": settings.glowIntensity,
    "Star Density": settings.starDensity,
    "Nebula Intensity": settings.nebulaIntensity,
    "Border Strength": settings.borderStrength
  };
  Object.entries(ranges).forEach(([label, value]) => {
    const range = getRangeByLabel(label);
    if (!range || value == null) return;
    range.value = value;
    const output = range.parentElement?.querySelector("output");
    if (output) output.textContent = output.textContent.includes("px") ? `${value}px` : `${value}%`;
  });
}

const searchShell = document.getElementById("searchShell");
const searchButton = document.getElementById("searchButton");
const siteSearch = document.getElementById("siteSearch");

function setSearchOpen(open) {
  state.searchOpen = open;
  searchShell?.classList.toggle("open", open);
  if (open) requestAnimationFrame(() => siteSearch?.focus());
}

searchButton?.addEventListener("click", () => setSearchOpen(true));
siteSearch?.addEventListener("blur", () => {
  if (!siteSearch.value.trim()) setSearchOpen(false);
});
window.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    setSearchOpen(true);
  }
  if (event.key === "Escape") {
    setSearchOpen(false);
    setQuickOpen(false);
  }
});

const parallaxNodes = document.querySelectorAll("[data-depth]");
let mousePX = 0;
let mousePY = 0;
let easedMousePX = 0;
let easedMousePY = 0;
let easedScroll = 0;

window.addEventListener("mousemove", (event) => {
  mousePX = (event.clientX / window.innerWidth - 0.5) * 2;
  mousePY = (event.clientY / window.innerHeight - 0.5) * 2;
});

function updateParallax() {
  const y = window.scrollY || 0;
  easedScroll += (y - easedScroll) * 0.035;
  easedMousePX += (mousePX - easedMousePX) * 0.05;
  easedMousePY += (mousePY - easedMousePY) * 0.05;

  if (!reduceMotion) {
    parallaxNodes.forEach((node) => {
      const depth = Number(node.dataset.depth || 0.02);
      const mx = easedMousePX * depth * 34;
      const my = easedMousePY * depth * 26;
      node.style.transform = `translate3d(${mx}px, ${easedScroll * depth + my}px, 0)`;
    });
  }
  requestAnimationFrame(updateParallax);
}
requestAnimationFrame(updateParallax);

const rocket = document.getElementById("rocketLauncher");
let rocketX = 25;
let rocketY = 15;
let mouseX = 60;
let mouseY = 34;
let prevMouseX = 60;
let prevMouseY = 34;
let dragRocket = false;
let moved = false;
let downX = 0;
let downY = 0;
let startRX = 0;
let startRY = 0;
let suppressNextClick = false;

function bayRect() {
  return rocketBay.getBoundingClientRect();
}

function placeRocketInBay() {
  if (!rocket || !rocketBay) return;
  const rect = bayRect();
  const size = rocket.getBoundingClientRect().width || 72;
  rocketX = rect.left + rect.width / 2 - size / 2;
  rocketY = rect.top + rect.height / 2 - size / 2 - 4;
  rocket.style.left = `${rocketX}px`;
  rocket.style.top = `${rocketY}px`;
  rocket.style.right = "auto";
  rocket.style.bottom = "auto";
  rocket.style.setProperty("--angle", "0deg");
}

function orient(dx, dy) {
  if (!rocket || Math.hypot(dx, dy) < 0.2) return;
  const angle = Math.atan2(dy, dx) * 180 / Math.PI + 45;
  rocket.style.setProperty("--angle", `${angle}deg`);
}

function nearRocketBay() {
  const a = rocket.getBoundingClientRect();
  const b = bayRect();
  const ax = a.left + a.width / 2;
  const ay = a.top + a.height / 2;
  const bx = b.left + b.width / 2;
  const by = b.top + b.height / 2;
  return Math.hypot(ax - bx, ay - by) < 68;
}

function setDocked() {
  state.rocketMode = "docked";
  state.flightPanelOpen = false;
  rocket.classList.add("docked");
  rocket.classList.remove("free");
  applyCapsuleState();
  placeRocketInBay();
  requestAnimationFrame(placeRocketInBay);
}

function releaseRocket() {
  state.rocketMode = "free";
  rocket.classList.remove("docked");
  rocket.classList.add("free");
  setQuickOpen(false);
  state.capsuleCollapsed = false;
  state.flightPanelOpen = false;
  applyCapsuleState();
  rocketX = Math.min(window.innerWidth - 92, rocketX + 104);
  rocketY = Math.max(90, rocketY + 26);
  rocket.style.left = `${rocketX}px`;
  rocket.style.top = `${rocketY}px`;
}

window.addEventListener("mousemove", (event) => {
  prevMouseX = mouseX;
  prevMouseY = mouseY;
  mouseX = event.clientX;
  mouseY = event.clientY;
});

function followRocket() {
  if (!reduceMotion && !dragRocket && state.rocketMode === "free" && window.innerWidth > 820) {
    const cx = rocketX + 36;
    const cy = rocketY + 36;
    const toX = cx - mouseX;
    const toY = cy - mouseY;
    const mx = mouseX - prevMouseX;
    const my = mouseY - prevMouseY;
    const dist = Math.hypot(toX, toY);
    const toward = (mx * toX + my * toY) > 0;
    let factor = toward ? 0.006 : 0.048;
    if (dist < 110) factor *= 0.22;
    if (dist < 54) factor = 0.002;
    const nextX = rocketX + (mouseX - 36 - rocketX) * factor;
    const nextY = rocketY + (mouseY - 36 - rocketY) * factor;
    orient(nextX - rocketX, nextY - rocketY);
    rocketX = Math.min(window.innerWidth - 92, Math.max(12, nextX));
    rocketY = Math.min(window.innerHeight - 92, Math.max(76, nextY));
    rocket.style.left = `${rocketX}px`;
    rocket.style.top = `${rocketY}px`;
  }
  requestAnimationFrame(followRocket);
}
requestAnimationFrame(followRocket);

rocket.addEventListener("pointerdown", (event) => {
  if (state.rocketMode === "docked") return;
  dragRocket = true;
  moved = false;
  downX = event.clientX;
  downY = event.clientY;
  const rr = rocket.getBoundingClientRect();
  startRX = rr.left;
  startRY = rr.top;
  rocket.setPointerCapture(event.pointerId);
});

rocket.addEventListener("pointermove", (event) => {
  if (!dragRocket) return;
  const dx = event.clientX - downX;
  const dy = event.clientY - downY;
  if (Math.hypot(dx, dy) > 5) moved = true;
  rocketX = Math.min(window.innerWidth - 92, Math.max(12, startRX + dx));
  rocketY = Math.min(window.innerHeight - 92, Math.max(76, startRY + dy));
  rocket.style.left = `${rocketX}px`;
  rocket.style.top = `${rocketY}px`;
  orient(dx, dy);
});

rocket.addEventListener("pointerup", (event) => {
  if (state.rocketMode === "docked") return;
  dragRocket = false;
  rocket.releasePointerCapture(event.pointerId);
  if (moved && nearRocketBay()) {
    setDocked();
  }
});

rocket.addEventListener("click", () => {
  if (suppressNextClick) {
    suppressNextClick = false;
    return;
  }
  if (state.rocketMode === "docked") toggleCapsuleCollapsed();
});

rocket.addEventListener("dblclick", (event) => {
  event.preventDefault();
  event.stopPropagation();
  suppressNextClick = true;
  state.rocketMode === "docked" ? releaseRocket() : setDocked();
});

const profileChip = document.getElementById("profileChip");
const flightPanel = document.getElementById("flightPanel");
const flightPanelHandle = document.getElementById("flightPanelHandle");
const flightPanelClose = document.getElementById("flightPanelClose");

profileChip?.addEventListener("click", (event) => {
  if (state.rocketMode !== "free") return;
  event.preventDefault();
  event.stopPropagation();
  state.flightPanelOpen = !state.flightPanelOpen;
  applyCapsuleState();
});

flightPanelClose?.addEventListener("click", () => {
  state.flightPanelOpen = false;
  applyCapsuleState();
});

let dragPanel = false;
let panelDownX = 0;
let panelDownY = 0;
let panelStartX = 0;
let panelStartY = 0;

flightPanelHandle?.addEventListener("pointerdown", (event) => {
  if (event.target.closest("button")) return;
  dragPanel = true;
  panelDownX = event.clientX;
  panelDownY = event.clientY;
  const rect = flightPanel.getBoundingClientRect();
  panelStartX = rect.left;
  panelStartY = rect.top;
  flightPanelHandle.setPointerCapture(event.pointerId);
});

flightPanelHandle?.addEventListener("pointermove", (event) => {
  if (!dragPanel) return;
  const x = Math.min(window.innerWidth - 80, Math.max(8, panelStartX + event.clientX - panelDownX));
  const y = Math.min(window.innerHeight - 80, Math.max(8, panelStartY + event.clientY - panelDownY));
  flightPanel.style.left = `${x}px`;
  flightPanel.style.top = `${y}px`;
});

flightPanelHandle?.addEventListener("pointerup", (event) => {
  if (!dragPanel) return;
  dragPanel = false;
  flightPanelHandle.releasePointerCapture(event.pointerId);
});

window.addEventListener("resize", () => {
  if (state.rocketMode === "docked") placeRocketInBay();
});

window.addEventListener("load", () => {
  restoreSettings();
  applyCapsuleState();
  wirePageButtons();
  showPage(window.location.hash.slice(1) || "dashboard", { keepScroll: true });
  requestAnimationFrame(() => requestAnimationFrame(placeRocketInBay));
});

restoreSettings();
applyCapsuleState();
setDocked();
showPage(window.location.hash.slice(1) || "dashboard", { keepScroll: true });
