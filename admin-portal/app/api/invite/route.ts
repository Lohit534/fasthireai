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
  } catch {}

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

function getBaseAppUrl(request: NextRequest, bodyOrigin?: string): string {
  if (bodyOrigin && typeof bodyOrigin === "string" && bodyOrigin.startsWith("http")) {
    if (!bodyOrigin.includes("localhost") && !bodyOrigin.includes("127.0.0.1")) {
      return bodyOrigin.replace(/\/$/, "");
    }
  }

  const origin = request.headers.get("origin");
  const proto = request.headers.get("x-forwarded-proto") || "https";
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const headerOrigin = origin || (host ? `${proto}://${host}` : "");

  if (headerOrigin && !headerOrigin.includes("localhost") && !headerOrigin.includes("127.0.0.1")) {
    return headerOrigin.replace(/\/$/, "");
  }

  const referer = request.headers.get("referer");
  if (referer) {
    try {
      const parsed = new URL(referer);
      if (!parsed.hostname.includes("localhost") && !parsed.hostname.includes("127.0.0.1")) {
        return parsed.origin.replace(/\/$/, "");
      }
    } catch {}
  }

  const userAppUrl = process.env.USER_APP_URL || process.env.NEXT_PUBLIC_APP_URL || "";
  if (userAppUrl && !userAppUrl.includes("localhost") && !userAppUrl.includes("127.0.0.1")) {
    return userAppUrl.replace(/\/$/, "");
  }

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
    sanitized = sanitized
      .replace(/redirect_to=http(?:s)?%3A%2F%2Flocalhost(?::\d+)?/gi, `redirect_to=${encodeURIComponent(safeBase)}`)
      .replace(/redirect_to=http(?:s)?%3A%2F%2F127\.0\.0\.1(?::\d+)?/gi, `redirect_to=${encodeURIComponent(safeBase)}`)
      .replace(/redirect_to=http(?:s)?:\/\/localhost(?::\d+)?/gi, `redirect_to=${safeBase}`)
      .replace(/redirect_to=http(?:s)?:\/\/127\.0\.0\.1(?::\d+)?/gi, `redirect_to=${safeBase}`);

    sanitized = sanitized
      .replace(/^https?:\/\/localhost(?::\d+)?/i, safeBase)
      .replace(/^https?:\/\/127\.0\.0\.1(?::\d+)?/i, safeBase);

    return sanitized;
  } catch {
    return link;
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { email, name, planId = "free", origin: clientOrigin } = await request.json();
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email address is required" }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanName = (name || "").trim();
    const adminClient = getAdminClient(auth.token) as any;

    const appUrl = getBaseAppUrl(request, clientOrigin);
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

    // Sanitize link to remove any localhost domain
    actionLink = sanitizeInviteLink(actionLink, appUrl);

    return NextResponse.json({
      success: true,
      emailSent,
      inviteLink: actionLink,
      userId,
      appUrl,
      message: emailSent
        ? `Invitation email successfully dispatched to ${cleanEmail}!`
        : `User account created! A direct invitation link was generated below.`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to invite user" }, { status: 500 });
  }
}
