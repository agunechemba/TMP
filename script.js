/* ============================================================
   THE MAGIC OF PROGRAMMING — PAGE-TURNING ENGINE
   ============================================================ */

(function () {
  "use strict";

  /* ---------- Reference ---------- */
  const pages      = Array.from(document.querySelectorAll(".book-page"));
  const STORAGE_KEY = "magic-programming:last-page";

  let currentIndex = 0;
  let isReady      = false;

  /* ---------- Build reading progress + indicator + hint ---------- */
  const progress = document.createElement("div");
  progress.className = "reading-progress";
  progress.innerHTML = '<div class="reading-progress-fill"></div>';
  document.body.appendChild(progress);

  const indicator = document.createElement("div");
  indicator.className = "page-indicator";
  indicator.setAttribute("aria-live", "polite");
  document.body.appendChild(indicator);

  const hint = document.createElement("div");
  hint.className = "page-hint";
  hint.textContent = "← → to turn pages";
  document.body.appendChild(hint);

  /* ---------- Helpers ---------- */
  function pageById(id) {
    if (!id) return null;
    const el = document.getElementById(id);
    return el && el.classList.contains("book-page") ? el : null;
  }

  function updateChrome() {
    const total   = pages.length;
    const percent = ((currentIndex + 1) / total) * 100;
    const fill    = progress.querySelector(".reading-progress-fill");
    fill.style.width = percent + "%";

    const page = pages[currentIndex];
    let label;
    if (page.classList.contains("cover-page")) {
      label = page.id === "back-cover" ? "The End" : "Cover";
    } else if (page.id === "glossary") {
      label = "Glossary";
    } else {
      // Extract "Chapter N"
      const heading = page.querySelector("h2");
      const match   = heading && heading.textContent.match(/Chapter\s+\d+/i);
      label         = match ? match[0] : "Page";
    }
    indicator.textContent = label + " · " + (currentIndex + 1) + "/" + total;

    // Hide the arrow hint on the first and last page
    if (currentIndex === 0 || currentIndex === total - 1) {
      hint.classList.add("hidden");
    } else {
      hint.classList.remove("hidden");
    }
  }

  /* ---------- Core: show a page ---------- */
  function showPage(idOrEl, opts = {}) {
    const { updateHistory = true, smooth = true } = opts;
    const target = typeof idOrEl === "string" ? pageById(idOrEl) : idOrEl;
    if (!target) return;

    const newIndex = pages.indexOf(target);
    if (newIndex === -1) return;
    if (newIndex === currentIndex && target.classList.contains("active")) return;

    const direction = newIndex > currentIndex ? 1 : -1;

    // Hide current
    pages.forEach((p) => {
      p.classList.remove("active", "page-enter");
    });

    // Show new
    target.classList.add("active");
    // Trigger reflow so the animation can replay
    void target.offsetWidth;
    target.classList.add("page-enter");

    // Update state
    currentIndex = newIndex;
    updateChrome();

    // Scroll to top of the page
    window.scrollTo({ top: 0, behavior: smooth ? "smooth" : "auto" });

    // Store position
    try {
      localStorage.setItem(STORAGE_KEY, target.id);
    } catch (_) { /* private mode, ignore */ }

    // Update URL (so back/forward work naturally)
    if (updateHistory) {
      const newHash = "#" + target.id;
      if (location.hash !== newHash) {
        history.pushState({ page: target.id }, "", newHash);
      }
    }

    // Slight parallax hint — just a subtle tilt in the direction of travel
    target.style.setProperty("--page-tilt", direction > 0 ? "-0.4deg" : "0.4deg");
  }

  /* ---------- Intercept all internal links ---------- */
  document.addEventListener("click", function (e) {
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;
    const id = link.getAttribute("href").slice(1);
    if (!id) return;
    const target = pageById(id);
    if (!target) return;

    e.preventDefault();
    showPage(target);
  });

  /* ---------- Keyboard navigation ---------- */
  document.addEventListener("keydown", function (e) {
    // Don't hijack typing
    const tag = (e.target.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea" || e.target.isContentEditable) return;

    if (e.key === "ArrowRight" || e.key === "PageDown") {
      if (currentIndex < pages.length - 1) {
        e.preventDefault();
        showPage(pages[currentIndex + 1]);
      }
    } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
      if (currentIndex > 0) {
        e.preventDefault();
        showPage(pages[currentIndex - 1]);
      }
    } else if (e.key === "Home") {
      e.preventDefault();
      showPage(pages[0]);
    } else if (e.key === "End") {
      e.preventDefault();
      showPage(pages[pages.length - 1]);
    }
  });

  /* ---------- Browser back/forward ---------- */
  window.addEventListener("popstate", function () {
    const id = location.hash.slice(1);
    if (!id) {
      showPage(pages[0], { updateHistory: false });
      return;
    }
    const target = pageById(id);
    if (target) showPage(target, { updateHistory: false });
  });

  /* ---------- Init ---------- */
  function init() {
    document.body.classList.add("js-ready");

    // Priority: URL hash → saved position → cover
    let startId = null;

    if (location.hash) {
      const t = pageById(location.hash.slice(1));
      if (t) startId = t.id;
    }

    if (!startId) {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved && pageById(saved)) startId = saved;
      } catch (_) {}
    }

    if (!startId && pages.length) startId = pages[0].id;

    if (startId) {
      const target = pageById(startId);
      if (target) {
        // Show without animation on first paint
        pages.forEach((p) => p.classList.remove("active", "page-enter"));
        target.classList.add("active");
        currentIndex = pages.indexOf(target);
        updateChrome();
        // Sync URL
        if (location.hash.slice(1) !== target.id) {
          history.replaceState({ page: target.id }, "", "#" + target.id);
        }
      }
    }

    // Mark ready so CSS can lock visibility to `.active`
    isReady = true;

    // Fade out hint after a few seconds on the first chapter
    setTimeout(() => {
      if (currentIndex > 0) hint.classList.remove("hidden");
    }, 4000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();