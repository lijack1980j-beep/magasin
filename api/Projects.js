const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("projects")
      .select("id,title,description,category,tags,cover_image_url,repo_url,live_url,featured,sort_order,created_at")
      .order("featured", { ascending: false })
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) return res.status(500).json({ ok: false, error: error.message });

    return res.status(200).json({ ok: true, projects: data || [] });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
};
