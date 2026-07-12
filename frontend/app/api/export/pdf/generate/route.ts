import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { generatePDF } from "@/lib/export/pdf";
import { logger } from "@/lib/logger";
import { isOwnerEmail } from "@/types";

export async function POST(request: NextRequest) {
  try {
    // 1. Verify Authentication
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      logger.warn("Unauthorized attempt to directly generate PDF");
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
    const { text } = body;
    if (!text) {
      return NextResponse.json({ error: "Missing text content" }, { status: 400 });
    }

    // 3. Generate PDF Document
    logger.info(`Generating direct PDF for user ${user.email} (watermarked=${watermarked})`);
    const pdfBuffer = await generatePDF(text, watermarked);

    // 4. Return PDF download
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="resume.pdf"`,
      },
    });
  } catch (error: any) {
    logger.error("Failed to generate direct PDF:", error);
    return NextResponse.json(
      { error: "Internal server error during PDF generation." },
      { status: 500 }
    );
  }
}
