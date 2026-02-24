// gallery.js (stable + modal-ready)
// Requires in gallery.html:
// <div id="galleryStatus"></div>
// <div id="galleryRoot"></div>
// Optional: #filters, #searchInput, #sortSelect

const root = document.getElementById("galleryRoot");
const statusEl = document.getElementById("galleryStatus");

const filtersEl = document.getElementById("filters");
const searchInput = document.getElementById("searchInput");
const sortSelect = document.getElementById("sortSelect");

const CATEGORY_LABELS = {
  uiux: "UI/UX",
  interior: "Interior Architecture",
  exterior: "Exterior Architecture",
  other: "Other",
};

const CATEGORY_DEFAULT_IMAGE = {
  uiux: "/images/uiux.png",
  interior: "/images/interior.png",
  exterior: "/images/exterior.png",
  other: "/images/hero-image.png",
};

const state = {
  projects: [],
  category: "all",
  q: "",
  sort: "new",
};

// ✅ expose for modal script
window.__GS_STATE__ = state;

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeCategory(c) {
  const s = String(c ?? "").toLowerCase().trim();
  if (!s) return "other";
  if (s.includes("ui")) return "uiux";
  if (s.includes("inter")) return "interior";
  if (s.includes("exter")) return "exterior";
  if (["uiux", "interior", "exterior", "other"].includes(s)) return s;
  return "other";
}

function getDefaultImage(cat) {
  return CATEGORY_DEFAULT_IMAGE[cat] || CATEGORY_DEFAULT_IMAGE.other;
}

/**
 * ✅ extra_images may arrive as:
 * - array: ["url1","url2"]
 * - string CSV: "url1, url2"
 * - string JSON: '["url1","url2"]'
 * We'll normalize to array.
 */
function normalizeExtraImages(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v.filter(Boolean).map(String);

  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return [];

    // JSON array string
    if ((s.startsWith("[") && s.endsWith("]")) || (s.startsWith("{") && s.endsWith("}"))) {
      try {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed)) return parsed.filter(Boolean).map(String);
      } catch {}
    }

    // CSV string
    return s.split(",").map(x => x.trim()).filter(Boolean);
  }

  return [];
}

// ✅ read category from URL: /gallery.html?cat=uiux
{
  const params = new URLSearchParams(window.location.search);
  const urlCat = params.get("cat");
  if (urlCat) state.category = normalizeCategory(urlCat);
}

function applyFilters(list) {
  let out = [...list];

  const q = state.q.toLowerCase().trim();
  if (q) {
    out = out.filter((p) => {
      const hay = `${p.title} ${p.description} ${(p.tags || []).join(" ")}`.toLowerCase();
      return hay.includes(q);
    });
  }

  if (state.category !== "all") {
    out = out.filter((p) => normalizeCategory(p.category) === state.category);
  }

  if (state.sort === "stars") {
    out.sort((a, b) => (b.stars_count || 0) - (a.stars_count || 0));
  } else if (state.sort === "az") {
    out.sort((a, b) => String(a.title).localeCompare(String(b.title)));
  } else {
    out.sort((a, b) => {
      const da = a.created_at ? new Date(a.created_at).getTime() : 0;
      const db = b.created_at ? new Date(b.created_at).getTime() : 0;
      return db - da;
    });
  }

  return out;
}

function countByCategory(list) {
  const counts = { all: list.length, uiux: 0, interior: 0, exterior: 0, other: 0 };
  for (const p of list) {
    const c = normalizeCategory(p.category);
    counts[c] = (counts[c] || 0) + 1;
  }
  return counts;
}

function renderFilters() {
  if (!filtersEl) return;

  const q = state.q.toLowerCase().trim();
  const base = q
    ? state.projects.filter(p => (`${p.title} ${p.description} ${(p.tags||[]).join(" ")}`).toLowerCase().includes(q))
    : state.projects;

  const counts = countByCategory(base);

  const chips = [
    ["all", `All (${counts.all})`],
    ["uiux", `UI/UX (${counts.uiux})`],
    ["interior", `Interior (${counts.interior})`],
    ["exterior", `Exterior (${counts.exterior})`],
    ["other", `Other (${counts.other})`],
  ];

  filtersEl.innerHTML = chips.map(([key, label]) => {
    const active = state.category === key ? "is-active" : "";
    return `<button class="filter-chip ${active}" data-cat="${key}" type="button">${escapeHtml(label)}</button>`;
  }).join("");

  filtersEl.querySelectorAll("button[data-cat]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.category = btn.getAttribute("data-cat") || "all";
      render();
    });
  });
}

function projectCard(p) {
  const cat = normalizeCategory(p.category);
  const img = p.cover_image_url || getDefaultImage(cat);
  const tags = Array.isArray(p.tags) ? p.tags.slice(0, 6) : [];

  const repo = p.repo_url ? `<a class="mini-link" href="${escapeHtml(p.repo_url)}" target="_blank" rel="noopener">GitHub</a>` : "";
  const live = p.live_url ? `<a class="mini-link" href="${escapeHtml(p.live_url)}" target="_blank" rel="noopener">Live</a>` : "";

  // ✅ IMPORTANT: data-id is required for popup
  return `
    <article class="g-card" data-id="${escapeHtml(p.id)}" role="button" tabindex="0">
      <div class="g-card-img">
        <img src="${escapeHtml(img)}"
             alt="${escapeHtml(p.title || "Project")}"
             loading="lazy"
             onerror="this.onerror=null;this.src='${getDefaultImage(cat)}';" />
      </div>

      <div class="g-card-body">
        <div class="g-card-top">
          <span class="g-badge">${escapeHtml(CATEGORY_LABELS[cat] || "Other")}</span>
          ${p.featured ? `<span class="g-stars">★ featured</span>` : `<span class="g-stars">★ ${Number(p.stars_count || 0)}</span>`}
        </div>

        <h3 class="g-title">${escapeHtml(p.title || "Untitled")}</h3>
        <p class="g-desc">${escapeHtml(p.description || "")}</p>

        <div class="g-tags">
          ${tags.map(t => `<span class="tag-chip">${escapeHtml(t)}</span>`).join("")}
        </div>

        <div class="g-actions">
          ${repo}
          ${live}
        </div>
      </div>
    </article>
  `;
}

function renderGrouped(list) {
  const groups = { uiux: [], interior: [], exterior: [], other: [] };
  for (const p of list) groups[normalizeCategory(p.category)].push(p);

  const order = ["uiux", "interior", "exterior", "other"];

  root.innerHTML = order
    .filter(k => groups[k].length)
    .map(k => `
      <section class="g-section">
        <h2 class="g-section-title">${escapeHtml(CATEGORY_LABELS[k] || "Other")}</h2>
        <div class="g-grid">
          ${groups[k].map(projectCard).join("")}
        </div>
      </section>
    `).join("");

  if (!root.innerHTML.trim()) {
    root.innerHTML = `<p class="gallery-empty">No projects found.</p>`;
  }
}

function render() {
  if (!root) return;

  renderFilters();

  const filtered = applyFilters(state.projects);
  if (!filtered.length) {
    root.innerHTML = `<p class="gallery-empty">No projects found.</p>`;
    return;
  }

  if (state.category === "all") renderGrouped(filtered);
  else root.innerHTML = `<div class="g-grid">${filtered.map(projectCard).join("")}</div>`;
}

async function loadProjects() {
  if (statusEl) statusEl.textContent = "Loading projects...";

  try {
    const res = await fetch("/api/projects", { cache: "no-store" });

    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("application/json")) {
      const text = await res.text();
      throw new Error(`API returned ${res.status} (${ct}). First chars: ${text.slice(0, 120)}`);
    }

    const json = await res.json();
    if (!res.ok || !json.ok) throw new Error(json.error || "Failed to load");

    state.projects = (json.projects || []).map(p => ({
      ...p,
      id: p.id,
      category: normalizeCategory(p.category),
      tags: Array.isArray(p.tags) ? p.tags : (typeof p.tags === "string" ? p.tags.split(",").map(x=>x.trim()).filter(Boolean) : []),
      stars_count: Number(p.stars_count || 0),

      // ✅ VERY IMPORTANT: normalize extra images so modal will show URLs
      extra_images: normalizeExtraImages(p.extra_images),
    }));

    if (statusEl) statusEl.textContent = state.projects.length ? "" : "No projects found yet.";
    render();
  } catch (e) {
    console.error(e);
    if (statusEl) statusEl.textContent = "Gallery error: " + e.message;
  }
}

// Hook UI
if (searchInput) {
  searchInput.addEventListener("input", (e) => {
    state.q = e.target.value || "";
    render();
  });
}
if (sortSelect) {
  sortSelect.addEventListener("change", (e) => {
    state.sort = e.target.value || "new";
    render();
  });
}

loadProjects();
