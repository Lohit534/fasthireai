import { Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle, PageOrientation, convertInchesToTwip, ExternalHyperlink, TabStopType, Tab } from "docx";
import { logger } from "../logger";
import { parseResumeIntoBlocks, computeDensityScale, stripMarkdownAsterisks, toSectionTitle, splitCertText } from "./pdf-document";

function cleanText(str: string): string {
  if (!str) return "";
  return str
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, "$1")
    .replace(/\*/g, "")
    .replace(/\s*\|\|\s*/g, " | ")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function parseTextRuns(text: string, baseOptions: any = {}): TextRun[] {
  const sanitized = cleanText(text);
  if (!sanitized) return [];
  return [
    new TextRun({
      font: "Times New Roman",
      size: 21, // 10.5pt — matches PDF base
      ...baseOptions,
      text: sanitized,
    })
  ];
}

// Detect if a line is a section header (ALL CAPS, no bullets, length > 3 chars)
function isAllCapsSection(line: string): boolean {
  const stripped = line.replace(/[^A-Z\s&]/g, "").trim();
  return (
    line.length > 3 &&
    line === line.toUpperCase() &&
    stripped.length > 3 &&
    !/^[•\-*\u2022]/.test(line) &&
    !/^\d+\.?$/.test(line)
  );
}

/** Legacy line-based DOCX renderer (kept as a safety fallback). */
export async function generateDOCXFromLines(resumeText: string, watermarked = false): Promise<Buffer> {
  try {
    logger.info(`Initializing DOCX generation (watermarked=${watermarked})...`);
    const lines = resumeText.split(/\r?\n/).map(line => line.trim());
    const children: Paragraph[] = [];

    if (watermarked) {
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: "FASTHIRE AI — FREE TIER PREVIEW (UPGRADE TO PRO TO DOWNLOAD)",
              font: "Times New Roman",
              size: 20,
              bold: true,
              color: "CC0000"
            })
          ],
          spacing: { after: 120 }
        })
      );
    }

    let nameWritten = false;
    let headerEnded = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // 1. Empty line — small spacer
      if (!line) {
        children.push(new Paragraph({ spacing: { after: 60 } }));
        continue;
      }

      const isDivider = /^[=\-_]{3,}$/.test(line);
      if (isDivider) continue; // skip setext dividers

      const nextLine = (i + 1 < lines.length) ? lines[i + 1].trim() : "";
      const isSetextHeader = nextLine && /^[=\-_]{3,}$/.test(nextLine);
      const isMarkdownHeader = line.startsWith("## ");
      const isSection = isAllCapsSection(line) || isMarkdownHeader || isSetextHeader;

      if (isSection) headerEnded = true;

      // 2. Name line (first non-empty line before any section detected)
      if (!nameWritten && !headerEnded) {
        nameWritten = true;
        children.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: cleanText(line),
                font: "Times New Roman",
                size: 44, // 22pt — matches PDF name size
                bold: true,
              })
            ],
            spacing: { before: 0, after: 100 }
          })
        );
        continue;
      }

      // 3. Contact / sub-header lines before first section
      if (!headerEnded) {
        children.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: cleanText(line),
                font: "Times New Roman",
                size: 20, // 10pt — matches PDF contact row
                color: "111111"
              })
            ],
            spacing: { before: 40, after: 120 }
          })
        );
        continue;
      }

      // 4. Section headers
      if (isSection) {
        let cleanHeader = line;
        if (isMarkdownHeader) cleanHeader = line.substring(3).trim();
        else if (line.endsWith(":")) cleanHeader = line.slice(0, -1);

        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: cleanHeader,
                font: "Times New Roman",
                size: 24, // 12pt — matches PDF section header
                bold: true,
              })
            ],
            border: {
              bottom: {
                color: "000000",
                space: 4,
                style: BorderStyle.SINGLE,
                size: 8 // 1pt line — matches PDF
              }
            },
            spacing: { before: 180, after: 80 }
          })
        );
        if (isSetextHeader) i++; // skip underline row
        continue;
      }

      // 5. Skill lines with "Label: value" format
      if (line.includes(":") && !line.startsWith("•") && !line.startsWith("-")) {
        const colonIdx = line.indexOf(":");
        const label = cleanText(line.substring(0, colonIdx)).trim();
        const value = cleanText(line.substring(colonIdx + 1)).trim();
        if (label && value && label.length < 40) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({ text: label + ": ", font: "Times New Roman", size: 21, bold: true }),
                new TextRun({ text: value, font: "Times New Roman", size: 21 }),
              ],
              spacing: { after: 60 }
            })
          );
          continue;
        }
      }

      // 6. Bullet points (•, -, *, en-dash, em-dash)
      if (/^[•\-*\u2022\u2013\u2014]/.test(line)) {
        const cleanBulletText = cleanText(line.replace(/^[•\-*\u2022\u2013\u2014]\s*/, ""));
        children.push(
          new Paragraph({
            bullet: { level: 0 },
            children: parseTextRuns(cleanBulletText),
            spacing: { after: 40 }
          })
        );
        continue;
      }

      // 7. Lines with dual column content (title + date, spaced 3+ chars apart)
      const columns = line.split(/\s{3,}/);
      if (columns.length > 1) {
        children.push(
          new Paragraph({
            tabStops: [{ type: "right", position: 9360 }],
            children: [
              ...parseTextRuns(columns[0], { bold: true }),
              new TextRun({ text: "\t" }),
              ...parseTextRuns(columns[columns.length - 1]),
            ],
            spacing: { after: 60 },
          })
        );
        continue;
      }

      // 8. Normal paragraph line
      children.push(
        new Paragraph({
          children: parseTextRuns(line),
          spacing: { after: 80 }
        })
      );
    }

    const doc = new Document({
      styles: {
        default: {
          document: {
            run: { font: "Times New Roman", size: 21 }
          }
        }
      },
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: convertInchesToTwip(0.75),
                bottom: convertInchesToTwip(0.75),
                left: convertInchesToTwip(0.85),
                right: convertInchesToTwip(0.85),
              }
            }
          },
          children
        }
      ]
    });

    const buffer = await Packer.toBuffer(doc);
    logger.info("DOCX generation completed successfully.");
    return buffer;
  } catch (error) {
    logger.error("DOCX generation failed. Returning basic fallback text.", error);
    return Buffer.from("DOCX Fallback File Content:\n\n" + resumeText);
  }
}

// ─── Universal template DOCX (same block model as PDF + live preview) ──────────
const A4_WIDTH = 11906;
const A4_HEIGHT = 16838;

function linkLabel(url: string, text: string): string {
  const l = `${url} ${text}`.toLowerCase();
  if (l.includes("linkedin")) return "LinkedIn";
  if (l.includes("github")) return "GitHub";
  if (l.includes("portfolio")) return "Portfolio";
  return text.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "");
}

export async function generateDOCX(resumeText: string, watermarked = false): Promise<Buffer> {
  try {
    const blocks = parseResumeIntoBlocks(resumeText);
    if (!blocks.length) return generateDOCXFromLines(resumeText, watermarked);

    const scale = computeDensityScale(resumeText, blocks);
    const hp = (pt: number) => Math.max(14, Math.round(pt * 2 * scale)); // half-points
    const sp = (tw: number) => Math.round(tw * scale); // spacing twips
    const marginTw = Math.round(convertInchesToTwip(scale < 0.95 ? 0.45 : 0.55));
    const sideTw = Math.round(convertInchesToTwip(scale < 0.95 ? 0.5 : 0.6));
    const rightTab = A4_WIDTH - sideTw * 2;
    const FONT = "Times New Roman";
    const BODY = hp(10.5);
    const run = (text: string, opts: Record<string, any> = {}) =>
      new TextRun({ text: stripMarkdownAsterisks(text || ""), font: FONT, size: BODY, ...opts });

    const twoCol = (left: string, right: string, leftOpts: Record<string, any> = {}, rightOpts: Record<string, any> = {}, after = 20) =>
      new Paragraph({
        tabStops: [{ type: TabStopType.RIGHT, position: rightTab }],
        children: [run(left, leftOpts), ...(right ? [new TextRun({ children: [new Tab()] }), run(right, rightOpts)] : [])],
        spacing: { after: sp(after) },
      });

    const bullet = (text: string) =>
      new Paragraph({
        bullet: { level: 0 },
        children: [run(text.replace(/^\s*([•\-\*–—+\u2022\u25cf\u2043▸►→]|\d+\.)\s*/, ""))],
        spacing: { after: sp(20) },
      });

    const children: Paragraph[] = [];
    if (watermarked) {
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [run("FASTHIRE AI — FREE TIER PREVIEW (UPGRADE TO PRO TO DOWNLOAD)", { bold: true, color: "CC0000", size: hp(10) })],
          spacing: { after: 120 },
        }),
      );
    }

    for (const b of blocks) {
      switch (b.type) {
        case "name":
          children.push(
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [run(b.text, { smallCaps: true, size: hp(24) })],
              spacing: { after: sp(20) },
            }),
          );
          break;
        case "subtitle":
          children.push(
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [run(b.text, { bold: true, size: hp(12.5) })],
              spacing: { after: sp(60) },
            }),
          );
          break;
        case "contact": {
          const parts: (TextRun | ExternalHyperlink)[] = [];
          b.segments.forEach((seg, i) => {
            const label = (seg.text || "").replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "");
            if (seg.isLink && seg.url) {
              parts.push(new ExternalHyperlink({ link: seg.url, children: [run(label || linkLabel(seg.url, seg.text), { size: hp(9.5), color: "000000", underline: {} })] }));
            } else {
              parts.push(run(label, { size: hp(9.5) }));
            }
            if (i < b.segments.length - 1) parts.push(run("   ", { size: hp(9.5) }));
          });
          children.push(new Paragraph({ alignment: AlignmentType.CENTER, children: parts, spacing: { after: sp(100) } }));
          break;
        }
        case "section":
          children.push(
            new Paragraph({
              children: [run(toSectionTitle(b.text), { bold: true, size: hp(12) })],
              border: { bottom: { color: "000000", space: 2, style: BorderStyle.SINGLE, size: 6 } },
              spacing: { before: sp(120), after: sp(40) },
            }),
          );
          break;
        case "summary":
        case "normal":
          children.push(new Paragraph({ alignment: AlignmentType.JUSTIFIED, children: [run(b.text)], spacing: { after: sp(30) } }));
          break;
        case "skillLine":
          children.push(new Paragraph({ children: [run(`${b.label}: `, { bold: true }), run(b.value)], spacing: { after: sp(20) } }));
          break;
        case "project": {
          const projTitle = b.name + (b.tech ? ` — ${b.tech}` : "");
          children.push(twoCol(projTitle, b.dates || "", { bold: true }, { bold: true }, 10));
          b.bullets.forEach((x) => children.push(bullet(x)));
          break;
        }
        case "job":
          children.push(twoCol(b.title, b.dates, { bold: true }, { bold: true }, 10));
          if (b.company || b.tech) {
            children.push(twoCol(b.company || "", b.tech || "", { italics: true }, { italics: true }, 15));
          }
          b.bullets.forEach((x) => children.push(bullet(x)));
          break;
        case "education":
          children.push(twoCol(b.degree, b.dates, { bold: true }, { bold: true }, 10));
          if (b.school || b.gpa) {
            children.push(twoCol(b.school || "", b.gpa || "", { italics: true }, { italics: true }, 25));
          }
          break;
        case "bullet":
          children.push(bullet(b.text));
          break;
        case "cert": {
          const { title, rest } = splitCertText(b.text);
          children.push(
            new Paragraph({
              bullet: { level: 0 },
              children: [
                ...(title ? [run(title, { bold: true })] : []),
                run(rest),
              ],
              spacing: { after: sp(15) },
            }),
          );
          break;
        }
        case "link":
          children.push(new Paragraph({ children: [new ExternalHyperlink({ link: b.url, children: [run(b.label, { color: "0000EE", underline: {} })] })], spacing: { after: sp(20) } }));
          break;
        case "spacer":
          break;
      }
    }

    const doc = new Document({
      styles: { default: { document: { run: { font: FONT, size: BODY } } } },
      sections: [
        {
          properties: {
            page: {
              size: { width: A4_WIDTH, height: A4_HEIGHT },
              margin: { top: marginTw, bottom: marginTw, left: sideTw, right: sideTw },
            },
          },
          children,
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);
    logger.info(`Universal DOCX generated (scale=${scale}).`);
    return buffer;
  } catch (error) {
    logger.error("Universal DOCX renderer failed, using legacy line renderer.", error);
    return generateDOCXFromLines(resumeText, watermarked);
  }
}
