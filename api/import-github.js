const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = async (req, res) => {
  return res.status(200).json({ ok: true, message: "API works ✅" });
};

    if (!ghRes.ok) {
      return res.status(400).json({ error: "GitHub repo not found" });
    }

    const repo = await ghRes.json();

    // 2) Save to Supabase
    const { data, error } = await supabase
      .from("projects")
      .upsert(
        {
          repo_full_name: repo.full_name,
          repo_url: repo.html_url,
          default_branch: repo.default_branch,
          stars_count: repo.stargazers_count,
          forks_count: repo.forks_count,
          language: repo.language,

          title,
          description: repo.description,
          category: category || "uiux",
          tags: tags || [],
          live_url: liveUrl || null,
          cover_image_url: coverImageUrl || null,

          github_json: repo,
        },
        { onConflict: "repo_full_name" }
      )
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    return res.status(200).json({ ok: true, project: data });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
