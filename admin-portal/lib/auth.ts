import { NextRequest } from "next/server";
import { getAdminClient } from "@/lib/supabase";

export function isAdminEmail(email?: string): boolean {
  if (!email) return false;
  const rawAdmin = process.env.NEXT_PUBLIC_ADMIN_EMAIL || process.env.ADMIN_EMAIL || process.env.OWNER_EMAIL || "lohithpeyyala@gmail.com";
  const allowed = rawAdmin.split(",").map(e => e.toLowerCase().trim()).filter(Boolean);
  if (!allowed.includes("lohithpeyyala@gmail.com")) {
    allowed.push("lohithpeyyala@gmail.com");
  }
  return allowed.includes(email.toLowerCase().trim());
}

export async function verifyAdmin(request: NextRequest): Promise<{ user: any; token: string } | null> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) return null;

  try {
    const adminClient = getAdminClient(token);
    const { data, error } = await adminClient.auth.getUser(token);
    if (!error && data?.user && isAdminEmail(data.user.email)) {
      return { user: data.user, token };
    }
  } catch {
    return null;
  }

  return null;
}

