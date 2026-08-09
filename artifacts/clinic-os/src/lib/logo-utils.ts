/**
 * Resolves a stored logo value to a URL suitable for <img src>.
 *
 * - Object paths (e.g. "/objects/uploads/uuid") → "/api/storage/objects/uploads/uuid"
 * - Data URLs (base64)                           → returned as-is (legacy support)
 * - null / undefined                             → fallback
 */
export function getLogoSrc(
  logoDataUrl: string | null | undefined,
  fallback: string,
): string {
  if (!logoDataUrl) return fallback;
  if (logoDataUrl.startsWith("/objects/")) {
    return `/api/storage${logoDataUrl}`;
  }
  return logoDataUrl;
}

/**
 * Resolves a stored logo value to a base64 data URL for PDF generation.
 *
 * - Object paths → fetched from the storage API and converted to base64
 * - Data URLs    → returned as-is
 * - null         → null
 */
export async function resolveLogoDataUrl(
  logoDataUrl: string | null | undefined,
): Promise<string | null> {
  if (!logoDataUrl) return null;
  if (logoDataUrl.startsWith("/objects/")) {
    try {
      const res = await fetch(`/api/storage${logoDataUrl}`);
      if (!res.ok) return null;
      const blob = await res.blob();
      return new Promise<string | null>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  }
  return logoDataUrl;
}
