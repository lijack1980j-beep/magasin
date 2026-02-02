import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  try {
    const { repoFullName, title, category, tags, liveUrl, coverImageUrl } = req.body;

    // 1) Fetch from GitHub
    const ghRes = await fetch(`https://api.github.com/repos/${repoFullName}`, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: process.env.GITHUB_TOKEN
          ? `Bearer ${process.env.GITHUB_TOKEN}`
          : undefined,
      },
    });

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
