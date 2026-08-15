export function isAdminEmail(email?: string): boolean {
  if (!email) return false;
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) return false; // No admin email configured = no access
  return email.toLowerCase().trim() === adminEmail.toLowerCase().trim();
}
