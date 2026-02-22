const statusEl = document.getElementById("adminStatus");
const listEl = document.getElementById("projectsList");

let editingId = null;

function setStatus(msg) {
  if (statusEl) statusEl.textContent = msg || "";
}

function getAdminKey() {
  const input = document.getElementById("adminKey");
  if (!input) return "";
  const saved = localStorage.getItem("GS_ADMIN_KEY");
  if (saved && !input.value) input.value = saved;

  const k = (input.value || "").trim();
  if (k) localStorage.setItem("GS_ADMIN_KEY", k);
  return k;
}

function esc(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function fileToBase64(file) {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function readForm() {
  return {
    title: document.getElementById("pTitle")?.value.trim(),
    category: document.getElementById("pCategory")?.value || "other",
    description: document.getElementById("pDescription")?.value.trim() || "",
    tags: document.getElementById("pTags")?.value || "",
    live_url: document.getElementById("pLive")?.value.trim() || "",
    repo_url: document.getElementById("pRepo")?.value.trim() || "",
    featured: document.getElementById("pFeatured")?.checked || false,
    sort_order: Number(document.getElementById("pSort")?.value || 0),
    cover_image_url: document.getElementById("pImageUrl")?.value.trim() || null,
    file: document.getElementById("pFile")?.files?.[0] || null,
  };
}

function fillForm(p) {
  document.getElementById("pTitle").value = p.title || "";
  document.getElementById("pCategory").value = (p.category || "other");
  document.getElementById("pDescription").value = p.description || "";
  document.getElementById("pTags").value = Array.isArray(p.tags) ? p.tags.join(", ") : (p.tags || "");
  document.getElementById("pLive").value = p.live_url || "";
  document.getElementById("pRepo").value = p.repo_url || "";
  document.getElementById("pFeatured").checked = !!p.featured;
  document.getElementById("pSort").value = Number(p.sort_order || 0);
  document.getElementById("pImageUrl").value = p.cover_image_url || "";
  document.getElementById("pFile").value = "";
}

function resetForm() {
  editingId = null;
  document.getElementById("saveProjectBtn").textContent = "Save to Gallery";
  setStatus("");
  document.getElementById("pTitle").value = "";
  document.getElementById("pDescription").value = "";
  document.getElementById("pTags").value = "";
  document.getElementById("pLive").value = "";
  document.getElementById("pRepo").value = "";
  document.getElementById("pFeatured").checked = false;
  document.getElementById("pSort").value = "0";
  document.getElementById("pImageUrl").value = "";
  document.getElementById("pFile").value = "";
}

async function fetchProjects() {
  const adminKey = getAdminKey();
  if (!adminKey) {
    setStatus("Enter Admin API Key to load projects.");
    return;
  }

  setStatus("Loading projects...");
  const res = await fetch("/api/admin-project", {
    headers: { "x-admin-key": adminKey },
    cache: "no-store",
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.ok) {
    setStatus("Load failed: " + (json.error || "unknown"));
    return;
  }

  setStatus("");
  renderList(json.projects || []);
}

function renderList(items) {
  if (!listEl) return;

  if (!items.length) {
    listEl.innerHTML = `<p style="color:#999;">No projects yet.</p>`;
    return;
  }

  listEl.innerHTML = items.map(p => `
    <div style="display:grid;grid-template-columns:120px 1fr auto;gap:12px;align-items:center;background:#131313;border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:12px;">
      <div style="width:120px;height:80px;overflow:hidden;border-radius:10px;background:#0f0f0f;">
        <img src="${esc(p.cover_image_url || "/images/hero-image.png")}"
             style="width:100%;height:100%;object-fit:cover;display:block;"
             onerror="this.onerror=null;this.src='/images/hero-image.png';" />
      </div>

      <div>
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
          <strong>${esc(p.title || "Untitled")}</strong>
          <span style="color:#00bcd4;font-size:12px;border:1px solid rgba(255,255,255,.12);padding:2px 8px;border-radius:999px;">
            ${esc(p.category || "other")}
          </span>
          ${p.featured ? `<span style="color:#ff0080;font-size:12px;">★ featured</span>` : ""}
          <span style="color:#888;font-size:12px;">Sort: ${Number(p.sort_order || 0)}</span>
        </div>
        <div style="color:#aaa;font-size:13px;margin-top:4px;">${esc(p.description || "")}</div>
      </div>

      <div style="display:flex;gap:10px;align-items:center;">
        <button data-edit="${p.id}" class="add-cart-btn" style="padding:8px 12px;">Edit</button>
        <button data-del="${p.id}" class="add-cart-btn" style="padding:8px 12px;">Delete</button>
      </div>
    </div>
  `).join("");

  listEl.querySelectorAll("button[data-edit]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-edit");
      const p = items.find(x => x.id === id);
      if (!p) return;
      editingId = id;
      fillForm(p);
      document.getElementById("saveProjectBtn").textContent = "Update Project";
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });

  listEl.querySelectorAll("button[data-del]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const adminKey = getAdminKey();
      const id = btn.getAttribute("data-del");
      if (!id) return;
      if (!confirm("Delete this project?")) return;

      setStatus("Deleting...");
      const res = await fetch("/api/admin-project", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": adminKey,
        },
        body: JSON.stringify({ id }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        setStatus("Delete failed: " + (json.error || "unknown"));
        return;
      }

      setStatus("Deleted ✅");
      fetchProjects();
    });
  });
}

document.getElementById("saveProjectBtn")?.addEventListener("click", async () => {
  const adminKey = getAdminKey();
  if (!adminKey) return alert("Enter Admin API Key first.");

  const f = readForm();
  if (!f.title) return alert("Title is required.");

  const payload = {
    id: editingId || undefined,
    title: f.title,
    category: f.category,
    description: f.description,
    tags: f.tags,
    live_url: f.live_url || null,
    repo_url: f.repo_url || null,
    featured: f.featured,
    sort_order: f.sort_order,
    cover_image_url: f.cover_image_url,
  };

  if (f.file) {
    if (f.file.size > 4 * 1024 * 1024) return alert("Image too big (max ~4MB).");
    setStatus("Reading image...");
    payload.image_base64 = await fileToBase64(f.file);
    payload.image_mime = f.file.type || "image/png";
    payload.image_filename = f.file.name || "cover.png";
  }

  setStatus(editingId ? "Updating..." : "Saving...");

  const res = await fetch("/api/admin-project", {
    method: editingId ? "PUT" : "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-key": adminKey,
    },
    body: JSON.stringify(payload),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.ok) {
    setStatus("");
    return alert("Save failed: " + (json.error || "unknown"));
  }

  setStatus(editingId ? "Updated ✅" : "Saved ✅");
  resetForm();
  fetchProjects();
});

// Load list when key entered/changed
document.getElementById("adminKey")?.addEventListener("change", fetchProjects);

// Try auto-load on page load if key saved
window.addEventListener("DOMContentLoaded", () => {
  const k = getAdminKey();
  if (k) fetchProjects();
});
