import { supabase } from "/supabaseClient.js";

const root = document.getElementById("galleryRoot");
const statusEl = document.getElementById("galleryStatus");

// Optional UI elements (may be missing depending on your gallery.html)
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
// ✅ Read category from URL: /gallery.html?cat=uiux
const params = new URLSearchParams(window.location.search);
const urlCat = params.get("cat");
if (urlCat) state.category = normalizeCategory(urlCat);


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

function getLocalProjects() {
  const KEY = "gs_projects";
  try {
    const arr = JSON.parse(localStorage.getItem(KEY) || "[]");
    if (!Array.isArray(arr)) return [];
    return arr.map((p, i) => ({
      id: p.id || p.repo_full_name || `local-${i}`,
      title: p.title || p.name || "Untitled",
      description: p.description || "",
      category: normalizeCategory(p.category),
      tags: Array.isArray(p.tags) ? p.tags : [],
      cover_image_url: p.cover_image_url || p.coverImageUrl || "",
      repo_url: p.repo_url || p.github || p.repoUrl || "",
      live_url: p.live_url || p.liveUrl || "",
      stars_count: Number(p.stars_count || p.stars || 0),
      created_at: p.created_at || null,
      repo_full_name: p.repo_full_name || "",
    }));
  } catch {
    return [];
  }
}

function applyFilters(list) {
  let out = [...list];

  // search
  const q = state.q.toLowerCase().trim();
  if (q) {
    out = out.filter((p) => {
      const hay = `${p.title} ${p.description} ${(p.tags || []).join(" ")} ${p.repo_full_name || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }

  // category
  if (state.category !== "all") {
    out = out.filter((p) => normalizeCategory(p.category) === state.category);
  }

  // sort
  if (state.sort === "stars") {
    out.sort((a, b) => (b.stars_count || 0) - (a.stars_count || 0));
  } else if (state.sort === "az") {
    out.sort((a, b) => String(a.title).localeCompare(String(b.title)));
  } else {
    // newest
    out.sort((a, b) => {
      const da = a.created_at ? new Date(a.created_at).getTime() : 0;
      const db = b.created_at ? new Date(b.created_at).getTime() : 0;
      return db - da;
    });
  }

  return out;
}

// counts ignore category selection but include search
function applyFiltersForCounts(list) {
  const q = state.q.toLowerCase().trim();
  if (!q) return list;
  return list.filter((p) => {
    const hay = `${p.title} ${p.description} ${(p.tags || []).join(" ")} ${p.repo_full_name || ""}`.toLowerCase();
    return hay.includes(q);
  });
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
  if (!filtersEl) return; // ✅ no crash if missing

  const counts = countByCategory(applyFiltersForCounts(state.projects));
  const chips = [
    ["all", `All (${counts.all})`],
    ["uiux", `UI/UX (${counts.uiux})`],
    ["interior", `Interior (${counts.interior})`],
    ["exterior", `Exterior (${counts.exterior})`],
    ["other", `Other (${counts.other})`],
  ];

  filtersEl.innerHTML = chips
    .map(([key, label]) => {
      const active = state.category === key ? "is-active" : "";
      return `<button class="filter-chip ${active}" data-cat="${key}" type="button">${escapeHtml(label)}</button>`;
    })
    .join("");

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
  const tags = (p.tags || []).slice(0, 6);

  const repo = p.repo_url
    ? `<a class="mini-link" href="${escapeHtml(p.repo_url)}" target="_blank" rel="noopener">GitHub</a>`
    : "";

  const live = p.live_url
    ? `<a class="mini-link" href="${escapeHtml(p.live_url)}" target="_blank" rel="noopener">Live</a>`
    : "";

  return `
    <article class="g-card">
      <div class="g-card-img">
        <img src="${escapeHtml(img)}"
             alt="${escapeHtml(p.title)}"
             loading="lazy"
             onerror="this.onerror=null;this.src='${getDefaultImage(cat)}';" />
      </div>

      <div class="g-card-body">
        <div class="g-card-top">
          <span class="g-badge">${escapeHtml(CATEGORY_LABELS[cat] || "Other")}</span>
          <span class="g-stars">★ ${Number(p.stars_count || 0)}</span>
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
  for (const p of list) {
    const c = normalizeCategory(p.category);
    groups[c].push(p);
  }

  const order = ["uiux", "interior", "exterior", "other"];

  root.innerHTML = order
    .filter((k) => groups[k].length)
    .map((k) => `
      <section class="g-section">
        <h2 class="g-section-title">${escapeHtml(CATEGORY_LABELS[k] || "Other")}</h2>
        <div class="g-grid">
          ${groups[k].map(projectCard).join("")}
        </div>
      </section>
    `)
    .join("");

  if (!root.innerHTML.trim()) {
    root.innerHTML = `<p class="gallery-empty">No projects match your filters.</p>`;
  }
}

function renderFlat(list) {
  root.innerHTML = `<div class="g-grid">${list.map(projectCard).join("")}</div>`;
}

function render() {
  if (!root) return;
  renderFilters();

  const filtered = applyFilters(state.projects);
  if (!filtered.length) {
    root.innerHTML = `<p class="gallery-empty">No projects found.</p>`;
    return;
  }

  // If "All" show grouped sections, else show grid
  if (state.category === "all") renderGrouped(filtered);
  else renderFlat(filtered);
}

async function loadProjects() {
  if (statusEl) statusEl.textContent = "Loading projects...";

  try {
    const { data, error } = await supabase
      .from("projects")
      .select("id,title,description,category,tags,cover_image_url,repo_url,live_url,stars_count,created_at,repo_full_name")
      .order("created_at", { ascending: false });

    if (error) throw error;

    state.projects = (data || []).map((p) => ({
      ...p,
      category: normalizeCategory(p.category),
      tags: Array.isArray(p.tags) ? p.tags : [],
      stars_count: Number(p.stars_count || 0),
    }));

    if (statusEl) statusEl.textContent = state.projects.length ? "" : "No projects found yet.";
    render();
    return;
  } catch (e) {
    console.warn("Supabase fetch failed, fallback to localStorage:", e?.message);
  }

  // fallback
  state.projects = getLocalProjects();
  if (statusEl) statusEl.textContent = state.projects.length ? "" : "No projects found (Supabase + localStorage empty).";
  render();
}



// Hook UI only if elements exist ✅
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
