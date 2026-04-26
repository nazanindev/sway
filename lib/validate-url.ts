const ALLOWED_PROTOCOLS = ["https:", "http:"];

export function isValidUrl(raw: string | null | undefined): boolean {
  if (!raw) return true; // null/undefined = optional field, fine
  try {
    const url = new URL(raw);
    return ALLOWED_PROTOCOLS.includes(url.protocol);
  } catch {
    return false;
  }
}
