import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { FREE_CREDITS_PER_MONTH } from "@/types";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    // 1. Verify Authentication
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      logger.warn("Unauthorized attempt to access /api/credits");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Fetch or Create User Profile and Credits
    let userRecord = await prisma.user.findUnique({
      where: { email: user.email! },
      include: { credit: true }
    });

    if (!userRecord) {
      userRecord = await prisma.user.create({
        data: {
          id: user.id, // Supabase UUID
          email: user.email!,
          name: user.user_metadata?.full_name || null,
          credit: {
            create: {
              freeUsed: 0,
              paidCredits: 0,
              resetAt: new Date()
            }
          }
        },
        include: { credit: true }
      });
    } else if (!userRecord.credit) {
      await prisma.credit.create({
        data: {
          userId: userRecord.id,
          freeUsed: 0,
          paidCredits: 0,
          resetAt: new Date()
        }
      });
      // Re-fetch with credit details
      userRecord = await prisma.user.findUnique({
        where: { id: userRecord.id },
        include: { credit: true }
      }) as any;
    }

    // 3. Process Monthly Credit Reset
    const now = new Date();
    const credit = userRecord!.credit!;
    const resetAt = new Date(credit.resetAt);
    
    let freeUsed = credit.freeUsed;
    let paidCredits = credit.paidCredits;

    const isNewMonth = 
      now.getMonth() !== resetAt.getMonth() || 
      now.getFullYear() !== resetAt.getFullYear();

    if (isNewMonth) {
      freeUsed = 0;
      await prisma.credit.update({
        where: { userId: userRecord!.id },
        data: {
          freeUsed: 0,
          resetAt: now
        }
      });
    }

    // 4. Return CreditInfo response
    return NextResponse.json({
      freeUsed,
      paidCredits,
      freeRemaining: Math.max(0, FREE_CREDITS_PER_MONTH - freeUsed),
      resetAt: isNewMonth ? now.toISOString() : resetAt.toISOString(),
    });
  } catch (error: any) {
    logger.error("Failed to query user credits:", error);
    return NextResponse.json(
      { error: "Internal server error during credit evaluation." },
      { status: 500 }
    );
  }
}
