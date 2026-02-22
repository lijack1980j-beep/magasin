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

function safeName(name) {
  return String(name || "file.png").replace(/[^\w.\-]+/g, "_").slice(0, 80);
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  try {
    if (requireAdmin(req, res)) return;
    if (req.method !== "POST") return res.status(405).json({ ok: false, error: "POST only" });

    const body = safeJson(req.body);
    const filename = safeName(body.filename);
    const path = `projects/${Date.now()}-${filename}`;

    const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path);
    if (error) return res.status(500).json({ ok: false, error: error.message });

    // bucket is public -> public URL works
    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);

    return res.status(200).json({
      ok: true,
      path,
      token: data.token,
      signedUrl: data.signedUrl,
      publicUrl: pub.publicUrl
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
};
