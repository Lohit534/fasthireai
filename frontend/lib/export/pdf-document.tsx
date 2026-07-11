import React from "react";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { logger } from "../logger";
import { sanitizeResumeText } from "../ai/router";

// Helper to strip markdown bold/italic tags
function cleanMarkdown(s: string): string {
  return s
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/`/g, "")
    .trim();
}

interface PDFLineNode {
  type: "name" | "contact" | "header" | "experience_title" | "experience_subtitle" | "bullet" | "body" | "spacer";
  text: string;
}

export function parseResumeToNodes(text: string): PDFLineNode[] {
  const sanitized = sanitizeResumeText(text);
  const rawLines = sanitized.split(/\r?\n/);
  const nodes: PDFLineNode[] = [];
  let nameFound = false;

  // Phone regex matching format
  const phonePattern = /\b(?:\+?\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/;

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i].trim();

    if (line === "") {
      nodes.push({ type: "spacer", text: "" });
      continue;
    }

    // 1. Detect Name (First non-empty line)
    if (!nameFound) {
      nodes.push({ type: "name", text: cleanMarkdown(line) });
      nameFound = true;
      continue;
    }

    // 2. Detect Contact
    const containsAt = line.includes("@");
    const containsPhone = phonePattern.test(line);
    const containsPipe = line.includes("|");

    if (containsAt || containsPhone || containsPipe) {
      if (containsPipe) {
        const parts = line.split("|").map(p => cleanMarkdown(p)).filter(Boolean);
        nodes.push({ type: "contact", text: parts.join("  |  ") });
      } else {
        nodes.push({ type: "contact", text: cleanMarkdown(line) });
      }
      continue;
    }

    // 3. Detect Section Header (ALL CAPS, length > 3, contains letters, no bullet markers)
    const isBulletMarker = /^[•\-\*\–\u2022]/.test(line);
    const hasLetters = /[A-Za-z]/.test(line);
    const isAllCaps = line === line.toUpperCase() && line.length > 3 && hasLetters && !isBulletMarker;

    if (isAllCaps) {
      nodes.push({ type: "header", text: cleanMarkdown(line) });
      continue;
    }

    // 4. Detect Bullet Point
    if (isBulletMarker) {
      const cleanBullet = cleanMarkdown(line.replace(/^[•\-\*\–\u2022\s]+/, ""));
      nodes.push({ type: "bullet", text: cleanBullet });
      continue;
    }

    // 5. Multi-line bullet continuation check
    const lastNode = nodes[nodes.length - 1];
    if (lastNode && lastNode.type === "bullet") {
      lastNode.text += " " + cleanMarkdown(line);
      continue;
    }

    // 6. Experience Block Detection
    if (line.includes("|")) {
      const parts = line.split("|").map(p => cleanMarkdown(p)).filter(Boolean);
      nodes.push({ type: "experience_title", text: parts.join(" | ") });
      
      let nextLineIndex = i + 1;
      while (nextLineIndex < rawLines.length && rawLines[nextLineIndex].trim() === "") {
        nextLineIndex++;
      }
      if (nextLineIndex < rawLines.length) {
        const nextLine = rawLines[nextLineIndex].trim();
        if (nextLine.includes("|") && !nextLine.includes("@") && !phonePattern.test(nextLine)) {
          const subParts = nextLine.split("|").map(p => cleanMarkdown(p)).filter(Boolean);
          nodes.push({ type: "experience_subtitle", text: subParts.join(" | ") });
          i = nextLineIndex;
          continue;
        }
      }
      continue;
    }

    // Default fallback: render as normal text paragraph
    nodes.push({ type: "body", text: cleanMarkdown(line) });
  }

  return nodes;
}

// React PDF StyleSheet meeting exact specifications
const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 36,
    paddingLeft: 40,
    paddingRight: 40,
    fontFamily: "Helvetica",
    color: "#000000",
  },
  name: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    color: "#000000",
    textAlign: "center",
    marginBottom: 4,
    lineHeight: 1.4,
  },
  contact: {
    fontSize: 9.5,
    color: "#444444",
    textAlign: "center",
    marginBottom: 12,
    lineHeight: 1.4,
  },
  header: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    borderBottomWidth: 0.75,
    borderBottomColor: "#000000",
    marginTop: 12,
    marginBottom: 5,
    paddingBottom: 2,
    lineHeight: 1.4,
  },
  experienceTitle: {
    fontSize: 10.5,
    fontFamily: "Helvetica-Bold",
    color: "#000000",
    marginBottom: 1,
    lineHeight: 1.4,
  },
  experienceSubtitle: {
    fontSize: 10,
    color: "#555555",
    marginBottom: 3,
    lineHeight: 1.4,
  },
  bulletRow: {
    flexDirection: "row",
    marginBottom: 2.5,
    paddingLeft: 12,
  },
  bulletPrefix: {
    width: 10,
    fontSize: 10,
    lineHeight: 1.4,
  },
  bulletText: {
    flex: 1,
    fontSize: 10,
    lineHeight: 1.4,
  },
  bodyText: {
    fontSize: 10,
    color: "#000000",
    marginBottom: 3,
    lineHeight: 1.4,
  },
  spacer: {
    height: 4,
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

interface ResumePDFProps {
  text: string;
  watermarked?: boolean;
}

const ResumePDFDocument: React.FC<ResumePDFProps> = ({ text, watermarked }) => {
  const nodes = parseResumeToNodes(text);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {watermarked && (
          <Text style={styles.watermark}>FASTHIRE AI - FREE TIER WATERMARK</Text>
        )}
        {nodes.map((node, idx) => {
          switch (node.type) {
            case "name":
              return (
                <Text key={idx} style={styles.name}>
                  {node.text}
                </Text>
              );
            case "contact":
              return (
                <Text key={idx} style={styles.contact}>
                  {node.text}
                </Text>
              );
            case "header":
              return (
                <Text key={idx} style={styles.header}>
                  {node.text}
                </Text>
              );
            case "experience_title":
              return (
                <Text key={idx} style={styles.experienceTitle}>
                  {node.text}
                </Text>
              );
            case "experience_subtitle":
              return (
                <Text key={idx} style={styles.experienceSubtitle}>
                  {node.text}
                </Text>
              );
            case "bullet":
              return (
                <View key={idx} style={styles.bulletRow} wrap={false}>
                  <Text style={styles.bulletPrefix}>•</Text>
                  <Text style={styles.bulletText}>{node.text}</Text>
                </View>
              );
            case "spacer":
              return <View key={idx} style={styles.spacer} />;
            default:
              return (
                <Text key={idx} style={styles.bodyText}>
                  {node.text}
                </Text>
              );
          }
        })}
      </Page>
    </Document>
  );
};

export async function generatePDF(resumeText: string, watermarked = false): Promise<Buffer> {
  try {
    logger.info(`Generating react-pdf document (watermarked=${watermarked})...`);
    
    const element = React.createElement(ResumePDFDocument, {
      text: resumeText,
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
