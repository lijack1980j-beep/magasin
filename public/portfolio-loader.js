// portfolio-loader.js (clean)
// Requires in index.html:
// <div class="portfolio-gallery" id="portfolioGallery"></div>
// <script src="/portfolio-loader.js" defer></script>

function esc(s){
  return String(s ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function normalizeCategory(c){
  const s = String(c ?? "").toLowerCase().trim();
  if (!s) return "other";
  if (s.includes("ui")) return "uiux";
  if (s.includes("inter")) return "interior";
  if (s.includes("exter")) return "exterior";
  if (["uiux","interior","exterior","other"].includes(s)) return s;
  return "other";
}

async function loadFeatured() {
  const el = document.getElementById("portfolioGallery");
  if (!el) return;

  el.innerHTML = `<p style="color:#999;text-align:center;">Loading...</p>`;

  // ✅ Only featured
  const res = await fetch("/api/projects?featured=1", { cache: "no-store" });
  const json = await res.json().catch(() => ({}));

  if (!res.ok || !json.ok) {
    el.innerHTML = `<p style="color:#999;text-align:center;">${esc(json.error || "Error loading")}</p>`;
    return;
  }

  const featured = json.projects || [];
  if (!featured.length) {
    el.innerHTML = `<p style="color:#999;text-align:center;">No featured projects yet. Tick “Featured” in Admin.</p>`;
    return;
  }

  el.innerHTML = featured.slice(0, 6).map(p => {
    const cat = normalizeCategory(p.category);
    const img = p.cover_image_url || "/images/hero-image.png";

    return `
      <a class="project-link" href="/gallery.html?cat=${encodeURIComponent(cat)}">
        <div class="project">
          <img src="${esc(img)}" alt="${esc(p.title || "Project")}"
               onerror="this.onerror=null;this.src='/images/hero-image.png';" />
          <div class="project-overlay">
            <h4>${esc(p.title || "Project")}</h4>
            <p>${esc(p.description || "")}</p>
          </div>
        </div>
      </a>
    `;
  }).join("");
}

loadFeatured();
