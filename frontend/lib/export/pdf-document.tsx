import React from "react";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { logger } from "../logger";

// Helper to strip markdown bold/italic tags
function cleanMarkdown(s: string): string {
  return s
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/`/g, "")
    .trim();
}

interface ParsedSection {
  title: string;
  items: Array<{
    type: "bullet" | "body";
    text: string;
  }>;
}

export function parseResumeToSections(text: string) {
  const lines = text.split(/\r?\n/).map(l => l.trim());
  let name = "";
  const rawContactLines: string[] = [];
  const sections: ParsedSection[] = [];
  let currentSection: ParsedSection | null = null;
  let headerEnded = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    // Detect divider lines
    if (/^[=\-\*_]{3,}$/.test(line)) {
      continue;
    }

    const isAllCaps = line === line.toUpperCase() && line.length > 3 && /[A-Z]/.test(line) && !/^[•\-*\u2022]/.test(line) && !/^\d/.test(line);

    if (!headerEnded) {
      if (isAllCaps || line.startsWith("#")) {
        headerEnded = true;
      } else if (!name) {
        name = cleanMarkdown(line.replace(/^[#\s\-\*\_]+|[\#\s\-\*\_]+$/g, ""));
        continue;
      } else {
        rawContactLines.push(line);
        continue;
      }
    }

    if (isAllCaps || line.startsWith("#")) {
      const title = cleanMarkdown(line.replace(/^#+\s*/, "").replace(/:$/, ""));
      currentSection = { title: title.toUpperCase(), items: [] };
      sections.push(currentSection);
    } else {
      const isBullet = /^[•\-*\u2022]/.test(line);
      const cleanText = cleanMarkdown(line.replace(/^[•\-*\u2022\s]+/, ""));
      if (!cleanText) continue;

      const item = {
        type: (isBullet ? "bullet" : "body") as "bullet" | "body",
        text: cleanText
      };

      if (!currentSection) {
        currentSection = { title: "SUMMARY", items: [] };
        sections.push(currentSection);
      }
      currentSection.items.push(item);
    }
  }

  // Flatten contact info and remove duplicate pipe separators
  const contactLines: string[] = [];
  rawContactLines.forEach(line => {
    const parts = line.split("|").map(p => cleanMarkdown(p)).filter(Boolean);
    contactLines.push(...parts);
  });

  if (!name) {
    name = "Resume Document";
  }

  return { name, contactLines, sections };
}

// React PDF StyleSheet meeting exact specifications
const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 40,
    paddingLeft: 30,
    paddingRight: 30,
    fontFamily: "Helvetica",
    fontSize: 11,
    color: "#000000",
    lineHeight: 1.3,
  },
  headerContainer: {
    marginBottom: 12,
    alignItems: "center",
  },
  name: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
    textAlign: "center",
  },
  contact: {
    fontSize: 10,
    color: "#555555",
    textAlign: "center",
  },
  sectionContainer: {
    marginBottom: 10,
  },
  sectionHeader: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    borderBottomWidth: 1,
    borderBottomColor: "#000000",
    marginTop: 8,
    marginBottom: 8,
    paddingBottom: 2,
  },
  itemRow: {
    flexDirection: "row",
    marginBottom: 4, // 4pt spacing between bullets
    paddingLeft: 8,
  },
  bulletPrefix: {
    width: 12,
    fontSize: 10,
  },
  bulletText: {
    flex: 1,
    fontSize: 10,
  },
  bodyText: {
    fontSize: 11,
    marginBottom: 4,
  },
  watermark: {
    position: "absolute",
    top: "40%",
    left: "10%",
    width: "80%",
    fontSize: 32,
    fontFamily: "Helvetica-Bold",
    color: "#e0e0e0",
    textAlign: "center",
    transform: "rotate(-30deg)",
    opacity: 0.7,
  }
});

interface ResumeProps {
  name: string;
  contactLines: string[];
  sections: Array<{
    title: string;
    items: Array<{
      type: "bullet" | "body";
      text: string;
    }>;
  }>;
  watermarked?: boolean;
}

const ResumePDFDocument: React.FC<ResumeProps> = ({ name, contactLines, sections, watermarked }) => {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {watermarked && (
          <Text style={styles.watermark}>FASTHIRE AI - FREE TIER WATERMARK</Text>
        )}
        <View style={styles.headerContainer}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.contact}>{contactLines.join(" | ")}</Text>
        </View>
        
        {sections.map((section, sIdx) => (
          <View key={sIdx} style={styles.sectionContainer} wrap={false}>
            <Text style={styles.sectionHeader}>{section.title}</Text>
            {section.items.map((item, iIdx) => {
              if (item.type === "bullet") {
                return (
                  <View key={iIdx} style={styles.itemRow}>
                    <Text style={styles.bulletPrefix}>•</Text>
                    <Text style={styles.bulletText}>{item.text}</Text>
                  </View>
                );
              } else {
                return (
                  <Text key={iIdx} style={styles.bodyText}>{item.text}</Text>
                );
              }
            })}
          </View>
        ))}
      </Page>
    </Document>
  );
};

export async function generatePDF(resumeText: string, watermarked = false): Promise<Buffer> {
  try {
    logger.info(`Generating react-pdf document (watermarked=${watermarked})...`);
    const { name, contactLines, sections } = parseResumeToSections(resumeText);
    
    const element = React.createElement(ResumePDFDocument, {
      name,
      contactLines,
      sections,
      watermarked
    });
    
    const buffer = await renderToBuffer(element as any);
    logger.info(`PDF generated successfully via react-pdf: ${buffer.length} bytes`);
    return buffer;
  } catch (err: any) {
    logger.error("react-pdf generation failed:", err.message);
    throw new Error("PDF generation failed: " + err.message);
  }
}
