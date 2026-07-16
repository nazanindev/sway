// Upload an image file to Supabase Storage via the /api/upload endpoint.
// Returns the public URL to store in option.image_url.
export async function uploadImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Upload failed");
  return data.url as string;
}
