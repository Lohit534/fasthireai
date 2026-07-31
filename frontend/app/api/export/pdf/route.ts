import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { generatePDF } from "@/lib/export/pdf";
import { generatePDFFromJSON } from "@/lib/export/render-resume";
import { getCleanExportFilename } from "@/lib/export/pdf-document";
import { logger } from "@/lib/logger";
import { isOwnerEmail } from "@/types";
import type { ResumeJSON } from "@/types/resume";

export async function POST(request: NextRequest) {
  try {
    // 1. Verify Authentication
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      logger.warn("Unauthorized attempt to export PDF");
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

    // Determine if the user should get a watermarked PDF
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
    const { resumeId, type = "optimized", text: bodyText } = body;

    // If caller passed text directly, generate PDF without DB lookup
    if (bodyText && typeof bodyText === "string" && !resumeId) {
      logger.info(`Generating on-the-fly PDF from body text (no resumeId)`);
      const pdfBuffer = await generatePDF(bodyText, watermarked);
      const filename = getCleanExportFilename(bodyText, ".pdf");
      return new NextResponse(new Uint8Array(pdfBuffer), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    if (!resumeId) {
      return NextResponse.json({ error: "Missing resumeId" }, { status: 400 });
    }

    // 3. Fetch Resume and Verify Ownership
    const { data: resume, error: fetchErr } = await admin
      .from("Resume")
      .select("id, userId, originalText, optimizedText, jobTitle")
      .eq("id", resumeId)
      .maybeSingle();

    if (fetchErr) {
      logger.error("Resume fetch error:", fetchErr.message);
      // If DB fetch fails but caller passed text, fall through to plain text renderer
      if (bodyText) {
        const pdfBuffer = await generatePDF(bodyText as string, watermarked);
        const filename = getCleanExportFilename(bodyText as string, ".pdf");
        return new NextResponse(new Uint8Array(pdfBuffer), {
          status: 200,
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="${filename}"`,
          },
        });
      }
      return NextResponse.json({ error: "Database error fetching resume." }, { status: 500 });
    }

    if (!resume) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    }

    // Accept both the email-resolved activeUserId AND the raw auth user.id
    const isOwnerOfResume = resume.userId === activeUserId || resume.userId === user.id;
    if (!isOwnerOfResume) {
      logger.warn(`User ${user.email} (activeUserId: ${activeUserId}, authId: ${user.id}) attempted to export unauthorized resume ${resumeId} owned by ${resume.userId}`);
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 4. Generate PDF
    let pdfBuffer: Buffer;
    const textToExport = type === "original"
      ? (resume.originalText || "")
      : (resume.optimizedText || "");

    logger.info(`Generating PDF for resume ${resumeId} (type=${type}, watermarked=${watermarked})`);
    pdfBuffer = await generatePDF(textToExport, watermarked);

    // 5. Return PDF download
    const textForFilename = type === "original" ? (resume.originalText || "") : (resume.optimizedText || "");
    const filename = getCleanExportFilename(textForFilename, ".pdf", resume.jobTitle);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    logger.error("Failed to export PDF resume file:", error);
    return NextResponse.json(
      { error: "Internal server error during PDF generation." },
      { status: 500 }
    );
  }
}
