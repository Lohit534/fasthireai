import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";
import zlib from "zlib";
import { countWords } from "@/lib/utils";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 30; // 30s timeout for large PDFs

function customPageRender(pageData: any) {
  const render_options = {
    normalizeWhitespace: false,
    disableCombineTextItems: false,
  };
  return pageData.getTextContent(render_options).then((textContent: any) => {
    let lastY: number | null = null;
    let text = "";
    for (const item of textContent.items || []) {
      if (!item || typeof item.str !== "string") continue;
      const str = item.str;
      if (str === "") continue;

      if (lastY === null || Math.abs(lastY - item.transform[5]) < 3.5) {
        text += str;
      } else {
        text += "\n" + str;
      }
      lastY = item.transform[5];
    }
    return text;
  });
}

function extractTextFromPDFStreams(buffer: Buffer): string {
  const extractedChunks: string[] = [];
  const contentStr = buffer.toString("binary");

  // Locate stream...endstream blocks
  const streamRegex = /stream[\r\n]+([\s\S]*?)[\r\n]+endstream/gi;
  let match: RegExpExecArray | null;

  while ((match = streamRegex.exec(contentStr)) !== null) {
    let streamData = match[1];
    const streamBuffer = Buffer.from(streamData, "binary");

    // Decompress FlateDecode streams
    try {
      const decompressed = zlib.inflateSync(streamBuffer);
      streamData = decompressed.toString("utf8");
    } catch {
      try {
        const decompressedRaw = zlib.inflateRawSync(streamBuffer);
        streamData = decompressedRaw.toString("utf8");
      } catch {
        // Fallback to raw stream content if uncompressed
      }
    }

    // Extract PDF text instructions: (text) Tj, [(text) 10 (more)] TJ, <hex> Tj
    const textOpRegex = /\(([^()]+)\)\s*(?:Tj|TJ|'|")|\[([^\]]+)\]\s*TJ|<([0-9a-fA-F]+)>\s*Tj/gi;
    let textMatch: RegExpExecArray | null;

    while ((textMatch = textOpRegex.exec(streamData)) !== null) {
      if (textMatch[1]) {
        const cleaned = textMatch[1]
          .replace(/\\\(|\x5C\)/g, "")
          .replace(/\\[nrtbf]/g, " ")
          .trim();
        if (cleaned) {
          extractedChunks.push(cleaned);
        }
      } else if (textMatch[2]) {
        const innerParenRegex = /\(([^()]+)\)/g;
        let innerMatch: RegExpExecArray | null;
        while ((innerMatch = innerParenRegex.exec(textMatch[2])) !== null) {
          const cleaned = innerMatch[1].replace(/\\\(|\x5C\)/g, "").trim();
          if (cleaned) {
            extractedChunks.push(cleaned);
          }
        }
      } else if (textMatch[3]) {
        try {
          const hexStr = Buffer.from(textMatch[3], "hex").toString("utf8").trim();
          if (hexStr) {
            extractedChunks.push(hexStr);
          }
        } catch {}
      }
    }
  }

  // Fallback: extract ASCII words if stream regex yielded no chunks
  if (extractedChunks.length < 5) {
    const rawAsciiWords = contentStr.match(/[a-zA-Z0-9.,@:%\-+\(\)\/\s]{3,}/g) || [];
    const validWords = rawAsciiWords
      .map((w) => w.trim())
      .filter((w) => w.length > 2);
    if (validWords.length > 5) {
      extractedChunks.push(...validWords);
    }
  }

  return extractedChunks.join("\n");
}

/**
  100% faithful formatting of extracted resume text.
  Preserves all text, dates, numbers, metrics, and standardizes bullet points on separate lines.
 */
function formatExtractedResumeText(text: string): string {
  if (!text) return "";

  // 1. Clean control characters while preserving unicode bullets
  let clean = text
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");

  // 2. Identify common section headers and ensure section break spacing
  const SECTIONS = [
    "PROFESSIONAL SUMMARY", "SUMMARY", "OBJECTIVE", "PROFILE",
    "TECHNICAL SKILLS", "SKILLS", "CORE SKILLS", "SOFT SKILLS", "SKILLS & COMPETENCIES", "KEY SKILLS",
    "PROFESSIONAL EXPERIENCE", "WORK EXPERIENCE", "EXPERIENCE", "EMPLOYMENT HISTORY", "INTERNSHIP", "INTERNSHIPS", "WORK HISTORY",
    "PROJECTS", "PERSONAL PROJECTS", "ACADEMIC PROJECTS", "KEY PROJECTS",
    "EDUCATION", "ACADEMIC BACKGROUND", "QUALIFICATIONS", "ACADEMICS",
    "CERTIFICATIONS", "ACHIEVEMENTS", "AWARDS", "HONORS", "CERTIFICATES",
    "LANGUAGES", "LANGUAGES SPOKEN", "LANGUAGES KNOWN", "INTERESTS", "VOLUNTEER"
  ];

  for (const sec of SECTIONS) {
    const regex = new RegExp(`(?:^|\\n|\\s{2,})(${sec})(?::|\\s|\\n|$)`, "gi");
    clean = clean.replace(regex, (m, g1) => `\n\n${g1.toUpperCase()}\n`);
  }

  // 3. Convert bullet symbols to clean bullet lines (without dropping any text)
  clean = clean.replace(/(?:^|\n|\s+)([•\-\*\u2022\u25aa\u25cf])\s*/g, "\n• ");

  // 4. Clean up trailing spaces per line while keeping line structure
  const lines = clean.split("\n");
  const formattedLines: string[] = [];

  for (let line of lines) {
    line = line.replace(/[ \t]+/g, " ").trim();
    if (!line) {
      if (formattedLines.length > 0 && formattedLines[formattedLines.length - 1] !== "") {
        formattedLines.push("");
      }
      continue;
    }
    formattedLines.push(line);
  }

  return formattedLines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
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
      let pdfParse: any = null;
      try {
        pdfParse = require("pdf-parse");
      } catch (requireErr: any) {
        logger.error("[parse-pdf] Failed to require pdf-parse:", requireErr.message);
      }

      // Stage 1: Try pdf-parse with custom page renderer (preserves 100% characters & spaces)
      if (pdfParse) {
        try {
          const result = await pdfParse(buffer, { pagerender: customPageRender });
          extractedText = result?.text || "";
          logger.info(
            `[parse-pdf] Stage 1 (custom render) parsed — pages=${result?.numpages || 1}, chars=${extractedText.length}`
          );
        } catch (stage1Err: any) {
          logger.warn("[parse-pdf] Stage 1 pdf-parse error:", stage1Err?.message);
        }

        // Stage 2: Try default pdf-parse if custom render returned empty text
        if (!extractedText || !extractedText.trim()) {
          try {
            const result = await pdfParse(buffer);
            extractedText = result?.text || "";
            logger.info(
              `[parse-pdf] Stage 2 (default pdf-parse) parsed — chars=${extractedText.length}`
            );
          } catch (stage2Err: any) {
            logger.warn("[parse-pdf] Stage 2 default pdf-parse error:", stage2Err?.message);
          }
        }
      }

      // Stage 3: Deep stream & FlateDecode stream extraction
      if (!extractedText || !extractedText.trim()) {
        try {
          extractedText = extractTextFromPDFStreams(buffer);
          logger.info(
            `[parse-pdf] Stage 3 (deep stream extraction) result — chars=${extractedText.length}`
          );
        } catch (stage3Err: any) {
          logger.error("[parse-pdf] Stage 3 stream extraction failed:", stage3Err?.message);
        }
      }
    } else {
      // DOCX / DOC
      try {
        const data = await mammoth.extractRawText({ buffer });
        extractedText = data.value || "";
        logger.info(
          `[parse-pdf] DOCX parsed OK — chars=${extractedText.length}`
        );
      } catch (docxErr: any) {
        logger.warn("[parse-pdf] mammoth failed:", docxErr.message);
      }

      // DOC / DOCX fallback
      if (!extractedText || !extractedText.trim()) {
        const contentStr = buffer.toString("utf8");
        const rawAsciiWords = contentStr.match(/[a-zA-Z0-9.,@:%\-+\(\)\/\s]{3,}/g) || [];
        extractedText = rawAsciiWords
          .map((w) => w.trim())
          .filter((w) => w.length > 2)
          .join(" ");
      }
    }

    // Pass extracted text through post-processing formatter to preserve all text & bullets
    extractedText = formatExtractedResumeText(extractedText);

    if (!extractedText || extractedText.length < 10) {
      return NextResponse.json(
        {
          error:
            "No readable text found in your document. Your file may be a scanned image. Please paste your resume text directly into the text box below or upload a text-based PDF/DOCX.",
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
    logger.error("[parse-pdf] Unhandled error:", error?.message, "\nStack:", error?.stack);
    return NextResponse.json(
      {
        error:
          "Internal server error during document parsing. You can paste your resume text manually in the text box below.",
      },
      { status: 500 }
    );
  }
}
