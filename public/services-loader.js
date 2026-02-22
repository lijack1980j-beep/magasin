// services-loader.js
(function () {
  const KEY_PROJECTS = "gs_projects";
  const root = document.getElementById("servicesProjects");
  if (!root) return;

  function esc(s){
    return String(s ?? "")
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");
  }

  function getProjects(){
    try {
      const arr = JSON.parse(localStorage.getItem(KEY_PROJECTS) || "[]");
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }

  const projects = getProjects();

  if (!projects.length) {
    root.innerHTML = `<p style="color:#999;text-align:center;">No services yet.</p>`;
    return;
  }

  root.innerHTML = projects.map(p => {
    const img = p.image || "/images/hero-image.png";
    const title = p.title || "Untitled";
    const desc = p.desc || "";
    const cat = p.category || "uiux";
    const price = (p.price !== "" && p.price != null) ? `$${Number(p.price).toFixed(2)}` : "";

    return `
      <div class="card">
        <div class="card-image">
          <img src="${esc(img)}" alt="${esc(title)}"
               onerror="this.onerror=null;this.src='/images/hero-image.png';" />
        </div>
        <h3>${esc(title)}</h3>
        <p>${esc(desc)}</p>
        ${price ? `<div style="margin-top:10px;font-weight:700;color:var(--accent-color);">${price}</div>` : ``}
        <div style="margin-top:6px;color:#aaa;font-size:12px;">${esc(cat.toUpperCase())}</div>
      </div>
    `;
  }).join("");
})();
