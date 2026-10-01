export function isAdminEmail(email?: string): boolean {
  if (!email) return false;
  const rawAdmin = process.env.NEXT_PUBLIC_ADMIN_EMAIL || process.env.ADMIN_EMAIL || process.env.OWNER_EMAIL || "lohithpeyyala@gmail.com";
  const allowed = rawAdmin.split(",").map(e => e.toLowerCase().trim()).filter(Boolean);
  if (!allowed.includes("lohithpeyyala@gmail.com")) {
    allowed.push("lohithpeyyala@gmail.com");
  }
  return allowed.includes(email.toLowerCase().trim());
}
