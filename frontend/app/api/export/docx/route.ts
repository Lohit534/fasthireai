import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { generateDOCX } from "@/lib/export/docx";
import { logger } from "@/lib/logger";
import { isOwnerEmail } from "@/types";

export async function POST(request: NextRequest) {
  try {
    // 1. Verify Authentication
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      logger.warn("Unauthorized attempt to export DOCX");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = getAdminClient() as any;
    let activeUserId = user.id;
    if (user.email) {
      const { data: existingUser } = await admin
        .from("User")
        .select("id")
        .eq("email", user.email.toLowerCase().trim())
        .maybeSingle();
      if (existingUser) {
        activeUserId = existingUser.id;
      }
    }

    // Determine if the user should get a watermarked DOCX
    const isOwner = isOwnerEmail(user.email);
    let watermarked = false;
    if (!isOwner) {
      const { data: creditRow } = await admin
        .from("Credit")
        .select("paidCredits")
        .eq("userId", activeUserId)
        .maybeSingle();
      if (!creditRow || creditRow.paidCredits <= 0) {
        watermarked = true;
      }
    }

    // 2. Parse Request Body
    const body = await request.json();
    const { resumeId, text } = body;
    if (!resumeId && !text) {
      return NextResponse.json({ error: "Missing resumeId or text content" }, { status: 400 });
    }

    let textToExport = text || "";

    if (!textToExport && resumeId) {
      // 3. Fetch Resume and Verify Ownership
      const { data: resume, error: fetchErr } = await admin
        .from("Resume")
        .select("id, userId, optimizedText")
        .eq("id", resumeId)
        .maybeSingle();

      if (fetchErr) {
        logger.error("Resume fetch error:", fetchErr.message);
        return NextResponse.json({ error: "Database error fetching resume." }, { status: 500 });
      }

      if (!resume) {
        return NextResponse.json({ error: "Resume not found" }, { status: 404 });
      }

      if (resume.userId !== activeUserId) {
        logger.warn(`User ${user.email} (activeUserId: ${activeUserId}) attempted to export unauthorized resume ${resumeId} owned by ${resume.userId}`);
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      textToExport = resume.optimizedText || "";
    }

    // 4. Generate DOCX Document
    logger.info(`Generating DOCX export for user ${user.email}, Resume ID ${resumeId || "direct-text"} (watermarked=${watermarked})`);
    const docxBuffer = await generateDOCX(textToExport, watermarked);

    // 5. Return DOCX download response
    return new NextResponse(new Uint8Array(docxBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": 'attachment; filename="resume-optimized.docx"',
      },
    });
  } catch (error: any) {
    logger.error("Failed to export DOCX resume file:", error);
    return NextResponse.json(
      { error: "Internal server error during DOCX generation." },
      { status: 500 }
    );
  }
}
