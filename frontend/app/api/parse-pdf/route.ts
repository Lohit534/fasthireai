import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";
import { countWords } from "@/lib/utils";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 30; // 30s timeout for large PDFs

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const filename = file.name.toLowerCase();
    let fileType: "pdf" | "docx";

    if (filename.endsWith(".pdf")) {
      fileType = "pdf";
    } else if (filename.endsWith(".docx")) {
      fileType = "docx";
    } else {
      return NextResponse.json(
        { error: "Unsupported file type. Only PDF and DOCX are allowed." },
        { status: 400 }
      );
    }

    const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File exceeds maximum size limit of 5MB." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    let extractedText = "";

    logger.info(
      `[parse-pdf] Parsing: ${file.name} | type=${fileType} | size=${file.size} bytes`
    );

    if (fileType === "pdf") {
      // pdf-parse@1.1.1 — pure JavaScript, no native binaries, works on Vercel
      // We require() lazily so the module is not evaluated at build time
      let pdfParse: (buf: Buffer, options?: any) => Promise<{ text: string; numpages: number }>;
      try {
        pdfParse = require("pdf-parse");
      } catch (requireErr: any) {
        logger.error("[parse-pdf] Failed to require pdf-parse:", requireErr.message);
        return NextResponse.json(
          { error: "PDF parser module failed to load. Please try a DOCX file." },
          { status: 500 }
        );
      }

      try {
        const result = await pdfParse(buffer, {
          // Only extract text — skip canvas/image rendering entirely
          version: "v1.10.100",
        });
        extractedText = result.text;
        logger.info(
          `[parse-pdf] PDF parsed OK — pages=${result.numpages}, chars=${extractedText.length}`
        );
      } catch (pdfErr: any) {
        logger.error("[parse-pdf] pdf-parse threw:", pdfErr.message, pdfErr.stack?.split("\n")[1]);
        return NextResponse.json(
          {
            error:
              "Could not read your PDF. The file may be scanned/image-only or password-protected. Please try a text-based PDF or convert to DOCX.",
          },
          { status: 422 }
        );
      }
    } else {
      try {
        const data = await mammoth.extractRawText({ buffer });
        extractedText = data.value;
        logger.info(
          `[parse-pdf] DOCX parsed OK — chars=${extractedText.length}`
        );
      } catch (docxErr: any) {
        logger.error("[parse-pdf] mammoth threw:", docxErr.message);
        return NextResponse.json(
          { error: "Failed to read DOCX file. Please ensure it is a valid Word document." },
          { status: 422 }
        );
      }
    }

    if (!extractedText || !extractedText.trim()) {
      return NextResponse.json(
        {
          error:
            "No readable text found. Your file may be image-only or empty. Try a different PDF or use a DOCX.",
        },
        { status: 422 }
      );
    }

    const wordCount = countWords(extractedText);

    return NextResponse.json({
      text: extractedText,
      wordCount,
      fileType,
    });
  } catch (error: any) {
    // Log full stack so Vercel logs show the real cause
    logger.error("[parse-pdf] Unhandled error:", error?.message, "\nStack:", error?.stack);
    return NextResponse.json(
      {
        error:
          "Internal server error during document parsing. Check Vercel function logs for details.",
      },
      { status: 500 }
    );
  }
}
