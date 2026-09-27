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

    const appUrl = (process.env.USER_APP_URL || process.env.NEXT_PUBLIC_APP_URL || "https://fasthireai.com").replace(/\/$/, "");
    const redirectUrl = `${appUrl}/auth/confirm?next=/dashboard`;

    let emailSent = false;
    let actionLink: string | null = null;
    let userId: string | null = null;

    // 1. Try sending the invitation email through Supabase mailer
    try {
      const inviteRes = await adminClient.auth.admin.inviteUserByEmail(cleanEmail, {
        redirectTo: redirectUrl,
        data: { name: cleanName, plan: planId },
      });

      if (inviteRes.error) {
        throw inviteRes.error;
      }
      emailSent = true;
      userId = inviteRes.data?.user?.id || null;
    } catch {
      // 2. Fallback: Generate the invite link directly (bypasses Supabase's SMTP/rate limits)
      try {
        const linkRes = await adminClient.auth.admin.generateLink({
          type: "invite",
          email: cleanEmail,
          options: {
            redirectTo: redirectUrl,
            data: { name: cleanName, plan: planId },
          },
        });

        if (linkRes.error) {
          // If user exists, generate magic link instead
          const magicRes = await adminClient.auth.admin.generateLink({
            type: "magiclink",
            email: cleanEmail,
            options: { redirectTo: redirectUrl },
          });
          if (magicRes.data?.properties?.action_link) {
            actionLink = magicRes.data.properties.action_link;
            userId = magicRes.data?.user?.id || null;
          } else {
            throw linkRes.error;
          }
        } else {
          actionLink = linkRes.data?.properties?.action_link || null;
          userId = linkRes.data?.user?.id || null;
        }
      } catch {
        // If all else fails, create user directly and generate login link
        const createRes = await adminClient.auth.admin.createUser({
          email: cleanEmail,
          email_confirm: true,
          user_metadata: { name: cleanName, plan: planId },
        });

        if (createRes.data?.user) {
          userId = createRes.data.user.id;
          const magicRes = await adminClient.auth.admin.generateLink({
            type: "magiclink",
            email: cleanEmail,
            options: { redirectTo: redirectUrl },
          });
          actionLink = magicRes.data?.properties?.action_link || null;
        }
      }
    }

    // Also get action link if emailSent was true but admin wants a copy
    if (emailSent && !actionLink) {
      try {
        const linkRes = await adminClient.auth.admin.generateLink({
          type: "invite",
          email: cleanEmail,
          options: { redirectTo: redirectUrl },
        });
        if (linkRes.data?.properties?.action_link) {
          actionLink = linkRes.data.properties.action_link;
        }
      } catch {
        // ignore
      }
    }

    // 3. Upsert user in public.User
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
      } catch {
        // ignore table sync error
      }

      // 4. Provision Plan & Credits in public.Credit
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
      } catch {
        // ignore credit sync error
      }
    }

    return NextResponse.json({
      success: true,
      emailSent,
      inviteLink: actionLink,
      userId,
      message: emailSent
        ? `Invitation email successfully dispatched to ${cleanEmail}!`
        : `User account created! A direct invitation link was generated below.`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to invite user" }, { status: 500 });
  }
}
