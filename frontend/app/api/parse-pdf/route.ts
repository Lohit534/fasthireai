import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";
import zlib from "zlib";
import { countWords } from "@/lib/utils";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 30; // 30s timeout for large PDFs

// Custom Y-coordinate page renderer for pdf-parse to preserve top-to-bottom reading order
function customPageRender(pageData: any) {
  return pageData.getTextContent({ normalizeWhitespace: true }).then((textContent: any) => {
    const items = textContent.items || [];
    // Sort items vertically top-to-bottom (Y descending), then horizontally left-to-right (X ascending)
    items.sort((a: any, b: any) => {
      const yA = a.transform ? a.transform[5] : 0;
      const yB = b.transform ? b.transform[5] : 0;
      const yDiff = yB - yA;
      if (Math.abs(yDiff) > 4) return yDiff;
      const xA = a.transform ? a.transform[4] : 0;
      const xB = b.transform ? b.transform[4] : 0;
      return xA - xB;
    });

    let lastY = -1;
    let pageText = "";
    for (const item of items) {
      if (!item.str || !item.str.trim()) continue;
      const currentY = item.transform ? Math.round(item.transform[5]) : 0;
      if (lastY !== -1 && Math.abs(currentY - lastY) > 4) {
        pageText += "\n";
      } else if (pageText.length > 0 && !pageText.endsWith("\n") && !pageText.endsWith(" ")) {
        pageText += " ";
      }
      pageText += item.str;
      lastY = currentY;
    }
    return pageText;
  });
}

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

    const MAX_SIZE = 10 * 1024 * 1024; // 10 MB limit
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File exceeds maximum size limit of 10MB." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    let extractedText = "";

    logger.info(`[parse-pdf] Extracting exact text from: ${file.name} (${file.size} bytes)`);

    if (fileType === "pdf") {
      // Stage 1: Try custom page renderer with Y-coordinate sorting
      try {
        const pdfParse = require("pdf-parse");
        const result = await pdfParse(buffer, { pagerender: customPageRender });
        extractedText = result?.text || "";
        logger.info(`[parse-pdf] Stage 1 (Y-render) extracted ${extractedText.length} chars`);
      } catch (pdfErr: any) {
        logger.warn("[parse-pdf] Stage 1 failed:", pdfErr?.message);
      }

      // Stage 2: Try standard pdf-parse default extraction
      if (!extractedText || extractedText.trim().length < 50) {
        try {
          const pdfParse = require("pdf-parse");
          const result = await pdfParse(buffer);
          if (result?.text && result.text.trim().length > extractedText.trim().length) {
            extractedText = result.text;
            logger.info(`[parse-pdf] Stage 2 (Standard) extracted ${extractedText.length} chars`);
          }
        } catch (_e) {}
      }

      // Stage 3: FlateDecode stream decompressor for Canva/Figma PDFs
      if (!extractedText || extractedText.trim().length < 50) {
        try {
          const contentStr = buffer.toString("binary");
          const streamRegex = /stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g;
          let match: RegExpExecArray | null;
          const streamParts: string[] = [];

          while ((match = streamRegex.exec(contentStr)) !== null) {
            try {
              const decompressed = zlib.inflateSync(Buffer.from(match[1], "binary")).toString("latin1");
              const tjMatches = decompressed.match(/\(([^()]{2,})\)\s*(?:Tj|TJ)/g);
              if (tjMatches) {
                tjMatches.forEach((tm) => {
                  const cleaned = tm
                    .replace(/\\\(|\x5C\)/g, "")
                    .replace(/^\(/, "")
                    .replace(/\)\s*(?:Tj|TJ)$/, "")
                    .trim();
                  if (cleaned.length > 1) streamParts.push(cleaned);
                });
              }
            } catch (_e) {}
          }
          if (streamParts.length > 0) {
            const streamText = streamParts.join("\n");
            if (streamText.length > extractedText.length) {
              extractedText = streamText;
              logger.info(`[parse-pdf] Stage 3 (Decompressor) extracted ${extractedText.length} chars`);
            }
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

    // Clean up control characters while preserving exact text
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
