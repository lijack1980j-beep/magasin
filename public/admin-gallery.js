const statusEl = document.getElementById("adminStatus");

function setStatus(msg) {
  if (statusEl) statusEl.textContent = msg || "";
}

async function fileToBase64(file) {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

document.getElementById("saveProjectBtn")?.addEventListener("click", async () => {
  const adminKey = document.getElementById("adminKey")?.value.trim();
  if (!adminKey) return alert("Enter Admin API Key first.");

  const title = document.getElementById("pTitle")?.value.trim();
  const category = document.getElementById("pCategory")?.value || "other";
  const description = document.getElementById("pDescription")?.value.trim() || "";
  const tags = document.getElementById("pTags")?.value || "";
  const live_url = document.getElementById("pLive")?.value.trim() || "";
  const repo_url = document.getElementById("pRepo")?.value.trim() || "";
  const featured = document.getElementById("pFeatured")?.checked || false;
  const sort_order = Number(document.getElementById("pSort")?.value || 0);
  const cover_image_url = document.getElementById("pImageUrl")?.value.trim() || null;
  const file = document.getElementById("pFile")?.files?.[0];

  if (!title) return alert("Title is required.");

  const payload = {
    title,
    category,
    description,
    tags, // comma string OK (API will split)
    live_url: live_url || null,
    repo_url: repo_url || null,
    featured,
    sort_order,
    cover_image_url,
  };

  if (file) {
    if (file.size > 4 * 1024 * 1024) return alert("Image too big (max ~4MB).");
    setStatus("Reading image...");
    payload.image_base64 = await fileToBase64(file);
    payload.image_mime = file.type || "image/png";
    payload.image_filename = file.name || "cover.png";
  }

  setStatus("Saving...");
  const res = await fetch("/api/admin-project", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-key": adminKey,
    },
    body: JSON.stringify(payload),
  });

  const json = await res.json();
  if (!res.ok || !json.ok) {
    setStatus("");
    return alert("Save failed: " + (json.error || "unknown"));
  }

  setStatus("Saved ✅");

  // Open gallery filtered to this category (so you SEE it immediately)
  window.location.href = `/gallery.html?cat=${encodeURIComponent(category)}`;
});
