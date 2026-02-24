// public/admin-gallery.js
// Gallery Manager tab logic
// Requires /api/admin-project with GET/POST/PUT/DELETE protected by x-admin-key

(() => {
  let editingId = null;

  const statusEl = document.getElementById("adminStatus");
  const listEl = document.getElementById("projectsList");
  const adminKeyInput = document.getElementById("adminKey");
  const cancelEditBtn = document.getElementById("cancelEditBtn");
  const saveBtn = document.getElementById("saveProjectBtn");

  function showStatus(msg, isError = false) {
    if (!statusEl) return;
    statusEl.textContent = msg || "";
    if (!msg) statusEl.classList.add("hidden");
    else statusEl.classList.remove("hidden");

    statusEl.style.borderColor = isError
      ? "rgba(255,0,80,.45)"
      : "rgba(255,255,255,.12)";
  }

  const LOGIN_KEY = "GS_ADMIN_KEY";
  function getAdminKey() {
    const saved = sessionStorage.getItem(LOGIN_KEY);
    if (adminKeyInput && saved && !adminKeyInput.value) adminKeyInput.value = saved;

    const k = (adminKeyInput?.value || "").trim();
    if (k) sessionStorage.setItem(LOGIN_KEY, k);
    return k;
  }

  function esc(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;").replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;").replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
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
    if (saveBtn) saveBtn.textContent = "Save to Gallery";
    showStatus("");

    document.getElementById("pTitle").value = "";
    document.getElementById("pCategory").value = "other";
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
    const key = getAdminKey();
    if (!key) return showStatus("Enter Admin API Key first.", true);

    try {
      showStatus("Loading projects...");
      const res = await fetch("/api/admin-project", {
        headers: { "x-admin-key": key },
        cache: "no-store",
      });

      const ct = res.headers.get("content-type") || "";
      const text = await res.text();

      if (!ct.includes("application/json")) {
        return showStatus(`API returned HTTP ${res.status}: ${text.slice(0, 140)}`, true);
      }

      let json = null;
      try { json = JSON.parse(text); } catch {}

      if (!res.ok || !json?.ok) {
        return showStatus(`Load failed (HTTP ${res.status}): ${json?.error || "unknown"}`, true);
      }

      showStatus("");
      renderList(json.projects || []);
    } catch (e) {
      showStatus("Load failed: " + e.message, true);
      console.error(e);
    }
  }

  function renderList(items) {
    if (!listEl) return;

    if (!items.length) {
      listEl.innerHTML = `<div class="notice">No projects yet.</div>`;
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
          <button data-edit="${esc(p.id)}" class="btn" type="button">Edit</button>
          <button data-del="${esc(p.id)}" class="btn danger" type="button">Delete</button>
        </div>
      </div>
    `).join("");

    // ✅ Edit (FIX: compare as string)
    listEl.querySelectorAll("button[data-edit]").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-edit");
        const p = items.find(x => String(x.id) === String(id));
        if (!p) return;

        editingId = p.id;
        fillForm(p);
        if (saveBtn) saveBtn.textContent = "Update Project";
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    });

    // Delete
    listEl.querySelectorAll("button[data-del]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const key = getAdminKey();
        const id = btn.getAttribute("data-del");
        if (!id) return;
        if (!confirm("Delete this project?")) return;

        try {
          showStatus("Deleting...");
          const res = await fetch("/api/admin-project", {
            method: "DELETE",
            headers: { "Content-Type": "application/json", "x-admin-key": key },
            body: JSON.stringify({ id }),
          });

          const text = await res.text();
          let json = null;
          try { json = JSON.parse(text); } catch {}

          if (!res.ok || !json?.ok) {
            return showStatus(`Delete failed (HTTP ${res.status}): ${json?.error || text.slice(0,140) || "unknown"}`, true);
          }

          showStatus("Deleted ✅");
          fetchProjects();
        } catch (e) {
          showStatus("Delete failed: " + e.message, true);
        }
      });
    });
  }

  // Save / Update
  saveBtn?.addEventListener("click", async () => {
    const key = getAdminKey();
    if (!key) return alert("Enter Admin API Key first.");

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

    // ✅ Keep upload disabled to avoid Vercel 413
    if (f.file) {
      return alert("Upload disabled (Vercel 413). Please use 'OR image URL' instead.");
    }

    try {
      showStatus(editingId ? "Updating..." : "Saving...");

      const res = await fetch("/api/admin-project", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": key },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      let json = null;
      try { json = JSON.parse(text); } catch {}

      if (!res.ok || !json?.ok) {
        const msg = json?.error || text.slice(0, 180) || "unknown";
        return showStatus(`Save failed (HTTP ${res.status}): ${msg}`, true);
      }

      showStatus(editingId ? "Updated ✅" : "Saved ✅");
      resetForm();
      fetchProjects();
    } catch (e) {
      showStatus("Save failed: " + e.message, true);
    }
  });

  cancelEditBtn?.addEventListener("click", resetForm);

  // ✅ IMPORTANT: Load projects when Gallery tab opens AND when key changes
  adminKeyInput?.addEventListener("input", () => {
    // don’t spam requests every keystroke; only if key length looks like real
    if ((adminKeyInput.value || "").trim().length > 10) fetchProjects();
  });

  window.addEventListener("GS_OPEN_GALLERY_TAB", () => {
    // always try load when tab opens
    fetchProjects();
  });

  // ✅ Also load if user refreshes while on Gallery tab
  window.addEventListener("DOMContentLoaded", () => {
    // If adminKey exists in session, try to load immediately (safe)
    if (getAdminKey()) fetchProjects();
  });

  // expose for quick debug in console
  window.__GS_fetchGalleryProjects = fetchProjects;
})();
