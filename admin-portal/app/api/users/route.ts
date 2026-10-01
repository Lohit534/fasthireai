import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase";
import { isAdminEmail } from "@/lib/auth";

export const runtime = "nodejs";

function parseJwtPayload(token: string): any {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const jsonStr = Buffer.from(base64, "base64").toString("utf-8");
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

async function verifyAdmin(request: NextRequest): Promise<{ user: any; token: string } | null> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) return null;

  try {
    const adminClient = getAdminClient(token);
    const { data } = await adminClient.auth.getUser(token);
    if (data?.user && isAdminEmail(data.user.email)) {
      return { user: data.user, token };
    }
  } catch {
    // Continue to JWT fallback
  }

  const payload = parseJwtPayload(token);
  if (payload?.email && isAdminEmail(payload.email)) {
    const isExpired = payload.exp && payload.exp * 1000 < Date.now();
    if (!isExpired) {
      return {
        user: {
          id: payload.sub || "admin-user",
          email: payload.email,
          user_metadata: payload.user_metadata || {},
          role: payload.role || "authenticated",
        },
        token,
      };
    }
  }

  return null;
}

// GET /api/users — list all users with synchronized plan status and accurate pricing credits
export async function GET(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const adminClient = getAdminClient(auth.token) as any;
    const now = new Date();

    // 1. Fetch all registered users
    let users: any[] = [];
    const { data: dbUsers, error: usersErr } = await adminClient
      .from("User")
      .select("id, email, name, createdAt")
      .order("createdAt", { ascending: false });

    if (!usersErr && Array.isArray(dbUsers)) {
      users = [...dbUsers];
    }

    // 2. Fetch all credit records from "Credit" table
    let credits: any[] = [];
    const { data: dbCredits, error: creditsErr } = await adminClient
      .from("Credit")
      .select("*");

    if (!creditsErr && Array.isArray(dbCredits)) {
      credits = dbCredits;
    }

    // 3. Map credit records by userId
    const creditMap: Record<string, any> = {};
    for (const c of credits) {
      creditMap[c.userId] = c;
    }

    // 4. Ensure owner (lohithpeyyala@gmail.com) is in users list
    const hasOwner = users.some(u => (u.email || "").toLowerCase().trim() === "lohithpeyyala@gmail.com");
    if (!hasOwner) {
      users.unshift({
        id: auth.user.id || "owner-lohit",
        email: "lohithpeyyala@gmail.com",
        name: "Lohith (Owner)",
        createdAt: "2026-08-01T00:00:00.000Z",
      });
    }

    // 5. Ensure payyalajyothika333@gmail.com is in users list if registered
    const hasJyothika = users.some(u => (u.email || "").toLowerCase().trim() === "payyalajyothika333@gmail.com");
    if (!hasJyothika) {
      users.push({
        id: "d9301154-778f-45d7-91e3-873c6d5be4aa",
        email: "payyalajyothika333@gmail.com",
        name: "Jyothika Payyala",
        createdAt: "2026-09-12T06:32:35.000Z",
      });
    }

    // 6. Merge user profiles with exact database credits and official pricing plans
    const enriched = users.map((u: any) => {
      const emailLower = (u.email || "").toLowerCase().trim();
      const cred = creditMap[u.id] || {};
      const rawPaidCredits = cred.paidCredits ?? 0;
      const freeUsed = cred.freeUsed ?? 0;
      const planId = (cred.planId || "").toLowerCase();
      const billingCycle = cred.billingCycle || "monthly";

      let isExpired = false;
      if (cred.expiresAt) {
        const exp = new Date(cred.expiresAt);
        if (now > exp) isExpired = true;
      }

      let plan: "owner" | "promax" | "premium" | "free" = "free";
      let displayPaidCredits = 0;

      if (isAdminEmail(u.email)) {
        plan = "owner";
        displayPaidCredits = 999999;
      } else if (emailLower === "payyalajyothika333@gmail.com" || billingCycle === "admin_promax" || (!isExpired && (rawPaidCredits >= 90 || planId === "promax"))) {
        plan = "promax";
        displayPaidCredits = rawPaidCredits >= 90 ? rawPaidCredits : 90;
      } else if (billingCycle === "admin_premium" || (!isExpired && (rawPaidCredits > 0 || planId === "premium" || billingCycle === "yearly"))) {
        plan = "premium";
        displayPaidCredits = rawPaidCredits > 0 ? rawPaidCredits : 20;
      } else {
        plan = "free";
        displayPaidCredits = 0;
      }

      return {
        ...u,
        plan,
        paidCredits: displayPaidCredits,
        freeUsed,
        billingCycle,
        expiresAt: cred.expiresAt || null,
      };
    });

    // 7. Fetch platform analytics
    let totalOptimizations = 0;
    let totalTickets = 0;

    try {
      const { count: optCount } = await adminClient
        .from("Resume")
        .select("id", { count: "exact", head: true })
        .neq("jobTitle", "SUPPORT_TICKET");
      totalOptimizations = optCount || 0;
    } catch {}

    try {
      const { count: tickCount } = await adminClient
        .from("Resume")
        .select("id", { count: "exact", head: true })
        .eq("jobTitle", "SUPPORT_TICKET");
      totalTickets = tickCount || 0;
    } catch {}

    const analytics = {
      totalOptimizations,
      totalTickets,
    };

    return NextResponse.json({ users: enriched, analytics });
  } catch (e: any) {
    console.error("[users/GET] Error:", e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST /api/users — modify a user's plan and credits in Supabase "Credit" table
export async function POST(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { targetUserId, planId, customCredits } = await request.json();
    if (!targetUserId || !planId) {
      return NextResponse.json({ error: "targetUserId and planId are required" }, { status: 400 });
    }

    const adminClient = getAdminClient(auth.token) as any;
    const now = new Date();

    // Fetch target user email to verify owner protection
    let targetEmail = "";
    try {
      const { data: dbUser } = await adminClient
        .from("User")
        .select("email")
        .eq("id", targetUserId)
        .maybeSingle();
      targetEmail = dbUser?.email || "";
    } catch {}

    if (isAdminEmail(targetEmail)) {
      return NextResponse.json({ error: "Owner account cannot be modified." }, { status: 403 });
    }

    // Map plan to exact pricing credits and cycle tags
    let paidCredits = 0;
    let billingCycle = "monthly";
    let expiresAt: string | null = null;

    if (customCredits !== undefined && Number(customCredits) >= 0) {
      paidCredits = Number(customCredits);
      billingCycle = paidCredits >= 90 ? "admin_promax" : paidCredits > 0 ? "admin_premium" : "admin_free";
      expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
    } else if (planId === "free") {
      paidCredits = 0;
      billingCycle = "admin_free"; // Prevents frontend auto-upgrade
      expiresAt = null;
    } else if (planId === "premium") {
      paidCredits = 20; // Official Premium Pro monthly credit limit
      billingCycle = "admin_premium";
      expiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString();
    } else if (planId === "promax") {
      paidCredits = 90; // Official Pro Max monthly credit limit
      billingCycle = "admin_promax";
      expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
    }

    // Ensure target user exists in User table to satisfy foreign key constraint
    const { data: dbUser } = await adminClient
      .from("User")
      .select("id")
      .eq("id", targetUserId)
      .maybeSingle();

    if (!dbUser) {
      try {
        if (adminClient?.auth?.admin?.getUserById) {
          const { data: authUser } = await adminClient.auth.admin.getUserById(targetUserId);
          if (authUser?.user) {
            await adminClient.from("User").upsert({
              id: targetUserId,
              email: authUser.user.email,
              name: authUser.user.user_metadata?.full_name || authUser.user.email?.split("@")[0] || null,
              createdAt: authUser.user.created_at || now.toISOString(),
            }, { onConflict: "id" }).catch(() => {});
          }
        }
      } catch {}
    }

    const { data: existingCredit } = await adminClient
      .from("Credit")
      .select("id")
      .eq("userId", targetUserId)
      .maybeSingle();

    if (existingCredit?.id) {
      const { error } = await adminClient
        .from("Credit")
        .update({
          paidCredits: paidCredits,
          billingCycle: billingCycle,
          resetAt: now.toISOString(),
          expiresAt: expiresAt,
        })
        .eq("userId", targetUserId);
      if (error) throw error;
    } else {
      const newCreditId = "cred-" + targetUserId.slice(0, 12);
      const { error } = await adminClient
        .from("Credit")
        .insert({
          id: newCreditId,
          userId: targetUserId,
          freeUsed: 0,
          paidCredits: paidCredits,
          billingCycle: billingCycle,
          resetAt: now.toISOString(),
          expiresAt: expiresAt,
        });
      if (error) throw error;
    }

    // Also update Supabase auth user_metadata if available
    try {
      if (adminClient?.auth?.admin?.updateUserById) {
        await adminClient.auth.admin.updateUserById(targetUserId, {
          user_metadata: { plan: planId },
        });
      }
    } catch {}

    return NextResponse.json({ success: true, planId, paidCredits, billingCycle });
  } catch (e: any) {
    console.error("[users/POST] Error:", e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export const PATCH = POST;
