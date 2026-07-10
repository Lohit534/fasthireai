import { Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle } from "docx";
import { logger } from "../logger";

// Parses text with **bold** and *italic* markdown tags into separate TextRun elements
function parseTextRuns(text: string, baseOptions: any = {}): TextRun[] {
  const runs: TextRun[] = [];
  const boldTokens = text.split(/\*\*/);
  for (let i = 0; i < boldTokens.length; i++) {
    const isBold = i % 2 === 1;
    const boldText = boldTokens[i];
    if (!boldText) continue;

    const italicTokens = boldText.split(/\*/);
    for (let j = 0; j < italicTokens.length; j++) {
      const isItalic = j % 2 === 1;
      const finalRawText = italicTokens[j];
      if (!finalRawText) continue;

      runs.push(
        new TextRun({
          font: "Times New Roman",
          size: 22, // 11pt default
          ...baseOptions,
          text: finalRawText,
          bold: isBold || baseOptions.bold,
          italic: isItalic || baseOptions.italic,
        })
      );
    }
  }
  return runs;
}

export async function generateDOCX(resumeText: string, watermarked = false): Promise<Buffer> {
  try {
    logger.info(`Initializing DOCX generation with custom parsing (watermarked=${watermarked})...`);
    const lines = resumeText.split(/\r?\n/).map(line => line.trim());
    const children: Paragraph[] = [];

    if (watermarked) {
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: "FASTHIRE AI - FREE TIER WATERMARK (UPGRADE TO PRO TO REMOVE)",
              font: "Times New Roman",
              size: 20,
              bold: true,
              color: "FF0000"
            })
          ],
          spacing: { after: 120 }
        })
      );
    }

    let name = "";
    let headerEnded = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // 1. Empty line
      if (!line) {
        children.push(
          new Paragraph({
            spacing: { after: 60 }
          })
        );
        continue;
      }

      // Check if this line or next line indicates a header section
      const isDivider = /^[=\-\*_]{3,}$/.test(line);
      const nextLine = (i + 1 < lines.length) ? lines[i + 1].trim() : "";
      const isSetextHeader = nextLine && /^[=\-\*_]{3,}$/.test(nextLine);
      const isMarkdownHeader = line.startsWith("## ");
      const isAllCapsHeader = line.toUpperCase() === line && line.length > 3 && !/^[•\-*\u2022]/.test(line) && !/^\d+\.?$/.test(line);
      const isHeader = isMarkdownHeader || isAllCapsHeader || isSetextHeader;

      if (isHeader || isDivider) {
        headerEnded = true;
      }

      if (isDivider) {
        // Skip Setext divider line
        continue;
      }

      // 2. Centered header lines (Name & contact info)
      if (!headerEnded) {
        if (!name) {
          name = line.replace(/^[#\s\-\*\_]+|[\#\s\-\*\_]+$/g, "").trim();
          children.push(
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: name,
                  font: "Times New Roman",
                  size: 36, // 18pt
                  bold: true
                })
              ],
              spacing: { after: 60 }
            })
          );
        } else {
          // Keep the vertical pipe symbols
          let contactLine = line;
          children.push(
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: contactLine,
                  font: "Times New Roman",
                  size: 20, // 10pt
                  color: "222222"
                })
              ],
              spacing: { after: 40 }
            })
          );
        }
        continue;
      }

      // 3. Detect column alignment lines with 3 or more spaces
      const columns = line.split(/\s{3,}/);
      if (columns.length > 1) {
        const leftText = columns[0];
        const rightText = columns[1];
        
        children.push(
          new Paragraph({
            tabStops: [
              {
                type: "right", // Right tab-stop type
                position: 9360, // Align at right margin (6.5 inches printable width * 1440 dxa/inch)
              },
            ],
            children: [
              ...parseTextRuns(leftText),
              new TextRun({ text: "\t" }), // Tab key advances tab-stop
              ...parseTextRuns(rightText),
            ],
            spacing: { after: 60 },
          })
        );
        continue;
      }

      // 4. Bullet points: starting with •, -, *
      if (/^[•\-*\u2022]/.test(line)) {
        const cleanBulletText = line.replace(/^[•\-*\u2022]\s*/, "");
        children.push(
          new Paragraph({
            bullet: {
              level: 0
            },
            children: parseTextRuns(cleanBulletText),
            spacing: { after: 40 }
          })
        );
        continue;
      }

      // 5. Section headers
      if (isHeader) {
        let cleanHeader = line;
        if (isMarkdownHeader) {
          cleanHeader = line.substring(3).trim();
        } else if (line.endsWith(":")) {
          cleanHeader = line.slice(0, -1);
        }
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: cleanHeader,
                font: "Times New Roman",
                size: 22, // 11pt
                bold: true
              })
            ],
            border: {
              bottom: {
                color: "000000",
                space: 4,
                style: BorderStyle.SINGLE,
                size: 6 // 0.75pt border
              }
            },
            spacing: { before: 200, after: 60 }
          })
        );
        if (isSetextHeader) {
          i++; // Skip the underline divider line
        }
        continue;
      }

      // 6. Normal paragraph
      children.push(
        new Paragraph({
          children: parseTextRuns(line),
          spacing: { after: 100 }
        })
      );
    }

    // Set default styles for Times New Roman 11pt
    const doc = new Document({
      styles: {
        default: {
          document: {
            run: {
              font: "Times New Roman",
              size: 22
            }
          }
        }
      },
      sections: [
        {
          properties: {},
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
