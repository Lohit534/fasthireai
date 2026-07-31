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
    } else if (filename.endsWith(".docx") || filename.endsWith(".doc")) {
      fileType = "docx";
    } else {
      return NextResponse.json(
        { error: "Unsupported file type. Only PDF, DOCX, and DOC files are allowed." },
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

    logger.info(`[parse-pdf] Extracting exact text from: ${file.name} (${file.size} bytes)`);

    if (fileType === "pdf") {
      try {
        const pdfParse = require("pdf-parse");
        const result = await pdfParse(buffer);
        extractedText = result?.text || "";
        logger.info(`[parse-pdf] Standard pdf-parse extracted ${extractedText.length} chars`);
      } catch (pdfErr: any) {
        logger.warn("[parse-pdf] Standard pdf-parse failed, trying fallback stream extraction:", pdfErr?.message);
      }

      // Fallback stream extraction if pdf-parse failed or returned empty text
      if (!extractedText || !extractedText.trim()) {
        try {
          const contentStr = buffer.toString("binary");
          const tjRegex = /\(([^()]{2,})\)\s*(?:Tj|TJ)/g;
          const matches: string[] = [];
          let m: RegExpExecArray | null;
          while ((m = tjRegex.exec(contentStr)) !== null) {
            const cleaned = m[1].replace(/\\\(|\x5C\)/g, "").trim();
            if (cleaned) matches.push(cleaned);
          }
          if (matches.length > 0) {
            extractedText = matches.join("\n");
          }
        } catch (_e) {}
      }
    } else {
      // DOCX / DOC
      try {
        const data = await mammoth.extractRawText({ buffer });
        extractedText = data.value || "";
      } catch (docxErr: any) {
        logger.warn("[parse-pdf] mammoth failed:", docxErr.message);
      }
    }

    // Clean up carriage returns & null characters while preserving exact as-is text
    extractedText = extractedText
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "")
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .trim();

    if (!extractedText || extractedText.length < 5) {
      return NextResponse.json(
        {
          error:
            "No readable text found in your document. Your file may be a scanned image. Please paste your resume text directly into the text box below.",
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
    logger.error("[parse-pdf] Unhandled error:", error?.message);
    return NextResponse.json(
      {
        error:
          "Internal server error during document parsing. You can paste your resume text manually in the text box below.",
      },
      { status: 500 }
    );
  }
}
