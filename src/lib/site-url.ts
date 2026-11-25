/**
 * Zero-config production domain auto-detection for Vercel, custom domain, and local builds.
 */
export function getSiteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "https://skilldock-pi.vercel.app");
  return raw.replace(/\/$/, "");
}
