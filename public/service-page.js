// service-page.js
const KEY_PROJECTS = "gs_projects";

const grid = document.getElementById("serviceGrid");
const statusEl = document.getElementById("serviceStatus");
const category = (window.SERVICE_CATEGORY || "").toLowerCase();

function esc(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;").replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function safeParse(v, fallback) {
  try { return JSON.parse(v); } catch { return fallback; }
}

function getProjects() {
  const list = safeParse(localStorage.getItem(KEY_PROJECTS), []);
  return Array.isArray(list) ? list : [];
}

function normalizeCategory(c) {
  const s = String(c ?? "").toLowerCase().trim();
  if (!s) return "other";
  if (s.includes("ui")) return "uiux";
  if (s.includes("inter")) return "interior";
  if (s.includes("exter")) return "exterior";
  return s;
}

function render() {
  if (!grid) return;

  const all = getProjects();
  const filtered = category
    ? all.filter(p => normalizeCategory(p.category) === category)
    : all;

  if (!filtered.length) {
    grid.innerHTML = "";
    if (statusEl) statusEl.textContent = "No projects yet. Add some from Admin → Services.";
    return;
  }

  if (statusEl) statusEl.textContent = "";

  grid.innerHTML = filtered.map(p => {
    const img = p.image || "/images/hero-image.png";
    const title = p.title || "Untitled";
    const desc = p.desc || "";
    const price = (p.price !== "" && p.price != null) ? `$${Number(p.price).toFixed(2)}` : "";

    // Optional: if you saved a videoUrl in admin
    const video = p.videoUrl
      ? `<a class="mini-link" href="${esc(p.videoUrl)}" target="_blank" rel="noopener">Video</a>`
      : "";

    return `
      <div class="product-card">
        <div class="product-image-wrapper">
          <img src="${esc(img)}"
               alt="${esc(title)}"
               onerror="this.onerror=null;this.src='/images/hero-image.png';" />
        </div>

        <div class="product-info">
          <h3>${esc(title)}</h3>
          <p>${esc(desc)}</p>
          ${price ? `<div class="price">${esc(price)}</div>` : ""}
          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            ${video}
          </div>
        </div>
      </div>
    `;
  }).join("");
}

window.addEventListener("DOMContentLoaded", render);

// Auto refresh if you come back after saving in Admin (same browser)
window.addEventListener("focus", render);
