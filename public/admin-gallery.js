// admin-gallery.js (FULL)
// Requires /api/admin-project that supports GET/POST/PUT/DELETE with x-admin-key

const LOGIN_KEY = "GS_ADMIN_KEY"; // sessionStorage key
let editingId = null;

const loginSection = document.getElementById("loginSection");
const managerSection = document.getElementById("managerSection");

const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");

const adminKeyInput = document.getElementById("adminKeyInput");
const loginStatus = document.getElementById("loginStatus");

const statusEl = document.getElementById("adminStatus");
const listEl = document.getElementById("projectsList");

function show(el) { el?.classList.remove("hidden"); }
function hide(el) { el?.classList.add("hidden"); }

function setLoginStatus(msg) {
  if (!loginStatus) return;
  loginStatus.textContent = msg || "";
  msg ? show(loginStatus) : hide(loginStatus);
}

function setStatus(msg) {
  if (!statusEl) return;
  statusEl.textContent = msg || "";
  msg ? show(statusEl) : hide(statusEl);
}

function getAdminKey() {
  return (sessionStorage.getItem(LOGIN_KEY) || "").trim();
}
function setAdminKey(key) {
  sessionStorage.setItem(LOGIN_KEY, String(key || "").trim());
}
function clearAdminKey() {
  sessionStorage.removeItem(LOGIN_KEY);
}

// Auto logout when leaving page (close/refresh/navigate away)
window.addEventListener("beforeunload", () => {
  clearAdminKey();
});

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
  document.getElementById("pCategory").value = p.category || "other";
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

function showManager() {
  hide(loginSection);
  show(managerSection);
}
function showLogin() {
  show(loginSection);
  hide(managerSection);
  resetForm();
}

async function safeJson(res) {
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) {
    const text = await res.text();
    throw new Error(`API returned ${res.status} (${ct}). First chars: ${text.slice(0, 80)}`);
  }
  return await res.json();
}

async function fetchProjects() {
  const adminKey = getAdminKey();
  if (!adminKey) return;

  setStatus("Loading projects...");
  try {
    const res = await fetch("/api/admin-project", {
      headers: { "x-admin-key": adminKey },
      cache: "no-store",
    });

    const json = await safeJson(res);
    if (!res.ok || !json.ok) {
      setStatus("Load failed: " + (json.error || "unknown"));
      return;
    }

    setStatus("");
    renderList(json.projects || []);
  } catch (e) {
    console.error(e);
    setStatus("Load failed: " + e.message);
  }
}

function renderList(items) {
  if (!listEl) return;

  if (!items.length) {
    listEl.innerHTML = `<div class="notice">No projects yet.</div>`;
    return;
  }

  listEl.innerHTML = items.map(p => `
    <div class="p-item">
      <div class="p-thumb">
        <img src="${esc(p.cover_image_url || "/images/hero-image.png")}"
             onerror="this.onerror=null;this.src='/images/hero-image.png';" />
      </div>

      <div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
          <strong>${esc(p.title || "Untitled")}</strong>
          <span class="pill">${esc(p.category || "other")}</span>
          ${p.featured ? `<span class="pill" style="border-color:rgba(255,0,80,.35);">★ featured</span>` : ""}
          <span class="mini">Sort: ${Number(p.sort_order || 0)}</span>
        </div>
        <div class="mini" style="margin-top:6px;">${esc(p.description || "")}</div>
      </div>

      <div style="display:flex;gap:10px;align-items:center;">
        <button class="btn" data-edit="${p.id}" type="button">Edit</button>
        <button class="btn danger" data-del="${p.id}" type="button">Delete</button>
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
      try {
        const res = await fetch("/api/admin-project", {
          method: "DELETE",
          headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
          body: JSON.stringify({ id }),
        });

        const json = await safeJson(res);
        if (!res.ok || !json.ok) {
          setStatus("Delete failed: " + (json.error || "unknown"));
          return;
        }

        setStatus("Deleted ✅");
        fetchProjects();
      } catch (e) {
        console.error(e);
        setStatus("Delete failed: " + e.message);
      }
    });
  });
}

document.getElementById("saveProjectBtn")?.addEventListener("click", async () => {
  const adminKey = getAdminKey();
  if (!adminKey) return alert("Please login first.");

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

  try {
    const res = await fetch("/api/admin-project", {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
      body: JSON.stringify(payload),
    });

    const json = await safeJson(res);
    if (!res.ok || !json.ok) {
      setStatus("Save failed: " + (json.error || "unknown"));
      return;
    }

    setStatus(editingId ? "Updated ✅" : "Saved ✅");
    resetForm();
    fetchProjects();
  } catch (e) {
    console.error(e);
    setStatus("Save failed: " + e.message);
  }
});

cancelEditBtn?.addEventListener("click", () => {
  resetForm();
});

// LOGIN
loginBtn?.addEventListener("click", async () => {
  const key = (adminKeyInput?.value || "").trim();
  if (!key) return setLoginStatus("Enter ADMIN_API_KEY.");

  setLoginStatus("Checking...");

  try {
    const res = await fetch("/api/admin-project", {
      headers: { "x-admin-key": key },
      cache: "no-store",
    });

    const json = await safeJson(res);
    if (!res.ok || !json.ok) {
      clearAdminKey();
      setLoginStatus("Login failed: " + (json.error || `HTTP ${res.status}`));
      showLogin();
      return;
    }

    setAdminKey(key);
    setLoginStatus("");
    showManager();
    fetchProjects();
  } catch (e) {
    console.error(e);
    clearAdminKey();
    setLoginStatus("Login failed: " + e.message);
    showLogin();
  }
});

// LOGOUT
logoutBtn?.addEventListener("click", () => {
  clearAdminKey();
  showLogin();
  setLoginStatus("Logged out ✅");
  if (adminKeyInput) adminKeyInput.value = "";
});

// On load
window.addEventListener("DOMContentLoaded", () => {
  if (getAdminKey()) {
    showManager();
    fetchProjects();
  } else {
    showLogin();
  }
});
