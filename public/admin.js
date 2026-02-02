import { supabase } from "./supabaseClient.js";

export async function uploadProjectImage(file) {
  const ext = file.name.split(".").pop();
  const fileName = crypto.randomUUID() + "." + ext;
  const filePath = `covers/${fileName}`;

  const { error } = await supabase.storage
    .from("project-images")
    .upload(filePath, file, { upsert: false });

  if (error) throw error;

  const { data } = supabase.storage
    .from("project-images")
    .getPublicUrl(filePath);

  return data.publicUrl;
}

async function submitProject() {
  const file = document.querySelector("#coverFile").files[0];
  const title = document.querySelector("#title").value;

  const coverUrl = await uploadProjectImage(file);

  const { error } = await supabase.from("projects").insert({
    title,
    category: "uiux",
    cover_image_url: coverUrl
  });

  if (error) alert(error.message);
  else alert("Project saved ✅");
}

window.submitProject = submitProject;
