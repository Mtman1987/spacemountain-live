/* SPACE MOUNTAIN PORTAL — UNIFIED ROCKET DOCK SYSTEM
   Single source of truth: the rocket and dock panel are the ONLY navigation control.
   No static sidebar. Dock panel is always fixed/floating on top of content.
*/

document.addEventListener("DOMContentLoaded", () => {

  // ─────────────────────────────────────────────
  // DOM References
  // ─────────────────────────────────────────────
  const body = document.body;
  const rocket = document.getElementById("rocketLauncher");
  const dock = document.getElementById("dockPanel");
  const dockClose = document.getElementById("dockClose");
  const dockHandle = document.getElementById("dockHandle");
  const dockProfileRow = document.getElementById("dockProfileRow");
  const dockProfileToggle = document.getElementById("dockProfileToggle");
  const dockProfileExtended = document.getElementById("dockProfileExtended");
  const dockStatusLabel = document.getElementById("dockStatusLabel");
  const dockSubLabel = document.getElementById("dockSubLabel");
  const dockSignOutBtn = document.getElementById("dockSignOutBtn");
  const searchContainer = document.getElementById("searchContainer");
  const searchTrigger = document.getElementById("searchTrigger");
  const searchInput = document.getElementById("searchInput");
  const topbarAvatar = document.getElementById("topbarAvatar");

  // ─────────────────────────────────────────────
  // State
  // ─────────────────────────────────────────────
  let activePage = "dashboard";
  let userIdentity = null;
  let mode = "docked";    // "docked" | "free"
  let dockOpen = false;

  // Rocket physics state
  let rocketX = 14, rocketY = 14;
  let mouseX = 60, mouseY = 60;
  let prevMouseX = 60, prevMouseY = 60;
  let dragRocket = false, dragMoved = false;
  let dragStartX = 0, dragStartY = 0;
  let dragStartRX = 0, dragStartRY = 0;
  let dragStartPX = 0, dragStartPY = 0;

  // Panel drag state (floating mode)
  let dragPanel = false;
  let panelDragStartX = 0, panelDragStartY = 0;
  let panelStartLeft = 0, panelStartTop = 0;

  const DOCK_LEFT = 14;
  const DOCK_TOP = 14;
  const DOCK_SNAP_RADIUS = 80; // px from dock position to snap back

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ─────────────────────────────────────────────
  // ROUTING SYSTEM (Hash)
  // ─────────────────────────────────────────────
  function showPage(pageName) {
    if (!userIdentity && pageName !== "splash") {
      window.location.hash = "#splash";
      return;
    }

    const el = document.getElementById(`page-${pageName}`);
    if (!el) return;

    activePage = pageName;

    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
    el.classList.add("active");

    // Sync nav button active state in dock panel
    document.querySelectorAll("[data-page]").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.page === pageName);
    });

    // Close dock after navigating (free mode only)
    if (mode === "free" && dockOpen) {
      closeDock();
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  window.addEventListener("hashchange", () => {
    const hash = window.location.hash.slice(1) || "dashboard";
    showPage(hash);
  });

  // ─────────────────────────────────────────────
  // DOCK PANEL OPEN / CLOSE / TOGGLE
  // ─────────────────────────────────────────────
  function openDock() {
    if (dockOpen) return;
    dockOpen = true;
    dock.classList.add("open");
    rocket.classList.add("open");

    if (mode === "docked") {
      // Panel stays fixed at top-left corner — no layout shift
      dock.classList.remove("floating");
      dock.style.left = DOCK_LEFT + "px";
      dock.style.top = DOCK_TOP + "px";
      dock.style.resize = "none";
    } else {
      // Free mode: place panel near rocket
      dock.classList.add("floating");
      const r = rocket.getBoundingClientRect();
      const panelW = 260;
      const panelH = Math.min(window.innerHeight - 40, 560);
      let px = r.right + 12;
      let py = r.top;
      // Prevent going off-screen right
      if (px + panelW > window.innerWidth - 10) {
        px = r.left - panelW - 12;
      }
      // Prevent going off-screen bottom
      if (py + panelH > window.innerHeight - 10) {
        py = window.innerHeight - panelH - 10;
      }
      py = Math.max(10, py);
      px = Math.max(10, px);
      dock.style.left = px + "px";
      dock.style.top = py + "px";
    }
  }

  function closeDock() {
    if (!dockOpen) return;
    dockOpen = false;
    dock.classList.remove("open", "floating");
    rocket.classList.remove("open");
  }

  function toggleDock() {
    dockOpen ? closeDock() : openDock();
  }

  // ─────────────────────────────────────────────
  // ROCKET DOCKED POSITIONING
  // When docked, rocket is at top-left (fixed)
  // ─────────────────────────────────────────────
  function placeRocketAtDock() {
    rocket.style.left = DOCK_LEFT + "px";
    rocket.style.top = DOCK_TOP + "px";
    rocket.style.setProperty("--angle", "0deg");
    rocketX = DOCK_LEFT;
    rocketY = DOCK_TOP;
  }

  function setDocked() {
    mode = "docked";
    rocket.classList.remove("free");
    rocket.classList.add("docked");
    dock.classList.remove("floating");
    dockStatusLabel.textContent = "DOCKED";
    dockSubLabel.textContent = "Navigation Station";
    placeRocketAtDock();

    // If dock was open, keep it open at dock position
    if (dockOpen) {
      dock.style.left = DOCK_LEFT + "px";
      dock.style.top = DOCK_TOP + "px";
    }
    showToast("Rocket returned to station dome!", "success");
  }

  function releaseRocket() {
    mode = "free";
    rocket.classList.remove("docked");
    rocket.classList.add("free");
    dockStatusLabel.textContent = "FLIGHT";
    dockSubLabel.textContent = "Free Flight Mode";

    // Close dock panel when launching
    closeDock();

    // Launch rocket outward from dock position
    rocketX = DOCK_LEFT + 80;
    rocketY = DOCK_TOP + 10;
    rocket.style.left = rocketX + "px";
    rocket.style.top = rocketY + "px";

    showToast("🚀 Rocket launched! Click to open nav panel.", "success");
  }

  // ─────────────────────────────────────────────
  // ROCKET MOUSE-FOLLOW PHYSICS (free mode)
  // ─────────────────────────────────────────────
  window.addEventListener("mousemove", e => {
    prevMouseX = mouseX;
    prevMouseY = mouseY;
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  function orient(dx, dy) {
    if (Math.hypot(dx, dy) < 0.2) return;
    const angle = Math.atan2(dy, dx) * 180 / Math.PI + 45;
    rocket.style.setProperty("--angle", angle + "deg");
  }

  function followRocket() {
    if (!reduceMotion && !dragRocket && mode === "free" && !dockOpen) {
      const cx = rocketX + 28, cy = rocketY + 28;
      const toX = cx - mouseX, toY = cy - mouseY;
      const mx = mouseX - prevMouseX, my = mouseY - prevMouseY;
      const dist = Math.hypot(toX, toY);
      const toward = (mx * toX + my * toY) > 0;

      let f = toward ? 0.008 : 0.05;
      if (dist < 110) f *= 0.25;
      if (dist < 54) f = 0.002;

      const nextX = rocketX + (mouseX - 28 - rocketX) * f;
      const nextY = rocketY + (mouseY - 28 - rocketY) * f;

      orient(nextX - rocketX, nextY - rocketY);
      rocketX = nextX;
      rocketY = nextY;

      rocket.style.left = Math.min(window.innerWidth - 64, Math.max(12, rocketX)) + "px";
      rocket.style.top = Math.min(window.innerHeight - 64, Math.max(12, rocketY)) + "px";
    }
    requestAnimationFrame(followRocket);
  }
  requestAnimationFrame(followRocket);

  // ─────────────────────────────────────────────
  // ROCKET POINTER EVENTS (drag, click, dblclick)
  // ─────────────────────────────────────────────
  rocket.addEventListener("pointerdown", e => {
    if (mode === "docked") return; // Docked rocket only responds to click/dblclick
    dragRocket = true;
    dragMoved = false;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    const rr = rocket.getBoundingClientRect();
    dragStartRX = rr.left;
    dragStartRY = rr.top;
    const pr = dock.getBoundingClientRect();
    dragStartPX = pr.left || 200;
    dragStartPY = pr.top || 80;
    rocket.setPointerCapture(e.pointerId);
  });

  rocket.addEventListener("pointermove", e => {
    if (!dragRocket || mode === "docked") return;
    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;
    if (Math.hypot(dx, dy) > 5) dragMoved = true;

    rocketX = Math.min(window.innerWidth - 64, Math.max(12, dragStartRX + dx));
    rocketY = Math.min(window.innerHeight - 64, Math.max(12, dragStartRY + dy));

    rocket.style.left = rocketX + "px";
    rocket.style.top = rocketY + "px";
    orient(dx, dy);

    // Move panel with rocket if open
    if (dockOpen) {
      const nx = Math.min(window.innerWidth - 80, Math.max(10, dragStartPX + dx));
      const ny = Math.min(window.innerHeight - 80, Math.max(10, dragStartPY + dy));
      dock.style.left = nx + "px";
      dock.style.top = ny + "px";
    }
  });

  rocket.addEventListener("pointerup", e => {
    if (mode === "docked") return;
    dragRocket = false;
    rocket.releasePointerCapture(e.pointerId);

    if (!dragMoved) {
      // Single click in free mode → toggle dock
      toggleDock();
      return;
    }

    // Check if dragged near dock position to snap back
    const cx = rocketX + 28, cy = rocketY + 28;
    const distToDock = Math.hypot(cx - (DOCK_LEFT + 28), cy - (DOCK_TOP + 28));
    if (distToDock < DOCK_SNAP_RADIUS) {
      closeDock();
      setDocked();
    }
  });

  // Single click on docked rocket → toggle dock panel
  rocket.addEventListener("click", e => {
    if (mode === "docked") {
      toggleDock();
    }
  });

  // Double click: docked → launch, free → dock
  let dblClickPrev = 0;
  rocket.addEventListener("dblclick", e => {
    e.preventDefault();
    e.stopImmediatePropagation();
    if (mode === "docked") {
      closeDock();
      releaseRocket();
    } else {
      closeDock();
      setDocked();
    }
  });

  // ─────────────────────────────────────────────
  // DOCK PANEL DRAG HANDLE (floating mode only)
  // ─────────────────────────────────────────────
  dockHandle.addEventListener("pointerdown", e => {
    if (e.target.closest("button")) return;
    if (mode !== "free" || !dockOpen) return;
    dragPanel = true;
    panelDragStartX = e.clientX;
    panelDragStartY = e.clientY;
    const r = dock.getBoundingClientRect();
    panelStartLeft = r.left;
    panelStartTop = r.top;
    dockHandle.setPointerCapture(e.pointerId);
  });

  dockHandle.addEventListener("pointermove", e => {
    if (!dragPanel) return;
    const x = Math.min(window.innerWidth - 80, Math.max(10, panelStartLeft + e.clientX - panelDragStartX));
    const y = Math.min(window.innerHeight - 80, Math.max(10, panelStartTop + e.clientY - panelDragStartY));
    dock.style.left = x + "px";
    dock.style.top = y + "px";
  });

  dockHandle.addEventListener("pointerup", () => {
    dragPanel = false;
  });

  // Close button
  dockClose.addEventListener("click", closeDock);

  // Topbar avatar click → toggle dock (docked mode)
  topbarAvatar.addEventListener("click", () => {
    if (mode === "docked") {
      toggleDock();
    }
  });

  // Click outside dock to close it
  document.addEventListener("click", e => {
    if (dockOpen && !dock.contains(e.target) && !rocket.contains(e.target) && !topbarAvatar.contains(e.target)) {
      closeDock();
    }
  });

  // ─────────────────────────────────────────────
  // DOCK NAV NAVIGATION
  // ─────────────────────────────────────────────
  dock.querySelectorAll("[data-page]").forEach(btn => {
    btn.addEventListener("click", e => {
      const page = e.target.closest("[data-page]").dataset.page;
      window.location.hash = `#${page}`;
      // closeDock() called by showPage for free mode
      if (mode === "docked") closeDock();
    });
  });

  // Any [data-page] element outside dock
  document.querySelectorAll("[data-page]:not(#dockPanel [data-page])").forEach(btn => {
    btn.addEventListener("click", e => {
      const page = e.target.closest("[data-page]")?.dataset?.page;
      if (page) window.location.hash = `#${page}`;
    });
  });

  // ─────────────────────────────────────────────
  // PROFILE TOGGLE IN DOCK
  // ─────────────────────────────────────────────
  dockProfileRow.addEventListener("click", e => {
    if (e.target.closest(".dock-profile-toggle") || e.target === dockProfileRow || e.target.closest(".dock-profile-meta") || e.target.closest(".dock-avatar")) {
      const isOpen = dockProfileExtended.classList.toggle("open");
      dockProfileToggle.classList.toggle("open", isOpen);
    }
  });

  dockProfileToggle.addEventListener("click", e => {
    e.stopPropagation();
    const isOpen = dockProfileExtended.classList.toggle("open");
    dockProfileToggle.classList.toggle("open", isOpen);
  });

  // Sign out from dock
  dockSignOutBtn.addEventListener("click", async () => {
    try {
      await fetch("/api/identity", { method: "DELETE" });
    } catch {}
    userIdentity = null;
    closeDock();
    showToast("Commander disconnected from SQLite registry", "error");
    window.location.hash = "#splash";
  });

  // ─────────────────────────────────────────────
  // WINDOW RESIZE
  // ─────────────────────────────────────────────
  window.addEventListener("resize", () => {
    if (mode === "docked") {
      placeRocketAtDock();
      if (dockOpen) {
        dock.style.left = DOCK_LEFT + "px";
        dock.style.top = DOCK_TOP + "px";
      }
    }
  });

  // ─────────────────────────────────────────────
  // PARALLAX SPACE BACKGROUND
  // ─────────────────────────────────────────────
  const parallaxNodes = document.querySelectorAll("[data-depth]");
  let easedScroll = 0, mousePX = 0, mousePY = 0, easedMousePX = 0, easedMousePY = 0;

  function updateParallax() {
    const y = window.scrollY || 0;
    easedScroll += (y - easedScroll) * 0.032;
    easedMousePX += (mousePX - easedMousePX) * 0.05;
    easedMousePY += (mousePY - easedMousePY) * 0.05;

    if (!reduceMotion) {
      parallaxNodes.forEach(n => {
        const d = Number(n.dataset.depth || 0.02);
        const depthEl = document.getElementById("parallaxDepth");
        const depthVal = depthEl ? depthEl.value / 65 : 1.0;
        const mx = easedMousePX * d * 30 * depthVal;
        const my = easedMousePY * d * 24 * depthVal;
        n.style.transform = `translate3d(${mx}px, ${easedScroll * d + my}px, 0)`;
      });
    }
    requestAnimationFrame(updateParallax);
  }
  requestAnimationFrame(updateParallax);

  window.addEventListener("mousemove", e => {
    mousePX = (e.clientX / window.innerWidth - 0.5) * 2;
    mousePY = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  // ─────────────────────────────────────────────
  // SEARCH BAR
  // ─────────────────────────────────────────────
  searchTrigger.addEventListener("click", e => {
    e.stopPropagation();
    searchContainer.classList.toggle("active");
    if (searchContainer.classList.contains("active")) searchInput.focus();
  });

  document.addEventListener("click", e => {
    if (!searchContainer.contains(e.target)) {
      searchContainer.classList.remove("active");
    }
  });

  window.addEventListener("keydown", e => {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      searchContainer.classList.add("active");
      searchInput.focus();
    }
  });

  // ─────────────────────────────────────────────
  // TOAST NOTIFICATIONS
  // ─────────────────────────────────────────────
  function showToast(message, type = "success") {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    setTimeout(() => toast.classList.remove("show"), 3200);
  }

  // ─────────────────────────────────────────────
  // BACKEND SQLITE — Settings
  // ─────────────────────────────────────────────
  const themes = {
    solar: { accent: "#ff6a2a", accent2: "#a968ff", accent3: "#45e7ff" },
    nebula: { accent: "#a968ff", accent2: "#ff5de4", accent3: "#45e7ff" },
    ocean: { accent: "#27d8ff", accent2: "#4d7cff", accent3: "#b68cff" },
    aurora: { accent: "#58f7ad", accent2: "#45e7ff", accent3: "#a968ff" }
  };

  async function loadSettings() {
    try {
      const res = await fetch("/api/settings");
      const settings = await res.json();
      applySettings(settings);
    } catch {
      console.warn("Using local default settings.");
    }
  }

  async function saveSettings(settings) {
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings)
      });
      showToast("Theme synced to SQLite!", "success");
    } catch (err) {
      console.error("Failed to save settings:", err);
    }
  }

  function applySettings(settings) {
    const root = document.documentElement;
    root.setAttribute("data-theme", settings.themePreset);
    root.setAttribute("data-density", settings.uiDensity);
    root.style.setProperty("--glass-opacity", settings.glassOpacity / 100);
    root.style.setProperty("--blur", `${settings.blurStrength}px`);
    root.style.setProperty("--glow", settings.glowIntensity / 100);
    root.style.setProperty("--gap", settings.uiDensity === "compact" ? "10px" : settings.uiDensity === "spacious" ? "20px" : "14px");
    root.style.setProperty("--radius", settings.cornerRadius === "sm" ? "10px" : settings.cornerRadius === "lg" ? "26px" : settings.cornerRadius === "full" ? "99px" : "18px");
    root.style.setProperty("--accent", settings.accentColor);

    const controls = {
      glassOpacity: settings.glassOpacity,
      blurStrength: settings.blurStrength,
      glowIntensity: settings.glowIntensity,
      starDensity: settings.starDensity,
      nebulaIntensity: settings.nebulaIntensity,
      parallaxDepth: settings.parallaxDepth
    };

    for (const [key, val] of Object.entries(controls)) {
      const el = document.getElementById(key);
      const display = document.getElementById(`${key}Val`);
      if (el) el.value = val;
      if (display) display.textContent = key === "blurStrength" ? `${val}px` : `${val}%`;
    }

    const starLayer = document.querySelector(".star-layer");
    if (starLayer) starLayer.style.opacity = settings.starDensity / 100;

    const bgDepth = document.querySelector(".space-depth");
    if (bgDepth) bgDepth.style.filter = `saturate(${1.0 + (settings.nebulaIntensity - 50) / 200}) contrast(1.04) brightness(0.92)`;

    const themeTitles = { solar: "Solar Flare", nebula: "Nebula Purple", ocean: "Oceanic Blue", aurora: "Aurora Green" };
    const activeTitle = themeTitles[settings.themePreset] || "Custom Theme";

    const dockTheme = document.getElementById("dockActiveTheme");
    if (dockTheme) dockTheme.textContent = activeTitle;

    document.querySelectorAll(".accent-dot").forEach(dot => {
      dot.classList.toggle("active", dot.dataset.color === settings.accentColor);
    });

    highlightSegment("densityControl", settings.uiDensity);
    highlightSegment("radiusControl", settings.cornerRadius);
    highlightSegment("topbarStyleControl", settings.topbarStyle);

    applyLayoutOptions(settings);
  }

  function applyLayoutOptions(settings) {
    const topbar = document.querySelector(".topbar");
    if (settings.topbarStyle === "glass") {
      topbar.classList.add("glass");
      topbar.style.background = "rgba(5, 13, 31, 0.4)";
    } else {
      topbar.classList.remove("glass");
      topbar.style.background = "transparent";
      topbar.style.border = "1px solid transparent";
      topbar.style.backdropFilter = "none";
    }
  }

  function highlightSegment(containerId, value) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.querySelectorAll(".segment-btn").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.val === value);
    });
  }

  // ─────────────────────────────────────────────
  // IDENTITY (Login / Auth)
  // ─────────────────────────────────────────────
  async function loadIdentity() {
    try {
      const res = await fetch("/api/identity");
      const identity = await res.json();
      if (identity) {
        userIdentity = identity;
        updateIdentityUI();
        window.location.hash = "#dashboard";
      } else {
        window.location.hash = "#splash";
      }
    } catch {
      window.location.hash = "#splash";
    }
  }

  function updateIdentityUI() {
    const els = {
      topbarUsername: document.getElementById("topbarUsername"),
      dockUsername: document.getElementById("dockUsername"),
      dockUserAddress: document.getElementById("dockUserAddress"),
      dashboardUserTitle: document.getElementById("dashboardUserTitle")
    };

    if (userIdentity) {
      if (els.topbarUsername) els.topbarUsername.textContent = userIdentity.displayName;
      if (els.dockUsername) els.dockUsername.textContent = userIdentity.displayName;
      if (els.dockUserAddress) els.dockUserAddress.textContent = userIdentity.address;
      if (els.dashboardUserTitle) els.dashboardUserTitle.textContent = userIdentity.displayName;
    }
  }

  // Identity form
  const identityForm = document.getElementById("identityForm");
  identityForm.addEventListener("submit", async e => {
    e.preventDefault();
    const displayName = document.getElementById("displayName").value.trim();
    const username = document.getElementById("handleInput").value.trim().toLowerCase();
    const recovery = document.getElementById("recoveryInput").value.trim();
    const identity = { username, displayName, address: `${username}@spmt.live`, recovery };

    try {
      const res = await fetch("/api/identity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(identity)
      });
      const data = await res.json();
      if (data.success) {
        userIdentity = data.identity;
        updateIdentityUI();
        showToast("Signal connected. Profile synced to SQLite!", "success");
        window.location.hash = "#dashboard";
      }
    } catch {
      showToast("Database connection failed", "error");
    }
  });

  // Sign up / sign in tab toggle
  const signupMode = document.getElementById("signupMode");
  const signinMode = document.getElementById("signinMode");
  const recoveryField = document.getElementById("recoveryField");

  signupMode.addEventListener("click", () => {
    signupMode.classList.add("active");
    signinMode.classList.remove("active");
    recoveryField.style.display = "";
    document.querySelector("#identityForm button[type=submit]").textContent = "Establish Signal Connection";
  });

  signinMode.addEventListener("click", () => {
    signinMode.classList.add("active");
    signupMode.classList.remove("active");
    recoveryField.style.display = "none";
    document.querySelector("#identityForm button[type=submit]").textContent = "Access Station Cabin";
  });

  // ─────────────────────────────────────────────
  // DYNAMIC LISTS (Dashboard, Rooms, Crew)
  // ─────────────────────────────────────────────
  const liveCaptains = [
    ["Captain NovaStar", "StreamWeaver Sandbox · building HUDs", "Active", true],
    ["LunaVibes", "HearMeOut · streaming audio lounge", "Active", false],
    ["EchoPulse", "Bridge Room · dispute desk captain", "Duty", true],
    ["StellarJay", "Arena Node · tournament config", "Spectate", false]
  ];

  const voiceChannels = [
    ["Galactic Hangout", "8 / 12 users · voice active", "Join"],
    ["Overlay Help Lounge", "3 / 8 users · screen share", "Join"],
    ["Midnight Nebula Drive", "Ambient music 24/7 stream", "Listen"],
    ["Ship Bridge Comms", "Duty captain signal only", "Bridge"]
  ];

  const alertLogs = [
    ["SQLite DB Sync", "Global theme preset saved: Solar Flare", "Synced"],
    ["HearMeOut Room", "NovaStar entered Galactic Hangout", "Event"],
    ["OBS StreamWeaver", "Render Job-042 compiled successfully", "OBS"],
    ["Glasses Hook", "Calibrating MountainView lens parameters", "HUD"]
  ];

  const crewDeskList = [
    ["EchoPulse", "Duty Captain · dispute handling & welcome concourse", "Active today", true],
    ["StellarJay", "Arena Captain · tournament bracket operations", "Event Crew", false],
    ["NovaStar", "Stream System Captain · OBS templates & graphics help", "Tech Lead", false],
    ["Athena AI", "Onboarding Assistant · routing & manual lookups", "Bot", true],
    ["Scarlett AI", "Security Assistant · database maintenance", "Bot", false],
    ["Orbitron", "Trade Alliance Captain · discord forwarding logs", "Relations", false]
  ];

  function renderDashboardLists() {
    const formatRow = (name, meta, tag, active) => `
      <div class="row">
        <div class="avatar ${active ? "speaking" : ""}"></div>
        <div class="row-main">
          <strong>${name}</strong>
          <span>${meta}</span>
        </div>
        <span class="tag ${tag === "Active" || tag === "Join" || tag === "Synced" ? "live" : ""}">${tag}</span>
      </div>
    `;

    document.getElementById("liveList").innerHTML = liveCaptains.map(c => formatRow(c[0], c[1], c[2], c[3])).join("");
    document.getElementById("roomList").innerHTML = voiceChannels.map(v => formatRow(v[0], v[1], v[2], false)).join("");
    document.getElementById("alertList").innerHTML = alertLogs.map(a => formatRow(a[0], a[1], a[2], false)).join("");

    document.getElementById("roomsGrid").innerHTML = voiceChannels.map(v => `
      <article class="card glass">
        <span class="tag ${v[2] === "Join" ? "live" : "warn"}">${v[2]}</span>
        <h3>${v[0]}</h3>
        <p>${v[1]}</p>
        <button class="btn btn-mini" type="button">Establish Voice link</button>
      </article>
    `).join("");

    document.getElementById("crewGrid").innerHTML = crewDeskList.map(cr => `
      <article class="card glass">
        <div class="row" style="background: transparent; border: none; padding: 0;">
          <div class="avatar ${cr[3] ? "speaking" : ""}"></div>
          <div class="row-main">
            <strong>${cr[0]}</strong>
            <span>${cr[2]}</span>
          </div>
        </div>
        <p style="margin-top: 8px;">${cr[1]}</p>
        <div class="hero-actions" style="margin-top: auto; padding-top: 10px;">
          <button class="btn btn-mini" type="button">Message Signal</button>
          <button class="btn-soft btn-mini" type="button">File Dispute</button>
        </div>
      </article>
    `).join("");
  }

  // Dashboard stats simulation
  function simulateDashboardStats() {
    const points = document.getElementById("pointsToday");
    const qrScans = document.getElementById("qrScans");
    const mediaJobs = document.getElementById("mediaJobs");
    const mailCount = document.getElementById("mailCount");

    if (points && activePage === "dashboard") {
      let p = parseInt(points.textContent.replace(/,/g, ""));
      let s = parseInt(qrScans.textContent.replace(/,/g, ""));
      let j = parseInt(mediaJobs.textContent.replace(/,/g, ""));
      points.textContent = (p + Math.floor(Math.random() * 6)).toLocaleString();
      if (Math.random() > 0.7) qrScans.textContent = (s + 1).toLocaleString();
      if (Math.random() > 0.9) mediaJobs.textContent = (j + 1).toLocaleString();
    }
  }

  // ─────────────────────────────────────────────
  // INTERNAL MAIL CLIENT
  // ─────────────────────────────────────────────
  let mails = [
    { id: "m1", folder: "inbox", from: "athena@spmt.live", to: "commander@spmt.live", subject: "Welcome to SpaceMountain", preview: "Database persistence enabled. Read SQLite settings.", body: "Commander, your spmt.live inbox is active. Settings changes are synced directly to SQLite database.db.", time: "1 min", tag: "System" },
    { id: "m2", folder: "inbox", from: "mountainview@spmt.live", to: "commander@spmt.live", subject: "Smart Glasses HUD Linked", preview: "QR seed calibrations active in builder panel.", body: "Calibrations for MountainView glasses HUD active. You can rebuild QR code matrices from the Builder canvas.", time: "12 min", tag: "Glasses" },
    { id: "m3", folder: "app", from: "streamweaver@spmt.live", to: "commander@spmt.live", subject: "Overlay Render Job Successful", preview: "OBS Chat Tag overlay compiled and rendered.", body: "The overlays sandbox compiled Chat Tag visual layers. Widgets can now be output as OBS links.", time: "30 min", tag: "OBS" }
  ];
  let activeFolder = "inbox";
  let activeMailId = "m1";

  function renderMail() {
    const mailList = document.getElementById("mailList");
    const reader = document.getElementById("messageReader");
    const folderTitle = document.getElementById("mailFolderTitle");
    const dockBadge = document.getElementById("dockMailBadge");

    const folders = { inbox: "Inbox", sent: "Sent Signals", app: "App Alerts", crew: "Crew Desk Logs", forums: "Forum Replies", bots: "Bot Notes" };
    folderTitle.textContent = folders[activeFolder] || "Inbox";

    const filtered = mails.filter(m => activeFolder === "inbox" ? m.folder === "inbox" : m.folder === activeFolder);
    const unreadCount = mails.filter(m => m.folder === "inbox").length;
    if (dockBadge) dockBadge.textContent = unreadCount;

    mailList.innerHTML = filtered.map(m => `
      <button class="mail-item ${m.id === activeMailId ? "active" : ""}" type="button" data-mail-id="${m.id}">
        <strong>${m.subject}</strong>
        <span>${m.from} · ${m.time}</span>
        <span>${m.preview}</span>
      </button>
    `).join("");

    const activeMail = mails.find(m => m.id === activeMailId) || filtered[0];
    if (!activeMail) {
      reader.innerHTML = `<h3>No messages in ${folders[activeFolder]}</h3><p>Incoming data packets will render here.</p>`;
      return;
    }

    reader.innerHTML = `
      <div class="reader-head">
        <div>
          <span class="tag live">${activeMail.tag}</span>
          <h3>${activeMail.subject}</h3>
          <div class="reader-meta">
            From: ${activeMail.from}<br/>
            To: ${activeMail.to}<br/>
            Packet Time: ${activeMail.time}
          </div>
        </div>
      </div>
      <p style="margin: 20px 0; line-height: 1.6; color: var(--soft);">${activeMail.body}</p>
      <form class="compose-grid" id="replyForm">
        <div class="field">
          <label for="replyBody">Compose Reply</label>
          <textarea id="replyBody" class="input" placeholder="Type message body..." required></textarea>
        </div>
        <button class="btn" type="submit">Broadcast Reply</button>
      </form>
    `;

    document.getElementById("replyForm").addEventListener("submit", e => {
      e.preventDefault();
      const replyBody = document.getElementById("replyBody").value.trim();
      if (!replyBody) return;
      const newMail = {
        id: `m_${Date.now()}`, folder: "sent",
        from: userIdentity ? userIdentity.address : "commander@spmt.live",
        to: activeMail.from, subject: `Re: ${activeMail.subject}`,
        preview: replyBody.slice(0, 50), body: replyBody, time: "Now", tag: "Sent"
      };
      mails.unshift(newMail);
      activeFolder = "sent";
      activeMailId = newMail.id;
      document.querySelectorAll("[data-folder]").forEach(b => b.classList.toggle("active", b.dataset.folder === "sent"));
      renderMail();
      showToast("Reply packet sent successfully!", "success");
    });
  }

  document.getElementById("composeBtn").addEventListener("click", () => {
    const reader = document.getElementById("messageReader");
    reader.innerHTML = `
      <div class="reader-head"><div><span class="tag live">Outbox</span><h3>Compose Station Signal</h3></div></div>
      <form class="compose-grid" id="composeForm">
        <div class="field">
          <label for="composeTo">Destination username</label>
          <div class="address-input">
            <input class="input" id="composeTo" placeholder="athena" required />
            <span>@spmt.live</span>
          </div>
        </div>
        <div class="field">
          <label for="composeSubject">Subject</label>
          <input class="input" id="composeSubject" placeholder="Internal Subject link" required />
        </div>
        <div class="field">
          <label for="composeBody">Log Details</label>
          <textarea id="composeBody" class="input" placeholder="Type logs..." required></textarea>
        </div>
        <button class="btn" type="submit">Establish Packet Route</button>
      </form>
    `;

    document.getElementById("composeForm").addEventListener("submit", e => {
      e.preventDefault();
      const to = document.getElementById("composeTo").value.trim().toLowerCase();
      const subject = document.getElementById("composeSubject").value.trim();
      const body = document.getElementById("composeBody").value.trim();
      const newMail = {
        id: `m_${Date.now()}`, folder: "sent",
        from: userIdentity ? userIdentity.address : "commander@spmt.live",
        to: `${to}@spmt.live`, subject, preview: body.slice(0, 50), body, time: "Now", tag: "Sent"
      };
      mails.unshift(newMail);
      activeFolder = "sent";
      activeMailId = newMail.id;
      document.querySelectorAll("[data-folder]").forEach(b => b.classList.toggle("active", b.dataset.folder === "sent"));
      renderMail();
      showToast("Mail signal dispatched!", "success");
    });
  });

  document.getElementById("mailList").addEventListener("click", e => {
    const item = e.target.closest("[data-mail-id]");
    if (item) { activeMailId = item.dataset.mailId; renderMail(); }
  });

  document.querySelectorAll("[data-folder]").forEach(btn => {
    btn.addEventListener("click", e => {
      activeFolder = e.target.dataset.folder;
      document.querySelectorAll("[data-folder]").forEach(b => b.classList.remove("active"));
      e.target.classList.add("active");
      renderMail();
    });
  });

  // ─────────────────────────────────────────────
  // FORUMS
  // ─────────────────────────────────────────────
  let threads = [
    { id: "t1", title: "How do I register stream overlays?", desc: "Captain Help · 2 posts · Athena answered", category: "Captain Help" },
    { id: "t2", title: "MountainView HUD Calibration ideas", desc: "MountainView Lab · 8 posts · Commander pinned", category: "MountainView Lab" },
    { id: "t3", title: "Tonight's Bridge watch party voting", desc: "Comms Lounge · 12 posts", category: "Comms Lounge" }
  ];
  let activeCategory = "Captain Help";

  function renderForums() {
    const listContainer = document.getElementById("threadList");
    const filtered = threads.filter(t => t.category === activeCategory);
    listContainer.innerHTML = filtered.map(t => `
      <article class="thread-item">
        <div>
          <strong>${t.title}</strong>
          <span>${t.desc}</span>
        </div>
        <div style="display: flex; gap: 6px;">
          <button class="btn-soft btn-mini forum-react-btn" data-thread-id="${t.id}" data-react="👍" type="button">👍</button>
          <button class="btn-soft btn-mini forum-react-btn" data-thread-id="${t.id}" data-react="🔥" type="button">🔥</button>
          <button class="btn-soft btn-mini forum-react-btn" data-thread-id="${t.id}" data-react="🚀" type="button">🚀</button>
        </div>
      </article>
    `).join("");

    document.querySelectorAll(".forum-react-btn").forEach(btn => {
      btn.addEventListener("click", async e => {
        const threadId = e.target.dataset.threadId;
        const reaction = e.target.dataset.react;
        const thread = threads.find(t => t.id === threadId);
        showToast(`Reacted ${reaction} to "${thread.title}"`, "success");
        try {
          await fetch("/api/forums/reaction", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messageId: threadId, reaction, username: userIdentity ? userIdentity.displayName : "Guest" })
          });
        } catch {}
      });
    });
  }

  document.querySelectorAll("[data-category]").forEach(btn => {
    btn.addEventListener("click", e => {
      activeCategory = e.target.dataset.category;
      document.querySelectorAll("[data-category]").forEach(b => b.classList.remove("active"));
      e.target.classList.add("active");
      document.getElementById("forumCategoryTitle").textContent = `# ${e.target.textContent.replace("# ", "")}`;
      renderForums();
    });
  });

  document.getElementById("newThreadBtn").addEventListener("click", () => {
    const form = document.getElementById("threadForm");
    form.style.display = form.style.display === "block" ? "none" : "block";
  });

  document.getElementById("threadForm").addEventListener("submit", e => {
    e.preventDefault();
    const title = document.getElementById("threadTitle").value.trim();
    const category = document.getElementById("threadCategory").value;
    const body = document.getElementById("threadBody").value.trim();
    if (!title || !body) return;
    const newThread = {
      id: `t_${Date.now()}`, title,
      desc: `${category} · 1 post · ${userIdentity ? userIdentity.displayName : "Guest"}`,
      category
    };
    threads.unshift(newThread);
    activeCategory = category;
    document.querySelectorAll("[data-category]").forEach(b => b.classList.toggle("active", b.dataset.category === category));
    document.getElementById("forumCategoryTitle").textContent = `# ${category.toLowerCase().replace(/ /g, "-")}`;
    document.getElementById("threadTitle").value = "";
    document.getElementById("threadBody").value = "";
    document.getElementById("threadForm").style.display = "none";
    renderForums();
    showToast("Thread broadcasted! Webhook payload queued.", "success");
  });

  // ─────────────────────────────────────────────
  // WORKFLOW NODE BUILDER
  // ─────────────────────────────────────────────
  function makeDraggable(node) {
    let offset = [0, 0], isDown = false;
    node.addEventListener("mousedown", e => {
      isDown = true;
      offset = [node.offsetLeft - e.clientX, node.offsetTop - e.clientY];
      node.style.cursor = "grabbing";
    }, true);
    document.addEventListener("mouseup", () => { isDown = false; node.style.cursor = "grab"; }, true);
    document.addEventListener("mousemove", e => {
      if (isDown) { node.style.left = (e.clientX + offset[0]) + "px"; node.style.top = (e.clientY + offset[1]) + "px"; }
    }, true);
  }

  let nodeIdx = 2;
  document.getElementById("addNodeBtn").addEventListener("click", () => {
    nodeIdx++;
    const node = document.createElement("div");
    node.className = "node";
    node.style.left = `${120 + (nodeIdx * 30) % 300}px`;
    node.style.top = `${180 + (nodeIdx * 25) % 150}px`;
    node.innerHTML = `<strong>Routing Action ${nodeIdx}</strong><span>Custom Webhook sqlite link</span>`;
    document.getElementById("workflowCanvas").appendChild(node);
    makeDraggable(node);
  });
  document.querySelectorAll(".node").forEach(makeDraggable);

  // ─────────────────────────────────────────────
  // QR CODE GENERATOR
  // ─────────────────────────────────────────────
  function generateQR(seedText = "Join HearMeOut Room") {
    const grid = document.getElementById("qrGrid");
    if (!grid) return;
    grid.innerHTML = "";
    let seed = 0;
    for (const char of seedText) seed += char.charCodeAt(0);
    for (let i = 0; i < 169; i++) {
      const cell = document.createElement("span");
      cell.className = "qr-cell";
      const corner = (i < 3 * 13 && i % 13 < 3) || (i < 3 * 13 && i % 13 > 9) || (i > 9 * 13 && i % 13 < 3);
      const pseudoRandom = ((i * 37 + seed * 11) % 9) < 4;
      if (corner || pseudoRandom) cell.classList.add("on");
      grid.appendChild(cell);
    }
  }

  document.getElementById("generateQrBtn").addEventListener("click", () => {
    generateQR(document.getElementById("qrAction").value);
    showToast("QR Matrix seed synced!", "success");
  });

  // ─────────────────────────────────────────────
  // SETTINGS CONTROLS
  // ─────────────────────────────────────────────
  document.querySelectorAll(".settings-tab-btn").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".settings-tab-btn").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      const target = tab.dataset.settingsTab;
      document.querySelectorAll(".settings-section").forEach(sec => {
        sec.classList.toggle("active", sec.id === `settings-${target}`);
      });
    });
  });

  ["glassOpacity", "blurStrength", "glowIntensity", "starDensity", "nebulaIntensity", "parallaxDepth"].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("input", e => {
      const val = e.target.value;
      const display = document.getElementById(`${id}Val`);
      if (display) display.textContent = id === "blurStrength" ? `${val}px` : `${val}%`;
      applySettings(getCurrentSettingsFromUI());
    });
    el.addEventListener("change", () => saveSettings(getCurrentSettingsFromUI()));
  });

  document.querySelectorAll(".accent-dot").forEach(dot => {
    dot.addEventListener("click", () => {
      document.querySelectorAll(".accent-dot").forEach(d => d.classList.remove("active"));
      dot.classList.add("active");
      applySettings(getCurrentSettingsFromUI());
      saveSettings(getCurrentSettingsFromUI());
    });
  });

  ["densityControl", "radiusControl", "topbarStyleControl"].forEach(id => {
    const container = document.getElementById(id);
    if (!container) return;
    container.addEventListener("click", e => {
      const btn = e.target.closest(".segment-btn");
      if (!btn) return;
      container.querySelectorAll(".segment-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      applySettings(getCurrentSettingsFromUI());
      saveSettings(getCurrentSettingsFromUI());
    });
  });

  function getCurrentSettingsFromUI() {
    return {
      themePreset: document.querySelector(".accent-dot.active")?.title?.toLowerCase()?.replace(" ", "") || "solar",
      accentColor: document.querySelector(".accent-dot.active")?.dataset?.color || "#ff6a2a",
      glassOpacity: document.getElementById("glassOpacity").value,
      blurStrength: document.getElementById("blurStrength").value,
      glowIntensity: document.getElementById("glowIntensity").value,
      starDensity: document.getElementById("starDensity").value,
      nebulaIntensity: document.getElementById("nebulaIntensity").value,
      parallaxDepth: document.getElementById("parallaxDepth").value,
      uiDensity: document.querySelector("#densityControl .segment-btn.active")?.dataset?.val || "comfortable",
      cornerRadius: document.querySelector("#radiusControl .segment-btn.active")?.dataset?.val || "md",
      topbarStyle: document.querySelector("#topbarStyleControl .segment-btn.active")?.dataset?.val || "transparent"
    };
  }

  document.getElementById("saveThemeBtn").addEventListener("click", () => {
    const name = document.getElementById("themeNameInput").value.trim() || "My SQLite Preset";
    saveSettings(getCurrentSettingsFromUI());
    showToast(`Preset "${name}" saved to SQLite!`, "success");
    loadPresetDB();
  });

  async function loadPresetDB() {
    const grid = document.getElementById("presetsGrid");
    if (!grid) return;
    const list = [
      { name: "Solar Flare", color: "#ff6a2a", preset: "solar" },
      { name: "Nebula Purple", color: "#a968ff", preset: "nebula" },
      { name: "Oceanic Blue", color: "#27d8ff", preset: "ocean" },
      { name: "Aurora Green", color: "#58f7ad", preset: "aurora" }
    ];
    grid.innerHTML = list.map(item => `
      <button class="preset-card" type="button" data-preset="${item.preset}" data-color="${item.color}">
        <span class="preset-dot" style="background: ${item.color};"></span>
        <strong>${item.name}</strong>
      </button>
    `).join("");
    grid.querySelectorAll(".preset-card").forEach(card => {
      card.addEventListener("click", () => {
        const settings = getCurrentSettingsFromUI();
        settings.themePreset = card.dataset.preset;
        settings.accentColor = card.dataset.color;
        applySettings(settings);
        saveSettings(settings);
        loadPresetDB();
        showToast(`Theme set to ${card.querySelector("strong").textContent}!`, "success");
      });
    });
  }

  document.getElementById("resetThemeBtn").addEventListener("click", () => {
    const defaults = {
      themePreset: "solar", accentColor: "#ff6a2a",
      glassOpacity: "65", blurStrength: "22", glowIntensity: "80",
      starDensity: "70", nebulaIntensity: "80", parallaxDepth: "65",
      uiDensity: "comfortable", cornerRadius: "md", topbarStyle: "transparent"
    };
    applySettings(defaults);
    saveSettings(defaults);
    showToast("Theme reset to Solar Flare defaults.", "success");
  });

  // ─────────────────────────────────────────────
  // INIT
  // ─────────────────────────────────────────────
  async function initializeApp() {
    // Place rocket at dock first
    placeRocketAtDock();

    await loadIdentity();
    await loadSettings();

    renderDashboardLists();
    renderMail();
    renderForums();
    generateQR();
    loadPresetDB();

    // Route to correct page
    const hash = window.location.hash.slice(1) || "dashboard";
    showPage(hash);

    // Start stats simulation
    setInterval(simulateDashboardStats, 4500);
  }

  initializeApp();

});
