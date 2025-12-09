export function normalizeBaseUrl(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.replace(/\/+$/, "");
}

/**
 * Returns the externally configured API base (if provided).
 * Kept in a tiny module so it can be reused from both server and client code.
 */
export function getConfiguredApiBase(): string | null {
  const fromEnv =
    process.env.NEXT_PUBLIC_CRM2_API_BASE || process.env.NEXT_PUBLIC_API_BASE;
  return normalizeBaseUrl(fromEnv);
}
