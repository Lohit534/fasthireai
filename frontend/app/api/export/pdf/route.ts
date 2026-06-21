import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { generatePDF } from "@/lib/export/pdf";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    // 1. Verify Authentication
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      logger.warn("Unauthorized attempt to export PDF");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Parse Request Body
    const body = await request.json();
    const { resumeId } = body;
    if (!resumeId) {
      return NextResponse.json({ error: "Missing resumeId" }, { status: 400 });
    }

    // 3. Fetch Resume and Verify Ownership
    const resume = await prisma.resume.findUnique({
      where: { id: resumeId }
    });

    if (!resume) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    }

    if (resume.userId !== user.id) {
      logger.warn(`User ${user.email} attempted to export unauthorized resume ${resumeId}`);
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 4. Generate PDF Document
    logger.info(`Generating PDF export for user ${user.email}, Resume ID ${resumeId}`);
    const pdfBuffer = await generatePDF(resume.optimizedText);

    // 5. Return PDF download
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="resume-optimized.pdf"',
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
