import React from "react";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { logger } from "../logger";
import { sanitizeResumeText } from "../ai/router";

export function preprocessResumeText(text: string): string {
  const sanitized = sanitizeResumeText(text);
  return sanitized
    // Force section headers to new lines
    .replace(/(PROFESSIONAL SUMMARY|SUMMARY|EDUCATION|EXPERIENCE|PROJECTS|SKILLS|TECHNICAL SKILLS|CERTIFICATIONS|ACHIEVEMENTS|LANGUAGES|INTERESTS|VOLUNTEER|PUBLICATIONS|AWARDS)/gi, '\n\n$1\n')
    // Split contact info by | onto same line but separated
    .replace(/\|/g, ' | ')
    // Force bullet points to new lines
    .replace(/•/g, '\n•')
    .replace(/·/g, '\n•')
    // Split lines that have CAPS WORD immediately after lowercase
    // e.g. "environment.EDUCATIONBTech" → split at CAPS
    .replace(/([a-z\.\,\)])([A-Z]{2,})/g, '$1\n\n$2')
    // Split when year pattern appears mid-sentence
    .replace(/(\d{4})\s*([A-Z][a-z])/g, '$1\n$2')
    // Remove multiple spaces
    .replace(/  +/g, ' ')
    // Remove more than 2 consecutive newlines
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export type ResumeBlock = 
  | { type: 'name'; text: string }
  | { type: 'contact'; text: string }
  | { type: 'section'; text: string }
  | { type: 'bullet'; text: string }
  | { type: 'jobTitle'; text: string }
  | { type: 'dateLocation'; text: string }
  | { type: 'normal'; text: string }
  | { type: 'spacer' }

export function parseResumeIntoBlocks(raw: string): ResumeBlock[] {
  const text = preprocessResumeText(raw);
  const lines = text.split('\n');
  const blocks: ResumeBlock[] = [];
  let isFirstLine = true;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      blocks.push({ type: 'spacer' });
      continue;
    }

    // First non-empty line = name
    if (isFirstLine) {
      blocks.push({ type: 'name', text: line });
      isFirstLine = false;
      continue;
    }

    // Contact line — contains @ or phone or LinkedIn or GitHub
    if (
      line.includes('@') ||
      /\+?\d[\d\s\-\(\)]{7,}/.test(line) ||
      line.toLowerCase().includes('linkedin') ||
      line.toLowerCase().includes('github') ||
      (line.includes('|') && line.length < 120)
    ) {
      blocks.push({ type: 'contact', text: line });
      continue;
    }

    // Section header — ALL CAPS, no punctuation, short
    const isAllCaps = line === line.toUpperCase() && 
      line.length > 2 && 
      line.length < 50 &&
      !/^\d/.test(line);
    if (isAllCaps) {
      blocks.push({ type: 'section', text: line });
      continue;
    }

    // Bullet point
    if (/^[•\-\*–]\s/.test(line)) {
      blocks.push({ 
        type: 'bullet', 
        text: line.replace(/^[•\-\*–]\s*/, '').trim() 
      });
      continue;
    }

    // Date/location line — contains year range or "Present"
    if (
      /\d{4}\s*[–\-]\s*(\d{4}|Present|Current)/i.test(line) ||
      /Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/i.test(line)
    ) {
      blocks.push({ type: 'dateLocation', text: line });
      continue;
    }

    // Job title line — contains | between role and company
    if (line.includes('|') && line.length < 100) {
      blocks.push({ type: 'jobTitle', text: line });
      continue;
    }

    // Everything else = normal text
    blocks.push({ type: 'normal', text: line });
  }

  return blocks;
}

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    paddingTop: 36,
    paddingBottom: 48,
    paddingHorizontal: 42,
    color: '#000000',
    lineHeight: 1.4,
  },
  name: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  contact: {
    fontSize: 9.5,
    textAlign: 'center',
    color: '#444444',
    marginBottom: 12,
  },
  section: {
    fontSize: 10.5,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    borderBottomWidth: 0.75,
    borderBottomColor: '#000000',
    borderBottomStyle: 'solid',
    paddingBottom: 2,
    marginTop: 12,
    marginBottom: 5,
  },
  jobTitle: {
    fontSize: 10.5,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 1,
  },
  dateLocation: {
    fontSize: 9.5,
    color: '#555555',
    marginBottom: 4,
  },
  bulletRow: {
    flexDirection: 'row',
    marginBottom: 3,
    paddingLeft: 8,
  },
  bulletDot: {
    width: 12,
    fontSize: 10,
  },
  bulletText: {
    flex: 1,
    fontSize: 10,
    lineHeight: 1.4,
  },
  normal: {
    fontSize: 10,
    marginBottom: 3,
    lineHeight: 1.4,
  },
  spacer: {
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

interface ResumePDFProps {
  text: string;
  watermarked?: boolean;
}

const ResumePDFDocument: React.FC<ResumePDFProps> = ({ text, watermarked }) => {
  const blocks = parseResumeIntoBlocks(text);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {watermarked && (
          <Text style={styles.watermark}>FASTHIRE AI - FREE TIER WATERMARK</Text>
        )}
        {blocks.map((block, i) => {
          switch (block.type) {
            case 'name':
              return (
                <Text key={i} style={styles.name}>
                  {block.text}
                </Text>
              );
            case 'contact':
              return (
                <Text key={i} style={styles.contact}>
                  {block.text}
                </Text>
              );
            case 'section':
              return (
                <Text key={i} style={styles.section}>
                  {block.text}
                </Text>
              );
            case 'jobTitle':
              return (
                <Text key={i} style={styles.jobTitle}>
                  {block.text}
                </Text>
              );
            case 'dateLocation':
              return (
                <Text key={i} style={styles.dateLocation}>
                  {block.text}
                </Text>
              );
            case 'bullet':
              return (
                <View key={i} style={styles.bulletRow} wrap={false}>
                  <Text style={styles.bulletDot}>•</Text>
                  <Text style={styles.bulletText}>
                    {block.text}
                  </Text>
                </View>
              );
            case 'normal':
              return (
                <Text key={i} style={styles.normal}>
                  {block.text}
                </Text>
              );
            case 'spacer':
              return <View key={i} style={styles.spacer} />;
            default:
              return null;
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
