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

  const SECTION_KEYWORDS = [
    "professional summary", "summary", "education", "experience", "work experience",
    "projects", "skills", "technical skills", "certifications", "achievements",
    "languages", "interests", "volunteer", "publications", "awards", "internship"
  ];

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
      (line.includes('|') && line.length < 120 && (line.toLowerCase().includes('india') || line.toLowerCase().includes('usa') || line.toLowerCase().includes('http')))
    ) {
      blocks.push({ type: 'contact', text: line });
      continue;
    }

    // Section header — Title Case or ALL CAPS matching known sections
    const isSectionHeader = SECTION_KEYWORDS.includes(line.toLowerCase()) ||
      (line === line.toUpperCase() && line.length > 2 && line.length < 50 && !/^\d/.test(line));

    if (isSectionHeader) {
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
    fontFamily: 'Times-Roman',
    fontSize: 10,
    paddingTop: 36,
    paddingBottom: 36,
    paddingHorizontal: 40,
    color: '#000000',
    lineHeight: 1.3,
  },
  name: {
    fontSize: 18,
    fontFamily: 'Times-Bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  contact: {
    fontSize: 9.5,
    textAlign: 'center',
    color: '#444444',
    marginBottom: 10,
  },
  section: {
    fontSize: 12,
    fontFamily: 'Times-Bold',
    borderBottomWidth: 0.5,
    borderBottomColor: '#000000',
    borderBottomStyle: 'solid',
    paddingBottom: 2,
    marginTop: 10,
    marginBottom: 4,
  },
  jobTitle: {
    fontSize: 10.5,
    fontFamily: 'Times-Bold',
    marginBottom: 1,
  },
  dateLocation: {
    fontSize: 9.5,
    color: '#333333',
    marginBottom: 4,
  },
  bulletRow: {
    flexDirection: 'row',
    marginBottom: 2,
    paddingLeft: 8,
  },
  bulletDot: {
    width: 12,
    fontSize: 10,
    fontFamily: 'Times-Roman',
  },
  bulletText: {
    flex: 1,
    fontSize: 10,
    lineHeight: 1.3,
    fontFamily: 'Times-Roman',
  },
  normal: {
    fontSize: 10,
    marginBottom: 2,
    lineHeight: 1.3,
    fontFamily: 'Times-Roman',
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
    fontFamily: "Times-Bold",
    color: "#e0e0e0",
    textAlign: "center",
    transform: "rotate(-30deg)",
    opacity: 0.7,
  },
  flexRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  jobTitleLeft: {
    fontSize: 10.5,
    fontFamily: 'Times-Bold',
  },
  jobTitleRight: {
    fontSize: 10,
    fontFamily: 'Times-Roman',
  },
  dateLocationLeft: {
    fontSize: 9.5,
    color: '#333333',
    fontFamily: 'Times-Roman',
  },
  dateLocationRight: {
    fontSize: 9.5,
    color: '#333333',
    fontFamily: 'Times-Roman',
  },
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
              if (block.text.includes('|')) {
                const parts = block.text.split('|').map(p => p.trim());
                const left = parts.slice(0, -1).join(" | ");
                const right = parts[parts.length - 1];
                return (
                  <View key={i} style={styles.flexRow}>
                    <Text style={styles.jobTitleLeft}>{left}</Text>
                    <Text style={styles.jobTitleRight}>{right}</Text>
                  </View>
                );
              }
              return (
                <Text key={i} style={styles.jobTitle}>
                  {block.text}
                </Text>
              );
            case 'dateLocation':
              if (block.text.includes('|')) {
                const parts = block.text.split('|').map(p => p.trim());
                const left = parts.slice(0, -1).join(" | ");
                const right = parts[parts.length - 1];
                return (
                  <View key={i} style={styles.flexRow}>
                    <Text style={styles.dateLocationLeft}>{left}</Text>
                    <Text style={styles.dateLocationRight}>{right}</Text>
                  </View>
                );
              }
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
              if (block.text.includes('|') && block.text.length < 150) {
                const parts = block.text.split('|').map(p => p.trim());
                const left = parts.slice(0, -1).join(" | ");
                const right = parts[parts.length - 1];
                return (
                  <View key={i} style={styles.flexRow}>
                    <Text style={styles.dateLocationLeft}>{left}</Text>
                    <Text style={styles.dateLocationRight}>{right}</Text>
                  </View>
                );
              }
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
