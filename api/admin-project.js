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
    res.status(401).json({ ok: false, error: "Unauthorized (wrong ADMIN_API_KEY)" });
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

    // LIST (optional)
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

    // CREATE
    if (req.method === "POST") {
      const body = safeJson(req.body);

      const title = String(body.title || "").trim();
      if (!title) return res.status(400).json({ ok: false, error: "title is required" });

      const category = String(body.category || "other").toLowerCase().trim();
      const description = String(body.description || "").trim();
      const live_url = body.live_url ? String(body.live_url).trim() : null;
      const repo_url = body.repo_url ? String(body.repo_url).trim() : null;
      const featured = !!body.featured;
      const sort_order = Number(body.sort_order || 0);

      const tags = Array.isArray(body.tags)
        ? body.tags.map(t => String(t).trim()).filter(Boolean)
        : String(body.tags || "")
            .split(",")
            .map(t => t.trim())
            .filter(Boolean);

      // image: either URL or upload base64
      let cover_image_url = body.cover_image_url ? String(body.cover_image_url).trim() : null;

      if (body.image_base64 && body.image_mime) {
        const mime = String(body.image_mime);
        const ext =
          mime.includes("png") ? "png" :
          mime.includes("jpeg") ? "jpg" :
          mime.includes("webp") ? "webp" : "png";

        const filename = safeFileName(body.image_filename || `cover.${ext}`);
        const path = `projects/${Date.now()}-${filename}`;
        const buffer = Buffer.from(String(body.image_base64), "base64");

        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(path, buffer, { contentType: mime, upsert: false });

        if (upErr) return res.status(500).json({ ok: false, error: "Upload failed: " + upErr.message });

        const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
        cover_image_url = pub.publicUrl;
      }

      const { data, error } = await supabase
        .from("projects")
        .insert({
          title,
          description,
          category,
          tags,
          live_url,
          repo_url,
          featured,
          sort_order,
          cover_image_url,
        })
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
