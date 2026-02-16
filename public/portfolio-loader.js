import { supabase } from "/supabaseClient.js";

const el = document.getElementById("portfolioGallery");
if (!el) console.warn("Missing #portfolioGallery");

function esc(s){
  return String(s ?? "")
    .replaceAll("&","&amp;").replaceAll("<","&lt;")
    .replaceAll(">","&gt;").replaceAll('"',"&quot;")
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

  const res = await fetch("/api/projects");
  const json = await res.json();

  if (!res.ok || !json.ok) {
    el.innerHTML = `<p style="color:#999;text-align:center;">${json.error || "Error loading"}</p>`;
    return;
  }

  const featured = (json.projects || []).filter(p => p.featured);

  if (!featured.length) {
    el.innerHTML = `<p style="color:#999;text-align:center;">No featured projects yet. Tick “Featured” in Admin.</p>`;
    return;
  }

  el.innerHTML = featured.slice(0, 6).map(p => {
    const cat = String(p.category || "other").toLowerCase();
    const img = p.cover_image_url || "/images/hero-image.png";
    return `
      <a class="project-link" href="/gallery.html?cat=${encodeURIComponent(cat)}">
        <div class="project">
          <img src="${img}" alt="${p.title || "Project"}"
               onerror="this.onerror=null;this.src='/images/hero-image.png';" />
          <div class="project-overlay">
            <h4>${p.title || "Project"}</h4>
            <p>${p.description || ""}</p>
          </div>
        </div>
      </a>
    `;
  }).join("");
}

loadFeatured();

async function load(){
  if (!el) return;
  el.innerHTML = `<p style="color:#999;text-align:center;">Loading...</p>`;

  const { data, error } = await supabase
    .from("projects")
    .select("id,title,description,category,cover_image_url,featured,sort_order,created_at")
    .eq("featured", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(12);

  if (error){
    el.innerHTML = `<p style="color:#999;text-align:center;">Portfolio error: ${esc(error.message)}</p>`;
    return;
  }

  const list = data || [];
  if (!list.length){
    el.innerHTML = `<p style="color:#999;text-align:center;">No featured projects yet. In Admin, tick “Featured”.</p>`;
    return;
  }

  el.innerHTML = list.map(p => {
    const cat = normalizeCategory(p.category);
    const img = p.cover_image_url || "/images/hero-image.png";

    // click -> gallery filtered by category
    const href = `/gallery.html?cat=${encodeURIComponent(cat)}`;

    return `
      <a class="project-link" href="${href}">
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

load();
