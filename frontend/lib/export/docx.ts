import { Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle } from "docx";
import { logger } from "../logger";

export async function generateDOCX(resumeText: string): Promise<Buffer> {
  try {
    logger.info("Initializing DOCX generation with custom parsing...");
    const lines = resumeText.split(/\r?\n/).map(line => line.trim());
    const children: Paragraph[] = [];
    
    let name = "";
    let contact = "";

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

      // 2. First non-empty line: Name
      if (!name) {
        name = line;
        children.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: line,
                font: "Calibri",
                size: 36, // 18pt in half-points
                bold: true
              })
            ],
            spacing: { after: 60 }
          })
        );
        continue;
      }

      // 3. Contact info: lines with @ or phone pattern
      if (!contact && (line.includes("@") || /\b\d{10}\b|\+\d{2}/.test(line))) {
        contact = line;
        children.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: line,
                font: "Calibri",
                size: 20, // 10pt in half-points
                color: "666666"
              })
            ],
            spacing: { after: 60 }
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
            children: [
              new TextRun({
                text: cleanBulletText,
                font: "Calibri",
                size: 22 // 11pt in half-points
              })
            ],
            spacing: { after: 40 }
          })
        );
        continue;
      }

      // 5. ALL CAPS header (length > 3) or ending with ":"
      const isHeader = (line.toUpperCase() === line && line.length > 3) || line.endsWith(":");
      if (isHeader) {
        const cleanHeader = line.endsWith(":") ? line.slice(0, -1) : line;
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: cleanHeader,
                font: "Calibri",
                size: 24, // 12pt in half-points
                bold: true,
                allCaps: true
              })
            ],
            border: {
              bottom: {
                color: "000000",
                space: 4,
                style: BorderStyle.SINGLE,
                size: 6 // 6 eighths of a pt = 0.75pt border
              }
            },
            spacing: { before: 200, after: 60 }
          })
        );
        continue;
      }

      // 6. Normal paragraph
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: line,
              font: "Calibri",
              size: 22 // 11pt in half-points
            })
          ],
          spacing: { after: 100 }
        })
      );
    }

    // Set default styles for Calibri 11pt, matching request
    const doc = new Document({
      styles: {
        default: {
          document: {
            run: {
              font: "Calibri",
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
