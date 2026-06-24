import { logger } from "../logger";

/**
 * Generates a valid, text-searchable PDF from resume text.
 * Uses a pure hand-crafted PDF 1.4 structure — no Puppeteer, no Chromium.
 * Works reliably on Vercel serverless and all environments.
 */

function pdfString(s: string): string {
  // Encode string as PDF literal string, escaping special chars
  return s
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/\r/g, "\\r")
    .replace(/\n/g, "\\n");
}

function latinSafe(s: string): string {
  // Replace common Unicode characters with ASCII equivalents for PDF safety
  return s
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2013/g, "-")
    .replace(/\u2014/g, "--")
    .replace(/\u2022/g, "*")
    .replace(/\u25B8|\u25BA|\u25B6|\u2192/g, ">")
    .replace(/[^\x00-\x7E]/g, "?");
}

interface TextLine {
  text: string;
  bold: boolean;
  isHeader: boolean;
  isName: boolean;
  isContact: boolean;
  isBullet: boolean;
}

function parseResumeLines(resumeText: string): TextLine[] {
  const rawLines = resumeText.split(/\r?\n/);
  const result: TextLine[] = [];
  let headerDone = false;
  let nameSet = false;

  for (let i = 0; i < rawLines.length; i++) {
    const raw = rawLines[i];
    const trimmed = raw.trim();

    // Skip dividers
    if (/^[=\-\*_]{3,}$/.test(trimmed)) continue;

    // Empty line → separator
    if (!trimmed) {
      result.push({ text: "", bold: false, isHeader: false, isName: false, isContact: false, isBullet: false });
      continue;
    }

    // Detect section headers
    const isMarkdownH1 = trimmed.startsWith("# ");
    const isMarkdownH2 = trimmed.startsWith("## ");
    const isAllCaps = trimmed === trimmed.toUpperCase() && trimmed.length > 3 && /[A-Z]/.test(trimmed) && !/^[•\-*>]/.test(trimmed);
    const nextLine = rawLines[i + 1]?.trim() || "";
    const isSetext = /^[=\-]{3,}$/.test(nextLine);

    if (!headerDone && (isMarkdownH1 || (!nameSet && !isMarkdownH2 && !isAllCaps))) {
      // Name line
      const cleanName = trimmed.replace(/^#+\s*/, "");
      if (!nameSet && cleanName.length > 1) {
        result.push({ text: latinSafe(cleanName), bold: true, isHeader: false, isName: true, isContact: false, isBullet: false });
        nameSet = true;
        continue;
      }
    }

    if (!headerDone && !isMarkdownH2 && !isAllCaps && !isSetext && nameSet) {
      // Contact info line
      result.push({ text: latinSafe(trimmed.replace(/ \| /g, "  |  ")), bold: false, isHeader: false, isName: false, isContact: true, isBullet: false });
      continue;
    }

    if (isMarkdownH2 || isAllCaps || isSetext) {
      headerDone = true;
      let clean = trimmed.replace(/^#+\s*/, "").replace(/:$/, "");
      if (isSetext) {
        i++; // skip underline
      }
      result.push({ text: latinSafe(clean.toUpperCase()), bold: true, isHeader: true, isName: false, isContact: false, isBullet: false });
      continue;
    }

    headerDone = true;

    // Bullet lines
    if (/^[•\-*>\u2022]/.test(trimmed)) {
      const clean = trimmed.replace(/^[•\-*>\u2022]\s*/, "").replace(/\*\*(.*?)\*\*/g, "$1").replace(/\*(.*?)\*/g, "$1");
      result.push({ text: "  * " + latinSafe(clean), bold: false, isHeader: false, isName: false, isContact: false, isBullet: true });
      continue;
    }

    // Normal line — strip markdown bold/italic
    const clean = trimmed.replace(/\*\*(.*?)\*\*/g, "$1").replace(/\*(.*?)\*/g, "$1");
    const isBold = /^\*\*/.test(trimmed) || trimmed.includes("**");
    result.push({ text: latinSafe(clean), bold: isBold, isHeader: false, isName: false, isContact: false, isBullet: false });
  }

  return result;
}

export async function generatePDF(resumeText: string): Promise<Buffer> {
  try {
    logger.info("Generating PDF via pure-JS PDF builder...");

    const lines = parseResumeLines(resumeText);

    // PDF page constants (A4 in points: 595 x 842)
    const PAGE_W = 595;
    const PAGE_H = 842;
    const MARGIN_L = 45;
    const MARGIN_R = 45;
    const MARGIN_T = 50;
    const MARGIN_B = 50;
    const MAX_W = PAGE_W - MARGIN_L - MARGIN_R;
    const CHARS_PER_LINE_NORMAL = Math.floor(MAX_W / 5.5);
    const CHARS_PER_LINE_HEADER = Math.floor(MAX_W / 7);

    // Build stream content: BT...ET blocks
    const chunks: string[] = [];
    let y = PAGE_H - MARGIN_T;

    const addLine = (text: string, fontSize: number, bold: boolean, extraBefore: number = 0) => {
      y -= extraBefore;
      if (y < MARGIN_B + 20) {
        // Would overflow — skip (simple single-page for now)
        return;
      }
      const fontName = bold ? "F2" : "F1";
      const escaped = pdfString(text);
      chunks.push(`BT /${fontName} ${fontSize} Tf ${MARGIN_L} ${Math.round(y)} Td (${escaped}) Tj ET`);
      y -= fontSize * 1.4;
    };

    const addRule = () => {
      if (y < MARGIN_B + 10) return;
      chunks.push(`${MARGIN_L} ${Math.round(y + 4)} m ${PAGE_W - MARGIN_R} ${Math.round(y + 4)} l S`);
      y -= 6;
    };

    // Word-wrap a long line
    const wrapLine = (text: string, maxChars: number): string[] => {
      if (text.length <= maxChars) return [text];
      const words = text.split(" ");
      const wrapped: string[] = [];
      let current = "";
      for (const word of words) {
        if ((current + " " + word).trim().length <= maxChars) {
          current = (current + " " + word).trim();
        } else {
          if (current) wrapped.push(current);
          current = word;
        }
      }
      if (current) wrapped.push(current);
      return wrapped;
    };

    for (const line of lines) {
      if (!line.text) {
        y -= 4;
        continue;
      }

      if (line.isName) {
        addLine(line.text, 18, true, 4);
      } else if (line.isContact) {
        addLine(line.text, 9, false, 2);
      } else if (line.isHeader) {
        addLine("", 2, false, 6);
        addLine(line.text, 11, true, 0);
        addRule();
        y -= 2;
      } else if (line.isBullet) {
        const wrapped = wrapLine(line.text, CHARS_PER_LINE_NORMAL);
        for (let wi = 0; wi < wrapped.length; wi++) {
          addLine(wrapped[wi], 10, false, wi === 0 ? 1 : 0);
        }
      } else {
        const wrapped = wrapLine(line.text, CHARS_PER_LINE_NORMAL);
        for (let wi = 0; wi < wrapped.length; wi++) {
          addLine(wrapped[wi], 10, line.bold, wi === 0 ? 1 : 0);
        }
      }
    }

    // Build PDF binary
    const streamContent = chunks.join("\n");
    const streamBytes = Buffer.from(streamContent, "latin1");
    const streamLen = streamBytes.length;

    // Object offsets
    const offsets: number[] = [];
    const parts: Buffer[] = [];
    let offset = 0;

    const push = (s: string) => {
      const buf = Buffer.from(s, "latin1");
      parts.push(buf);
      offset += buf.length;
    };

    // Header
    push("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");

    // Obj 1: Catalog
    offsets[1] = offset;
    push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");

    // Obj 2: Pages
    offsets[2] = offset;
    push("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");

    // Obj 3: Page
    offsets[3] = offset;
    push(
      `3 0 obj\n<< /Type /Page /Parent 2 0 R\n` +
      `/MediaBox [0 0 ${PAGE_W} ${PAGE_H}]\n` +
      `/Contents 4 0 R\n` +
      `/Resources << /Font << /F1 5 0 R /F2 6 0 R >> >>\n>>\nendobj\n`
    );

    // Obj 4: Content stream
    offsets[4] = offset;
    push(`4 0 obj\n<< /Length ${streamLen} >>\nstream\n`);
    parts.push(streamBytes);
    offset += streamLen;
    push("\nendstream\nendobj\n");

    // Obj 5: Helvetica font (normal)
    offsets[5] = offset;
    push("5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n");

    // Obj 6: Helvetica-Bold font
    offsets[6] = offset;
    push("6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n");

    // Cross-reference table
    const xrefOffset = offset;
    const xrefEntries = [
      "0000000000 65535 f \n",
      ...offsets.slice(1).map((o) => `${String(o).padStart(10, "0")} 00000 n \n`),
    ];
    push(`xref\n0 ${xrefEntries.length}\n`);
    push(xrefEntries.join(""));

    // Trailer
    push(`trailer\n<< /Size ${xrefEntries.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);

    const pdfBuffer = Buffer.concat(parts);
    logger.info(`PDF generated successfully. Size: ${pdfBuffer.length} bytes`);
    return pdfBuffer;
  } catch (error: any) {
    logger.error("PDF generation failed:", error.message);
    throw new Error("PDF generation failed: " + error.message);
  }
}
