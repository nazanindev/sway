import { NextResponse } from "next/server";
import { isValidUrl } from "@/lib/validate-url";
import { rateLimit, getIp } from "@/lib/rate-limit";

export async function GET(req: Request) {
  const ip = getIp(req);
  if (!rateLimit(`og-preview:${ip}`, 30, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url") ?? "";

  if (!isValidUrl(url)) {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Swaybot/1.0 (link preview)" },
      signal: AbortSignal.timeout(5000),
    });
    const html = await res.text();

    // Match both attribute orderings: property/name before content, and content before property/name
    const getOgTag = (name: string): string | null => {
      const a = html.match(
        new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]+content=["']([^"'<>]+)["']`, "i")
      );
      const b = html.match(
        new RegExp(`<meta[^>]+content=["']([^"'<>]+)["'][^>]+(?:property|name)=["']${name}["']`, "i")
      );
      return (a?.[1] ?? b?.[1])?.trim() ?? null;
    };

    const image = getOgTag("og:image") ?? getOgTag("twitter:image");
    const title = getOgTag("og:title") ?? getOgTag("twitter:title");
    const description = getOgTag("og:description") ?? getOgTag("twitter:description");

    return NextResponse.json({ image, title, description });
  } catch {
    return NextResponse.json({ image: null, title: null, description: null });
  }
}
