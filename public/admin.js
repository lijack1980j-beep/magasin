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
