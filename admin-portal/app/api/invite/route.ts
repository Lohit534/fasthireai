import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase";
import { isAdminEmail } from "@/lib/auth";

export const runtime = "nodejs";

async function verifyAdmin(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.replace("Bearer ", "").trim();
  const adminClient = getAdminClient();
  const { data } = await adminClient.auth.getUser(token);
  if (!data?.user || !isAdminEmail(data.user.email)) return null;
  return data.user;
}

export async function POST(request: NextRequest) {
  const admin_user = await verifyAdmin(request);
  if (!admin_user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { email, name, planId = "free" } = await request.json();
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email address is required" }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanName = (name || "").trim();
    const adminClient = getAdminClient() as any;

    const appUrl = (
      process.env.USER_APP_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "https://fasthire-ai.vercel.app"
    ).replace(/\/$/, "");
    const redirectUrl = `${appUrl}/auth/confirm?next=/dashboard`;

    let emailSent = false;
    let actionLink: string | null = null;
    let userId: string | null = null;
    let isExisting = false;

    // 1. Check if user already exists in Supabase Auth
    try {
      const { data: userListData } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const found = userListData?.users?.find(
        (u: any) => u.email?.toLowerCase().trim() === cleanEmail
      );
      if (found) {
        isExisting = true;
        userId = found.id;
      }
    } catch (e) {
      console.warn("Could not list users to check existence:", e);
    }

    if (isExisting && userId) {
      // User exists: update user metadata & generate a direct login/magic link
      try {
        await adminClient.auth.admin.updateUserById(userId, {
          user_metadata: { name: cleanName || undefined, plan: planId },
        });
      } catch (err) {
        console.warn("updateUserById error:", err);
      }

      try {
        const magicRes = await adminClient.auth.admin.generateLink({
          type: "magiclink",
          email: cleanEmail,
          options: { redirectTo: redirectUrl },
        });
        if (magicRes.data?.properties?.action_link) {
          actionLink = magicRes.data.properties.action_link;
        }
      } catch (err) {
        console.warn("Magiclink generation error for existing user:", err);
      }
    } else {
      // New user: attempt standard invitation email
      try {
        const inviteRes = await adminClient.auth.admin.inviteUserByEmail(cleanEmail, {
          redirectTo: redirectUrl,
          data: { name: cleanName, plan: planId },
        });

        if (!inviteRes.error && inviteRes.data?.user) {
          emailSent = true;
          userId = inviteRes.data.user.id;
        }
      } catch (err) {
        console.warn("inviteUserByEmail error:", err);
      }

      // If invite email could not be sent or user was not created, create user directly
      if (!userId) {
        try {
          const createRes = await adminClient.auth.admin.createUser({
            email: cleanEmail,
            email_confirm: true,
            user_metadata: { name: cleanName, plan: planId },
          });
          if (createRes.data?.user) {
            userId = createRes.data.user.id;
          }
        } catch (err) {
          console.warn("createUser fallback error:", err);
        }
      }

      // Generate direct activation link
      try {
        const linkRes = await adminClient.auth.admin.generateLink({
          type: emailSent ? "invite" : "magiclink",
          email: cleanEmail,
          options: {
            redirectTo: redirectUrl,
            data: { name: cleanName, plan: planId },
          },
        });
        if (linkRes.data?.properties?.action_link) {
          actionLink = linkRes.data.properties.action_link;
        }
      } catch (err) {
        console.warn("generateLink fallback error:", err);
      }
    }

    // 2. Sync to public.User table
    if (userId) {
      try {
        await adminClient.from("User").upsert(
          {
            id: userId,
            email: cleanEmail,
            name: cleanName || null,
            updatedAt: new Date().toISOString(),
          },
          { onConflict: "id" }
        );
      } catch (err) {
        console.warn("User table upsert warning:", err);
      }

      // 3. Provision Plan & Credits in public.Credit table
      try {
        let paidCredits = 0;
        let expiresAt: string | null = null;
        const now = new Date();

        if (planId === "premium") {
          paidCredits = 15;
          expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
        } else if (planId === "promax") {
          paidCredits = 999999;
          expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
        }

        await adminClient.from("Credit").upsert(
          {
            userId: userId,
            planId: planId,
            paidCredits: paidCredits,
            billingCycle: "monthly",
            expiresAt: expiresAt,
            updatedAt: now.toISOString(),
          },
          { onConflict: "userId" }
        );
      } catch (err) {
        console.warn("Credit table upsert warning:", err);
      }
    }

    const planLabel = planId === "promax" ? "Pro Max" : planId === "premium" ? "Pro" : "Free";
    let message = "";
    if (emailSent) {
      message = `Invitation email successfully dispatched to ${cleanEmail} with ${planLabel} plan!`;
    } else if (isExisting) {
      message = `Existing user upgraded to ${planLabel}! Direct login link generated below.`;
    } else {
      message = `Account created with ${planLabel} plan! Direct activation link is ready below to copy or share.`;
    }

    return NextResponse.json({
      success: true,
      emailSent,
      inviteLink: actionLink,
      userId,
      isExistingUser: isExisting,
      message,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to process invitation" }, { status: 500 });
  }
}
