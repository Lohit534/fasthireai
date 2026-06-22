import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";
import { countWords } from "@/lib/utils";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

/**
 * Extract plain text from a PDF buffer using pdfjs-dist directly.
 * This avoids the @napi-rs/canvas native binary dependency inside pdf-parse@2.x
 * that causes Vercel/serverless 500 crashes.
 */
async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  // Use dynamic import to avoid bundler issues at build time
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");

  // Disable the worker in Node.js server context (no DOM, no web workers)
  pdfjsLib.GlobalWorkerOptions.workerSrc = "";

  const uint8 = new Uint8Array(buffer);

  const loadingTask = pdfjsLib.getDocument({
    data: uint8,
    // Disable font rendering features we don't need for text extraction
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
    disableFontFace: true,
  });

  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;
  const textParts: string[] = [];

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item: any) => ("str" in item ? item.str : ""))
      .join(" ");
    textParts.push(pageText);
  }

  await pdf.destroy();
  return textParts.join("\n").trim();
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
    } else if (filename.endsWith(".docx")) {
      fileType = "docx";
    } else {
      return NextResponse.json(
        { error: "Unsupported file type. Only PDF and DOCX are allowed." },
        { status: 400 }
      );
    }

    // Validate size limit: 5 MB
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File exceeds maximum size limit of 5MB." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    let extractedText = "";

    logger.info(`Parsing uploaded file: ${file.name} (${fileType}, ${file.size} bytes)`);

    if (fileType === "pdf") {
      extractedText = await extractTextFromPDF(buffer);
    } else {
      const data = await mammoth.extractRawText({ buffer });
      extractedText = data.value;
    }

    if (!extractedText || !extractedText.trim()) {
      return NextResponse.json(
        { error: "Could not extract any readable text from the file." },
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
    logger.error("Failed to parse document file:", error);
    return NextResponse.json(
      { error: "Internal server error during document parsing." },
      { status: 500 }
    );
  }
}
