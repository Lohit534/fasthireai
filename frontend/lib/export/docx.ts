import { Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle, PageOrientation, convertInchesToTwip } from "docx";
import { logger } from "../logger";

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

export async function generateDOCX(resumeText: string, watermarked = false): Promise<Buffer> {
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
