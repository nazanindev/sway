import { NextResponse } from "next/server";
import { isValidUrl } from "@/lib/validate-url";
import { rateLimit, getIp } from "@/lib/rate-limit";

// Extract a named attribute value from a single <meta ...> tag string.
function attr(tag: string, name: string): string | null {
  const re = new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|(\\S+))`, "i");
  const m = re.exec(tag);
  if (!m) return null;
  return (m[1] ?? m[2] ?? m[3] ?? "").trim() || null;
}

// Walk every <meta> tag in the HTML and return the first content matching any of the given names.
function getMeta(html: string, ...names: string[]): string | null {
  const tagRe = /<meta\s[^>]*>/gi;
  const tags: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(html)) !== null) tags.push(m[0]);

  for (const name of names) {
    for (const tag of tags) {
      const prop = attr(tag, "property") ?? attr(tag, "name");
      if (prop?.toLowerCase() === name.toLowerCase()) {
        const content = attr(tag, "content");
        if (content) return content;
      }
    }
  }
  return null;
}

const PRIVATE_IP_RE =
  /^(127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.|::1$|fc|fd)/i;

function isPrivateHostname(hostname: string): boolean {
  return PRIVATE_IP_RE.test(hostname) || hostname === "localhost";
}

export async function GET(req: Request) {
  const ip = getIp(req);
  if (!rateLimit(`og-preview:${ip}`, 30, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url") ?? "";

  if (!url || !isValidUrl(url)) {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  try {
    const { hostname } = new URL(url);
    if (isPrivateHostname(hostname)) {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Swaybot/1.0; +https://sway.app)",
        "Accept": "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(6000),
      redirect: "follow",
    });

    if (!res.ok) return NextResponse.json({ image: null, title: null, description: null });

    const contentLength = Number(res.headers.get("content-length") ?? 0);
    if (contentLength > 1_000_000) {
      return NextResponse.json({ image: null, title: null, description: null });
    }

    // Only read the <head> — avoids parsing megabytes of HTML for large pages.
    const text = await res.text();
    const head = text.slice(0, text.toLowerCase().indexOf("</head>") + 7) || text.slice(0, 8000);

    const image = getMeta(head, "og:image", "twitter:image");
    const title = getMeta(head, "og:title", "twitter:title");
    const description = getMeta(head, "og:description", "twitter:description");

    return NextResponse.json({ image, title, description });
  } catch {
    return NextResponse.json({ image: null, title: null, description: null });
  }
}
