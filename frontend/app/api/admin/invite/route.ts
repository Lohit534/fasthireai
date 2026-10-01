import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { isOwnerEmail, PRO_CREDITS_PER_MONTH, PRO_MAX_CREDITS_PER_MONTH } from "@/types";

export const runtime = "nodejs";

function getBaseAppUrl(request: NextRequest, bodyOrigin?: string): string {
  // 1. Prefer client origin provided by the browser window if valid
  if (bodyOrigin && typeof bodyOrigin === "string" && bodyOrigin.startsWith("http")) {
    if (!bodyOrigin.includes("localhost") && !bodyOrigin.includes("127.0.0.1")) {
      return bodyOrigin.replace(/\/$/, "");
    }
  }

  // 2. Extract actual request origin from incoming reverse-proxy headers
  const origin = request.headers.get("origin");
  const proto = request.headers.get("x-forwarded-proto") || "https";
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const headerOrigin = origin || (host ? `${proto}://${host}` : "");

  if (headerOrigin && !headerOrigin.includes("localhost") && !headerOrigin.includes("127.0.0.1")) {
    return headerOrigin.replace(/\/$/, "");
  }

  // 3. Extract from Referer header if present
  const referer = request.headers.get("referer");
  if (referer) {
    try {
      const parsed = new URL(referer);
      if (!parsed.hostname.includes("localhost") && !parsed.hostname.includes("127.0.0.1")) {
        return parsed.origin.replace(/\/$/, "");
      }
    } catch {}
  }

  // 4. Check configured environment variables
  const userAppUrl = process.env.USER_APP_URL || process.env.NEXT_PUBLIC_APP_URL || "";
  if (userAppUrl && !userAppUrl.includes("localhost") && !userAppUrl.includes("127.0.0.1")) {
    return userAppUrl.replace(/\/$/, "");
  }

  // 5. Fallback if bodyOrigin or headerOrigin was provided
  if (bodyOrigin && bodyOrigin.startsWith("http")) {
    return bodyOrigin.replace(/\/$/, "");
  }
  if (headerOrigin) {
    return headerOrigin.replace(/\/$/, "");
  }

  return "https://fasthireai.com";
}

function sanitizeInviteLink(link: string | null, targetBaseUrl: string): string | null {
  if (!link) return null;
  const safeBase = (!targetBaseUrl || targetBaseUrl.includes("localhost") || targetBaseUrl.includes("127.0.0.1"))
    ? "https://fasthireai.com"
    : targetBaseUrl.replace(/\/$/, "");

  try {
    let sanitized = link;
    // Replace URL-encoded localhost redirect parameters
    sanitized = sanitized
      .replace(/redirect_to=http(?:s)?%3A%2F%2Flocalhost(?::\d+)?/gi, `redirect_to=${encodeURIComponent(safeBase)}`)
      .replace(/redirect_to=http(?:s)?%3A%2F%2F127\.0\.0\.1(?::\d+)?/gi, `redirect_to=${encodeURIComponent(safeBase)}`)
      .replace(/redirect_to=http(?:s)?:\/\/localhost(?::\d+)?/gi, `redirect_to=${safeBase}`)
      .replace(/redirect_to=http(?:s)?:\/\/127\.0\.0\.1(?::\d+)?/gi, `redirect_to=${safeBase}`);

    // Replace plain localhost base if present
    sanitized = sanitized
      .replace(/^https?:\/\/localhost(?::\d+)?/i, safeBase)
      .replace(/^https?:\/\/127\.0\.0\.1(?::\d+)?/i, safeBase);

    return sanitized;
  } catch {
    return link;
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isOwnerEmail(user.email)) {
      return NextResponse.json({ error: "Forbidden. Admin privileges required." }, { status: 403 });
    }

    const body = await request.json();
    const { email, name, planId = "free", origin: clientOrigin } = body;

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanName = (name || "").trim();
    const adminClient = getAdminClient() as any;

    const appUrl = getBaseAppUrl(request, clientOrigin);
    const redirectUrl = `${appUrl}/auth/confirm?next=/dashboard`;

    let emailSent = false;
    let actionLink: string | null = null;
    let userId: string | null = null;

    // 1. Attempt sending official invitation email via Supabase Auth
    try {
      if (adminClient?.auth?.admin?.inviteUserByEmail) {
        const inviteRes = await adminClient.auth.admin.inviteUserByEmail(cleanEmail, {
          redirectTo: redirectUrl,
          data: { name: cleanName, plan: planId },
        });

        if (!inviteRes.error) {
          emailSent = true;
          userId = inviteRes.data?.user?.id || null;
        }
      }
    } catch (e: any) {
      logger.warn("[admin/invite] inviteUserByEmail skipped/failed:", e?.message);
    }

    // 2. Generate direct action link (essential fallback to bypass SMTP limits and guarantee user gets a link)
    if (adminClient?.auth?.admin?.generateLink) {
      try {
        const linkRes = await adminClient.auth.admin.generateLink({
          type: "invite",
          email: cleanEmail,
          options: {
            redirectTo: redirectUrl,
            data: { name: cleanName, plan: planId },
          },
        });

        if (linkRes.data?.properties?.action_link) {
          actionLink = linkRes.data.properties.action_link;
          userId = userId || linkRes.data?.user?.id || null;
        } else if (linkRes.error) {
          // If user account already exists, generate magic link instead
          const magicRes = await adminClient.auth.admin.generateLink({
            type: "magiclink",
            email: cleanEmail,
            options: { redirectTo: redirectUrl },
          });
          if (magicRes.data?.properties?.action_link) {
            actionLink = magicRes.data.properties.action_link;
            userId = userId || magicRes.data?.user?.id || null;
          }
        }
      } catch (linkErr: any) {
        logger.warn("[admin/invite] generateLink fallback check:", linkErr?.message);
      }
    }

    // 3. Fallback: If link was not generated, construct direct invite login URL
    if (!actionLink) {
      actionLink = `${redirectUrl}&email=${encodeURIComponent(cleanEmail)}`;
    }

    // Sanitize link to ensure no localhost domain leaks into email or link
    actionLink = sanitizeInviteLink(actionLink, appUrl);

    // 4. Provision User record in public.User
    if (userId) {
      try {
        await adminClient.from("User").upsert(
          {
            id: userId,
            email: cleanEmail,
            name: cleanName || cleanEmail.split("@")[0] || null,
            createdAt: new Date().toISOString(),
          },
          { onConflict: "id" }
        );
      } catch (userErr: any) {
        logger.warn("[admin/invite] User table sync notice:", userErr?.message);
      }

      // 5. Provision Credit & Plan record
      try {
        let paidCredits = 0;
        let expiresAt: string | null = null;
        const now = new Date();

        if (planId === "premium") {
          paidCredits = PRO_CREDITS_PER_MONTH;
          expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
        } else if (planId === "promax") {
          paidCredits = PRO_MAX_CREDITS_PER_MONTH;
          expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
        }

        const { data: existingCredit } = await adminClient
          .from("Credit")
          .select("id")
          .eq("userId", userId)
          .maybeSingle();

        if (existingCredit?.id) {
          await adminClient
            .from("Credit")
            .update({
              paidCredits,
              billingCycle: "monthly",
              resetAt: now.toISOString(),
              expiresAt,
            })
            .eq("userId", userId);
        } else {
          const newCreditId = "cred-" + userId.slice(0, 12);
          await adminClient
            .from("Credit")
            .insert({
              id: newCreditId,
              userId: userId,
              freeUsed: 0,
              paidCredits,
              billingCycle: "monthly",
              resetAt: now.toISOString(),
              expiresAt,
            });
        }
      } catch (credErr: any) {
        logger.warn("[admin/invite] Credit table sync notice:", credErr?.message);
      }
    }

    logger.info(`[admin/invite] Successfully generated invitation for ${cleanEmail} with plan ${planId}`);

    return NextResponse.json({
      success: true,
      emailSent,
      inviteLink: actionLink,
      userId,
      appUrl,
      message: emailSent
        ? `Invitation email dispatched to ${cleanEmail}!`
        : `Account prepared! The direct activation link is ready below.`,
    });
  } catch (error: any) {
    logger.error("[admin/invite] POST unhandled error:", error?.message);
    return NextResponse.json({ error: error?.message || "Failed to process invitation." }, { status: 500 });
  }
}
