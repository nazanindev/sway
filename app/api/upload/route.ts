import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getServiceClient } from "@/lib/supabase/server";
import { rateLimit, getIp } from "@/lib/rate-limit";

const BUCKET = "option-images";
const MAX_BYTES = 8 * 1024 * 1024; // 8MB — big enough for phone photos

// content-type -> file extension
const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/pjpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/heic": "heic",
  "image/heif": "heif",
  "image/avif": "avif",
};

type Db = ReturnType<typeof getServiceClient>;

// Create the public bucket on first use so a fresh deploy self-heals with no
// manual dashboard step. Cached per process; a failure resets the cache to retry.
let bucketReady: Promise<void> | null = null;
function ensureBucket(db: Db): Promise<void> {
  if (!bucketReady) {
    bucketReady = (async () => {
      // Prefer detecting an existing bucket — createBucket needs elevated
      // privileges that getBucket/upload do not.
      const { data: existing } = await db.storage.getBucket(BUCKET);
      if (existing) return;
      const { error } = await db.storage.createBucket(BUCKET, {
        public: true,
        fileSizeLimit: MAX_BYTES,
      });
      if (error && !/exist/i.test(error.message)) throw error;
    })().catch((e) => {
      bucketReady = null;
      throw e;
    });
  }
  return bucketReady;
}

export async function POST(req: Request) {
  const ip = getIp(req);
  if (!(await rateLimit(`upload:${ip}`, 20, 60_000))) {
    return NextResponse.json({ error: "Too many uploads. Slow down." }, { status: 429 });
  }

  let file: File | null = null;
  try {
    const form = await req.formData();
    const f = form.get("file");
    if (f instanceof File) file = f;
  } catch {
    return NextResponse.json({ error: "Invalid upload" }, { status: 400 });
  }

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  const ext = EXT[file.type];
  if (!ext) {
    return NextResponse.json({ error: "Unsupported image type" }, { status: 400 });
  }
  if (file.size === 0 || file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image must be under 8MB" }, { status: 400 });
  }

  const db = getServiceClient();

  try {
    await ensureBucket(db);
  } catch (e) {
    console.error("[upload] ensureBucket error:", e);
    return NextResponse.json({ error: "Storage unavailable", detail: String((e as Error)?.message ?? e) }, { status: 500 });
  }

  const path = `${randomUUID()}.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error } = await db.storage.from(BUCKET).upload(path, bytes, {
    contentType: file.type,
    upsert: false,
  });

  if (error) {
    console.error("[upload] upload error:", error);
    return NextResponse.json({ error: "Upload failed", detail: error.message }, { status: 500 });
  }

  const { data } = db.storage.from(BUCKET).getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl });
}
