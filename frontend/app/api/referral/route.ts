import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const REFERRALS_FILE = path.join(DATA_DIR, "referrals.json");

function ensureDirectoryExistence(filePath: string) {
  const dirname = path.dirname(filePath);
  if (fs.existsSync(dirname)) return true;
  fs.mkdirSync(dirname, { recursive: true });
}

function getLocalReferrals(): any[] {
  try {
    ensureDirectoryExistence(REFERRALS_FILE);
    if (fs.existsSync(REFERRALS_FILE)) {
      const content = fs.readFileSync(REFERRALS_FILE, "utf8");
      return JSON.parse(content || "[]");
    }
  } catch (e) {
    logger.warn("[referral] Local JSON read error:", e);
  }
  return [];
}

function saveLocalReferrals(data: any[]) {
  try {
    ensureDirectoryExistence(REFERRALS_FILE);
    fs.writeFileSync(REFERRALS_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (e) {
    logger.error("[referral] Local JSON write error:", e);
  }
}

// Generate unique referral code from user ID
export function generateReferralCode(userId: string): string {
  const cleanId = userId.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const suffix = cleanId.slice(-6) || "X9K2P1";
  return `REF-${suffix}`;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = getAdminClient() as any;

    // Resolve user ID in User table
    let activeUserId = user.id;
    if (user.email) {
      try {
        const { data: existingUser } = await admin
          .from("User")
          .select("id")
          .eq("email", user.email.toLowerCase().trim())
          .maybeSingle();
        if (existingUser) {
          activeUserId = existingUser.id;
        }
      } catch (e) {}
    }

    const referralCode = generateReferralCode(activeUserId);
    const origin = request.nextUrl.origin || "https://fasthireai.vercel.app";
    const referralLink = `${origin}/auth/signup?ref=${referralCode}`;

    let totalReferrals = 0;
    let bonusCredits = 0;

    try {
      // Query by referrerId (both auth ID and User table ID) OR by referrerEmail
      const [byId1, byId2, byCode] = await Promise.all([
        admin.from("Referral").select("*").eq("referrerId", activeUserId),
        activeUserId !== user.id
          ? admin.from("Referral").select("*").eq("referrerId", user.id)
          : Promise.resolve({ data: [] }),
        user.email
          ? admin.from("Referral").select("*").eq("referralCode", referralCode)
          : Promise.resolve({ data: [] }),
      ]);

      // Merge all results, deduplicate by id
      const merged = new Map<string, any>();
      for (const { data } of [byId1, byId2, byCode]) {
        if (Array.isArray(data)) {
          for (const r of data) {
            merged.set(r.id, r);
          }
        }
      }
      const dbRefs = [...merged.values()];

      const dbCount = dbRefs.length;
      const localRefs = getLocalReferrals().filter(
        (r: any) =>
          r.referrerId === activeUserId ||
          r.referrerId === user.id ||
          r.referralCode === referralCode ||
          (user.email && r.referrerEmail === user.email.toLowerCase().trim())
      );
      const localCount = localRefs.length;

      totalReferrals = Math.max(dbCount, localCount);
      bonusCredits = totalReferrals; // 1 credit per referral
    } catch (e: any) {
      const localRefs = getLocalReferrals().filter(
        (r: any) =>
          r.referrerId === activeUserId ||
          r.referrerId === user.id ||
          r.referralCode === referralCode ||
          (user.email && r.referrerEmail === user.email.toLowerCase().trim())
      );
      totalReferrals = localRefs.length;
      bonusCredits = localRefs.length;
    }

    return NextResponse.json({
      referralCode,
      referralLink,
      totalReferrals,
      bonusCredits,
    });
  } catch (error: any) {
    logger.error("[referral GET] Unhandled error:", error?.message);
    return NextResponse.json(
      { error: "Failed to fetch referral details." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { referralCode, newUserId, newUserEmail } = body;

    if (!referralCode || (!newUserId && !newUserEmail)) {
      return NextResponse.json(
        { error: "referralCode and newUser info are required." },
        { status: 400 }
      );
    }

    const admin = getAdminClient() as any;
    const now = new Date();

    // 1. Find referrer by matching referralCode
    let referrerId: string | null = null;
    let referrerEmail: string | null = null;

    try {
      const { data: users } = await admin.from("User").select("id, email");
      if (users) {
        const matchedUser = users.find((u: any) => generateReferralCode(u.id) === referralCode.toUpperCase().trim());
        if (matchedUser) {
          referrerId = matchedUser.id;
          referrerEmail = matchedUser.email;
        }
      }
    } catch (e) {
      logger.warn("[referral POST] DB matching error, trying fallback:", e);
    }

    if (!referrerId && newUserId) {
      // Fallback matching if user ID suffix matches
      const codeClean = referralCode.replace(/^REF-/i, "").toUpperCase();
      if (codeClean.length >= 4) {
        try {
          const { data: userBySuffix } = await admin
            .from("User")
            .select("id, email")
            .ilike("id", `%${codeClean}`)
            .maybeSingle();
          if (userBySuffix) {
            referrerId = userBySuffix.id;
            referrerEmail = userBySuffix.email;
          }
        } catch (e) {}
      }
    }

    if (!referrerId) {
      logger.warn(`[referral POST] Referral code ${referralCode} did not match any referrer.`);
      return NextResponse.json(
        { error: "Invalid referral code." },
        { status: 404 }
      );
    }

    // 2. Prevent self-referral
    if (referrerId === newUserId) {
      return NextResponse.json(
        { error: "Self-referrals are not permitted." },
        { status: 400 }
      );
    }

    // 3. Prevent duplicate claim
    const localRefs = getLocalReferrals();
    const alreadyClaimed = localRefs.some(
      r => r.referredId === newUserId || r.referredEmail === newUserEmail
    );

    if (alreadyClaimed) {
      return NextResponse.json(
        { message: "Referral reward already claimed." },
        { status: 200 }
      );
    }

    // 4. Save Referral record
    const referralRecord = {
      id: "ref-" + Math.random().toString(36).substring(2, 11),
      referrerId,
      referrerEmail,
      referredId: newUserId || "anon-" + Date.now(),
      referredEmail: newUserEmail || "",
      referralCode,
      createdAt: now.toISOString(),
    };

    localRefs.push(referralRecord);
    saveLocalReferrals(localRefs);

    try {
      await admin.from("Referral").insert(referralRecord);
    } catch (e) {
      logger.warn("[referral POST] DB insert ignored, saved in local storage:", e);
    }

    // 5. Grant +1 Bonus Credit to Referrer
    try {
      const { data: referrerCredit } = await admin
        .from("Credit")
        .select("*")
        .eq("userId", referrerId)
        .maybeSingle();

      if (referrerCredit) {
        await admin
          .from("Credit")
          .update({ paidCredits: (referrerCredit.paidCredits || 0) + 1 })
          .eq("userId", referrerId);
      }
    } catch (e) {
      logger.warn("[referral POST] Failed updating referrer credit DB:", e);
    }

    // 6. Grant +1 Welcome Bonus Credit to Referred Friend
    if (newUserId) {
      try {
        const { data: friendCredit } = await admin
          .from("Credit")
          .select("*")
          .eq("userId", newUserId)
          .maybeSingle();

        if (friendCredit) {
          await admin
            .from("Credit")
            .update({ paidCredits: (friendCredit.paidCredits || 0) + 1 })
            .eq("userId", newUserId);
        } else {
          await admin.from("Credit").insert({
            userId: newUserId,
            freeUsed: 0,
            paidCredits: 1, // 1 welcome bonus credit
            resetAt: now.toISOString(),
          });
        }
      } catch (e) {
        logger.warn("[referral POST] Failed updating friend credit DB:", e);
      }
    }

    logger.info(`[referral POST] Reward granted! Referrer ${referrerEmail} got +1 credit for inviting ${newUserEmail}`);
    return NextResponse.json({
      success: true,
      message: "🎉 Referral reward claimed! Both you and your friend received +1 free AI Optimization credit.",
    });
  } catch (error: any) {
    logger.error("[referral POST] Unhandled error:", error?.message);
    return NextResponse.json(
      { error: "Failed to claim referral reward." },
      { status: 500 }
    );
  }
}
