const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "project-images";

function requireAdmin(req, res) {
  const key = req.headers["x-admin-key"];
  if (!process.env.ADMIN_API_KEY) {
    res.status(500).json({ ok: false, error: "Missing ADMIN_API_KEY in Vercel env vars" });
    return true;
  }
  if (!key || key !== process.env.ADMIN_API_KEY) {
    res.status(401).json({ ok: false, error: "Unauthorized" });
    return true;
  }
  return false;
}

function safeJson(body) {
  if (!body) return {};
  if (typeof body === "object") return body;
  try { return JSON.parse(body); } catch { return {}; }
}

function safeFileName(name) {
  return String(name || "image.png").replace(/[^\w.\-]+/g, "_").slice(0, 80);
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");

  try {
    if (requireAdmin(req, res)) return;

    // LIST
    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("projects")
        .select("id,title,description,category,tags,cover_image_url,repo_url,live_url,featured,sort_order,created_at")
        .order("featured", { ascending: false })
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });

      if (error) return res.status(500).json({ ok: false, error: error.message });
      return res.status(200).json({ ok: true, projects: data || [] });
    }

    const body = safeJson(req.body);

    // DELETE
    if (req.method === "DELETE") {
      const id = body.id || req.query?.id;
      if (!id) return res.status(400).json({ ok: false, error: "Missing id" });

      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) return res.status(500).json({ ok: false, error: error.message });

      return res.status(200).json({ ok: true });
    }

    // CREATE / UPDATE (POST/PUT)
    if (req.method === "POST" || req.method === "PUT") {
      const {
        id,
        title,
        description,
        category,
        tags,
        live_url,
        repo_url,
        featured,
        sort_order,
        cover_image_url,
        image_base64,
        image_mime,
        image_filename
      } = body;

      const cleanTitle = String(title || "").trim();
      if (!cleanTitle) return res.status(400).json({ ok: false, error: "Title is required" });

      const payload = {
        title: cleanTitle,
        description: String(description || "").trim(),
        category: String(category || "other").toLowerCase().trim(),
        tags: Array.isArray(tags)
          ? tags.map(t => String(t).trim()).filter(Boolean)
          : String(tags || "").split(",").map(t => t.trim()).filter(Boolean),
        live_url: live_url ? String(live_url).trim() : null,
        repo_url: repo_url ? String(repo_url).trim() : null,
        featured: !!featured,
        sort_order: Number(sort_order || 0),
        cover_image_url: cover_image_url ? String(cover_image_url).trim() : null,
      };

      // Upload if provided
      if (image_base64 && image_mime) {
        const mime = String(image_mime);
        const ext =
          mime.includes("png") ? "png" :
          mime.includes("jpeg") ? "jpg" :
          mime.includes("webp") ? "webp" : "png";

        const filename = safeFileName(image_filename || `cover.${ext}`);
        const path = `projects/${Date.now()}-${filename}`;
        const buffer = Buffer.from(String(image_base64), "base64");

        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(path, buffer, { contentType: mime, upsert: false });

        if (upErr) return res.status(500).json({ ok: false, error: "Upload failed: " + upErr.message });

        const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
        payload.cover_image_url = pub.publicUrl;
      }

      // UPDATE
      if (req.method === "PUT") {
        if (!id) return res.status(400).json({ ok: false, error: "Missing id for update" });

        const { data, error } = await supabase
          .from("projects")
          .update(payload)
          .eq("id", id)
          .select()
          .single();

        if (error) return res.status(500).json({ ok: false, error: error.message });
        return res.status(200).json({ ok: true, project: data });
      }

      // CREATE
      const { data, error } = await supabase
        .from("projects")
        .insert(payload)
        .select()
        .single();

      if (error) return res.status(500).json({ ok: false, error: error.message });
      return res.status(200).json({ ok: true, project: data });
    }

    return res.status(405).json({ ok: false, error: "Unsupported method" });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
};
