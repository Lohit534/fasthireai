import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";
import { countWords } from "@/lib/utils";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const pdf = require("pdf-parse");
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Validation checks
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

    // Check size limit: 5MB (5 * 1024 * 1024 bytes)
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
      const data = await pdf(buffer);
      extractedText = data.text;
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
      fileType
    });
  } catch (error: any) {
    logger.error("Failed to parse document file:", error);
    return NextResponse.json(
      { error: "Internal server error during document parsing." },
      { status: 500 }
    );
  }
}

