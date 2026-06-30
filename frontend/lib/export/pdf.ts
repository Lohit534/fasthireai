import { logger } from "../logger";

/**
 * Generates a LaTeX-style professional resume PDF.
 * Pure JS PDF 1.4 — no Puppeteer, no Chromium, works on Vercel serverless.
 *
 * Layout matches a classic LaTeX `moderncv` / AltaCV style:
 *  - Name in large bold centered header
 *  - Contact on one centered line with separators
 *  - Section headers: all-caps with a full-width horizontal rule
 *  - Body text in 10pt, headers in 11pt, name in 20pt
 *  - Left margin indent for body paragraphs
 *  - Bullets with proper left-indent dash style
 */

// ─── Encoding helpers ────────────────────────────────────────────────────────

function latinSafe(s: string): string {
  return s
    .replace(/[\u2018\u2019\u0060]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2013/g, "-")
    .replace(/\u2014/g, "--")
    .replace(/\u2022|\u25B8|\u25BA|\u25B6|\u2192/g, "-")
    .replace(/[^\x20-\x7E]/g, "?");
}

function pdfStr(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/\r/g, "")
    .replace(/\n/g, " ");
}

function stripMarkdown(s: string): string {
  return s
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`(.*?)`/g, "$1");
}

// ─── PDF page constants ───────────────────────────────────────────────────────

const W = 595;           // A4 width in pts
const H = 842;           // A4 height in pts
const ML = 50;           // margin left
const MR = 50;           // margin right
const MT = 55;           // margin top (from top of page)
const MB = 50;           // margin bottom
const TW = W - ML - MR; // text width

// Font metrics: Helvetica avg char width at 1pt ≈ 0.55x
const CH_NORMAL  = 0.54;  // chars per pt for Helvetica
const CH_BOLD    = 0.58;  // chars per pt for Helvetica-Bold

function charsPerLine(fontSize: number, isBold = false): number {
  return Math.floor(TW / (fontSize * (isBold ? CH_BOLD : CH_NORMAL)));
}

function wordWrap(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) return [text];
  const words = text.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const candidate = cur ? cur + " " + w : w;
    if (candidate.length <= maxChars) {
      cur = candidate;
    } else {
      if (cur) lines.push(cur);
      cur = w.length > maxChars ? w.slice(0, maxChars - 1) + "-" : w;
    }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [""];
}

function measureRichTextWidth(text: string, fontSize: number, defaultBold: boolean): number {
  const regex = /(\*\*.*?\*\*)/g;
  const parts = text.split(regex);
  let totalW = 0;
  for (const part of parts) {
    if (!part) continue;
    let isBold = defaultBold;
    let textChunk = part;
    if (part.startsWith("**") && part.endsWith("**")) {
      isBold = true;
      textChunk = part.slice(2, -2);
    }
    totalW += textChunk.length * fontSize * (isBold ? CH_BOLD : CH_NORMAL);
  }
  return totalW;
}

function drawRichText(
  cmds: string[],
  x: number,
  yPos: number,
  fontSize: number,
  defaultBold: boolean,
  markdownText: string
) {
  const regex = /(\*\*.*?\*\*)/g;
  const parts = markdownText.split(regex);
  let curX = x;
  
  for (const part of parts) {
    if (!part) continue;
    
    let isBold = defaultBold;
    let textChunk = part;
    
    if (part.startsWith("**") && part.endsWith("**")) {
      isBold = true;
      textChunk = part.slice(2, -2).replace(/\*/g, ""); // Strip any internal asterisks
    } else {
      textChunk = textChunk.replace(/\*/g, ""); // Strip any stray asterisks
    }
    
    const font = isBold ? "F2" : "F1";
    const safeS = pdfStr(textChunk);
    
    cmds.push(`BT /${font} ${fontSize} Tf ${curX.toFixed(1)} ${yPos.toFixed(1)} Td (${safeS}) Tj ET`);
    
    const approxW = textChunk.length * fontSize * (isBold ? CH_BOLD : CH_NORMAL);
    curX += approxW;
  }
}

// ─── Parsed line types ────────────────────────────────────────────────────────

interface PdfLine {
  text: string;
  type: "name" | "contact" | "section" | "role" | "bullet" | "body" | "blank";
}

function parseResume(raw: string): PdfLine[] {
  const rawLines = raw.split(/\r?\n/);
  const out: PdfLine[] = [];
  let headerDone = false;
  let nameSet    = false;

  for (let i = 0; i < rawLines.length; i++) {
    const t = rawLines[i].trim();

    // Blank
    if (!t) {
      out.push({ text: "", type: "blank" });
      continue;
    }

    // Skip setext dividers
    if (/^[=\-\*_]{3,}$/.test(t)) continue;

    // Section header detection
    const isH1 = t.startsWith("# ");
    const isH2 = t.startsWith("## ");
    const nextT = (rawLines[i + 1] || "").trim();
    const isSetext = /^[=\-]{3,}$/.test(nextT);
    const isAllCaps = t === t.toUpperCase() && t.length > 3 && /[A-Z]/.test(t) && !/^[•\-*>]/.test(t) && !/^\d/.test(t);

    const isContactLine = t.includes("@") || t.includes("—") || t.includes("|") || /\+?\d[\d\-\s\(\)]{8,}/.test(t) || t.toLowerCase().includes("linkedin") || t.toLowerCase().includes("github");

    // Name (first meaningful line or # H1)
    if (!nameSet && !headerDone) {
      if (isH1 || (!isH2 && !isAllCaps && !isSetext)) {
        const name = stripMarkdown(t.replace(/^#+\s*/, ""));
        out.push({ text: latinSafe(name), type: "name" });
        nameSet = true;
        if (isH1) continue;
        continue;
      }
    }

    // Contact line(s) (before first section header)
    if (nameSet && !headerDone && !isH2 && !isAllCaps && !isSetext) {
      const contact = latinSafe(stripMarkdown(t).replace(/ \| /g, "  |  "));
      out.push({ text: contact, type: "contact" });
      continue;
    }

    // Section header
    if ((isH2 || isAllCaps || isSetext) && !isContactLine) {
      headerDone = true;
      let label = stripMarkdown(t.replace(/^#+\s*/, "").replace(/:$/, ""));
      if (isSetext) i++; // skip underline
      out.push({ text: latinSafe(label).toUpperCase(), type: "section" });
      continue;
    }

    headerDone = true;

    // Bullet
    if (/^[•\-*>\u2022]\s/.test(t)) {
      const txt = latinSafe(t.replace(/^[•\-*>\u2022]\s*/, ""));
      out.push({ text: txt, type: "bullet" });
      continue;
    }

    // Bold role/company lines (e.g. **Company Name** | Title)
    const wasBold = /^\*\*/.test(t) || /^\*[^*]/.test(t);
    const clean = latinSafe(t);
    out.push({ text: clean, type: wasBold ? "role" : "body" });
  }

  return out;
}

// ─── PDF Builder ─────────────────────────────────────────────────────────────

export async function generatePDF(resumeText: string): Promise<Buffer> {
  try {
    logger.info("Generating LaTeX-style PDF via pure-JS builder...");

    const lines = parseResume(resumeText);

    // Stream commands accumulator per page
    const pagesCmds: string[][] = [[]];
    let curPage = 0;
    let y = H - MT; // current Y position (PDF coords: 0 = bottom)

    const needsNewPage = (lineH: number) => y - lineH < MB;

    const addPage = () => {
      pagesCmds.push([]);
      curPage++;
      y = H - MT;
    };

    const ensureSpace = (lineH: number) => {
      if (needsNewPage(lineH)) {
        addPage();
      }
    };

    /** Draw a single text line */
    const text = (
      s: string,
      x: number,
      yPos: number,
      size: number,
      bold: boolean,
      centered = false
    ) => {
      const font = bold ? "F2" : "F1";
      const safeS = pdfStr(s);
      if (centered) {
        // Approximate center using char width estimate
        const approxW = s.length * size * (bold ? CH_BOLD : CH_NORMAL);
        const cx = (W - approxW) / 2;
        pagesCmds[curPage].push(`BT /${font} ${size} Tf ${cx.toFixed(1)} ${yPos.toFixed(1)} Td (${safeS}) Tj ET`);
      } else {
        pagesCmds[curPage].push(`BT /${font} ${size} Tf ${x.toFixed(1)} ${yPos.toFixed(1)} Td (${safeS}) Tj ET`);
      }
    };

    /** Full-width horizontal rule */
    const rule = (yPos: number, thickness = 0.6) => {
      pagesCmds[curPage].push(`${thickness} w ${ML} ${yPos.toFixed(1)} m ${W - MR} ${yPos.toFixed(1)} l S`);
    };

    // ── Render lines ─────────────────────────────────────────────────────────

    for (const line of lines) {
      switch (line.type) {

        case "name": {
          const sz = 22;
          ensureSpace(sz * 1.3);
          text(line.text, ML, y, sz, true, true);
          y -= sz * 1.4;
          break;
        }

        case "contact": {
          const sz = 10.5;
          ensureSpace(sz * 1.5);
          text(line.text, ML, y, sz, false, true);
          y -= sz * 1.6;
          y -= 12; // Added gap after contact info block
          break;
        }

        case "section": {
          const sz = 12.5;
          y -= 8; // extra space before section
          ensureSpace(sz * 1.5 + 6);
          text(line.text, ML, y, sz, true, false);
          y -= sz * 1.3;
          rule(y + 2);
          y -= 10; // Increased gap after section header
          break;
        }

        case "role":
        case "body": {
          const sz = 11.5;
          const isRole = line.type === "role";
          
          if (line.text.startsWith("CGPA:") || line.text.startsWith("GPA:")) {
            ensureSpace(sz * 1.4);
            const textW = measureRichTextWidth(line.text, sz, false);
            const rightX = W - MR - textW;
            drawRichText(pagesCmds[curPage], rightX, y, sz, false, line.text);
            y -= sz * 1.4;
            break;
          }
          
          // Split by 3 or more spaces to detect columns (e.g. title left, date right)
          const columns = line.text.split(/\s{3,}/);
          if (columns.length >= 2) {
            const left = columns[0];
            const right = columns.slice(1).join("   ");
            
            ensureSpace(sz * 1.4);
            
            // Render left column starting at ML
            drawRichText(pagesCmds[curPage], ML, y, sz, isRole, left);
            
            // Render right column right-aligned (ends at W - MR)
            const rightW = measureRichTextWidth(right, sz, false);
            const rightX = W - MR - rightW;
            
            drawRichText(pagesCmds[curPage], rightX, y, sz, false, right);
            y -= sz * 1.4;
          } else {
            // No column split, wrap and render
            const maxC = charsPerLine(sz, isRole);
            const wrapped = wordWrap(line.text, maxC);
            for (const w of wrapped) {
              ensureSpace(sz * 1.4);
              drawRichText(pagesCmds[curPage], ML, y, sz, isRole, w);
              y -= sz * 1.4;
            }
          }
          break;
        }

        case "bullet": {
          const sz = 11.5;
          const INDENT = ML + 14;
          const maxC = charsPerLine(sz, false) - 3; // adjust for indent
          const wrapped = wordWrap(line.text, maxC);
          for (let wi = 0; wi < wrapped.length; wi++) {
            ensureSpace(sz * 1.35);
            if (wi === 0) {
              // Bullet dot
              pagesCmds[curPage].push(`BT /F1 ${sz} Tf ${(ML + 4).toFixed(1)} ${y.toFixed(1)} Td (-) Tj ET`);
              drawRichText(pagesCmds[curPage], INDENT, y, sz, false, wrapped[wi]);
            } else {
              drawRichText(pagesCmds[curPage], INDENT, y, sz, false, wrapped[wi]);
            }
            y -= sz * 1.35;
          }
          break;
        }

        case "blank": {
          y -= 4; // small spacer for blank lines
          break;
        }
      }
    }

    // ── Assemble PDF binary ───────────────────────────────────────────────────

    const N = pagesCmds.length;
    const offsets: number[] = [];
    const parts: Buffer[]   = [];
    let byteOffset = 0;

    const append = (s: string) => {
      const b = Buffer.from(s, "latin1");
      parts.push(b);
      byteOffset += b.length;
    };

    // PDF header with binary comment (marks as binary file)
    append("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");

    // Obj 1 — Catalog
    offsets[1] = byteOffset;
    append(`1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`);

    // Obj 2 — Pages tree
    const kidsStr = Array.from({ length: N }, (_, idx) => `${3 + idx * 2} 0 R`).join(" ");
    offsets[2] = byteOffset;
    append(`2 0 obj\n<< /Type /Pages /Kids [${kidsStr}] /Count ${N} >>\nendobj\n`);

    // Page objects and content streams
    for (let i = 0; i < N; i++) {
      const pageObjId = 3 + i * 2;
      const contentObjId = 4 + i * 2;
      
      const pageStreamContent = pagesCmds[i].join("\n");
      const pageStreamBuf     = Buffer.from(pageStreamContent, "latin1");
      const pageStreamLen     = pageStreamBuf.length;

      // Page object
      offsets[pageObjId] = byteOffset;
      append(
        `${pageObjId} 0 obj\n` +
        `<< /Type /Page /Parent 2 0 R\n` +
        `   /MediaBox [0 0 ${W} ${H}]\n` +
        `   /Contents ${contentObjId} 0 R\n` +
        `   /Resources << /Font << /F1 ${3 + N * 2} 0 R /F2 ${4 + N * 2} 0 R >> >>\n` +
        ">>\nendobj\n"
      );

      // Content stream object
      offsets[contentObjId] = byteOffset;
      append(`${contentObjId} 0 obj\n<< /Length ${pageStreamLen} >>\nstream\n`);
      parts.push(pageStreamBuf);
      byteOffset += pageStreamLen;
      append("\nendstream\nendobj\n");
    }

    // Font 1 (Times-Roman regular)
    const font1Id = 3 + N * 2;
    offsets[font1Id] = byteOffset;
    append(
      `${font1Id} 0 obj\n` +
      "<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman\n" +
      "   /Encoding /WinAnsiEncoding >>\nendobj\n"
    );

    // Font 2 (Times-Bold)
    const font2Id = 4 + N * 2;
    offsets[font2Id] = byteOffset;
    append(
      `${font2Id} 0 obj\n` +
      "<< /Type /Font /Subtype /Type1 /BaseFont /Times-Bold\n" +
      "   /Encoding /WinAnsiEncoding >>\nendobj\n"
    );

    // Cross-reference table
    const xrefAt = byteOffset;
    const objCount = 5 + N * 2;
    append(`xref\n0 ${objCount}\n`);
    append("0000000000 65535 f \n");
    for (let i = 1; i < objCount; i++) {
      append(`${String(offsets[i]).padStart(10, "0")} 00000 n \n`);
    }

    // Trailer
    append(
      `trailer\n<< /Size ${objCount} /Root 1 0 R >>\n` +
      `startxref\n${xrefAt}\n%%EOF\n`
    );

    const pdf = Buffer.concat(parts);
    logger.info(`LaTeX-style PDF generated: ${pdf.length} bytes, ${N} pages, y=${y.toFixed(0)}`);
    return pdf;

  } catch (err: any) {
    logger.error("PDF generation failed:", err.message);
    throw new Error("PDF generation failed: " + err.message);
  }
}
