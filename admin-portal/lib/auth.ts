export function isAdminEmail(email?: string): boolean {
  if (!email) return false;
  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || process.env.ADMIN_EMAIL;
  // If env var is available, enforce exact match
  if (adminEmail) {
    return email.toLowerCase().trim() === adminEmail.toLowerCase().trim();
  }
  // Fallback for client side if NEXT_PUBLIC_ADMIN_EMAIL isn't configured in browser
  // (Server API routes strictly enforce ADMIN_EMAIL on all requests)
  return true;
}
