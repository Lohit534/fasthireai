import React from "react";
import { Font, Document, Page, Text, View, Link, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { logger } from "../logger";

// Register Times New Roman natively supported aliases
Font.registerHyphenationCallback(word => [word]);

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Times-Roman',
    fontSize: 10.5,
    paddingTop: 48,
    paddingBottom: 48,
    paddingHorizontal: 54,
    color: '#000000',
    lineHeight: 1.35,
    backgroundColor: '#FFFFFF',
  },

  // ── NAME ──
  name: {
    fontFamily: 'Times-Bold',
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 3,
    letterSpacing: 0.5,
  },

  // ── CONTACT LINE ──
  contactRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginBottom: 8,
    fontSize: 10,
  },
  contactText: {
    fontFamily: 'Times-Roman',
    fontSize: 10,
    color: '#000000',
  },
  contactSeparator: {
    fontFamily: 'Times-Roman',
    fontSize: 10,
    marginHorizontal: 5,
    color: '#000000',
  },
  contactLink: {
    fontFamily: 'Times-Roman',
    fontSize: 10,
    color: '#0000EE',
    textDecoration: 'underline',
  },

  // ── SECTION HEADER ──
  sectionHeader: {
    fontFamily: 'Times-Bold',
    fontSize: 11.5,
    marginTop: 12,
    marginBottom: 4,
    paddingBottom: 1,
    borderBottomWidth: 0.75,
    borderBottomColor: '#000000',
    borderBottomStyle: 'solid',
    textTransform: 'none',
  },

  // ── PROFESSIONAL SUMMARY ──
  summaryText: {
    fontFamily: 'Times-Roman',
    fontSize: 10.5,
    lineHeight: 1.4,
    marginBottom: 4,
    textAlign: 'justify',
  },

  // ── SKILLS ──
  skillRow: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  skillLabel: {
    fontFamily: 'Times-Bold',
    fontSize: 10.5,
    width: 140,
  },
  skillValue: {
    fontFamily: 'Times-Roman',
    fontSize: 10.5,
    flex: 1,
  },

  // ── PROJECT TITLE ──
  projectTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 5,
    marginBottom: 2,
  },
  projectTitleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  projectTitle: {
    fontFamily: 'Times-Bold',
    fontSize: 10.5,
  },
  projectLink: {
    fontFamily: 'Times-Roman',
    fontSize: 9.5,
    color: '#0000EE',
    textDecoration: 'underline',
    marginLeft: 6,
  },
  projectTech: {
    fontFamily: 'Times-Italic',
    fontSize: 10,
    color: '#333333',
    marginLeft: 8,
    textAlign: 'right',
  },

  // ── EXPERIENCE / INTERNSHIP ──
  jobTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 5,
    marginBottom: 1,
  },
  jobTitle: {
    fontFamily: 'Times-Bold',
    fontSize: 10.5,
    flex: 1,
  },
  jobDates: {
    fontFamily: 'Times-Roman',
    fontSize: 10,
    color: '#000000',
    textAlign: 'right',
  },
  jobCompany: {
    fontFamily: 'Times-Italic',
    fontSize: 10.5,
    marginBottom: 3,
  },

  // ── EDUCATION ──
  educationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 4,
    marginBottom: 1,
  },
  educationDegree: {
    fontFamily: 'Times-Bold',
    fontSize: 10.5,
    flex: 1,
  },
  educationDates: {
    fontFamily: 'Times-Roman',
    fontSize: 10,
    textAlign: 'right',
    minWidth: 80,
  },
  educationInstitution: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  educationSchool: {
    fontFamily: 'Times-Roman',
    fontSize: 10.5,
    color: '#000000',
    flex: 1,
  },
  educationGPA: {
    fontFamily: 'Times-Roman',
    fontSize: 10,
    textAlign: 'right',
    minWidth: 80,
  },

  // ── BULLET POINTS ──
  bulletRow: {
    flexDirection: 'row',
    marginBottom: 2,
    paddingLeft: 12,
  },
  bulletDot: {
    width: 10,
    fontSize: 10.5,
    fontFamily: 'Times-Roman',
  },
  bulletText: {
    flex: 1,
    fontFamily: 'Times-Roman',
    fontSize: 10.5,
    lineHeight: 1.35,
  },

  // ── CERTIFICATIONS / LANGUAGES ──
  certItem: {
    fontFamily: 'Times-Roman',
    fontSize: 10.5,
    marginBottom: 2,
  },

  // ── STANDALONE LINK ──
  link: {
    color: '#0000EE',
    textDecoration: 'underline',
    fontFamily: 'Times-Roman',
    fontSize: 10.5,
    marginBottom: 2,
  },
  spacer: {
    height: 4,
  },
});

const SECTION_NAMES = [
  'PROFESSIONAL SUMMARY', 'SUMMARY', 'OBJECTIVE',
  'TECHNICAL SKILLS', 'SKILLS', 'CORE SKILLS',
  'EXPERIENCE', 'WORK EXPERIENCE', 'INTERNSHIP',
  'PROJECTS', 'PERSONAL PROJECTS', 'EDUCATION',
  'CERTIFICATIONS', 'ACHIEVEMENTS', 'AWARDS',
  'LANGUAGES', 'INTERESTS', 'VOLUNTEER',
  'PUBLICATIONS', 'ACTIVITIES'
];

const URL_REGEX_G = /https?:\/\/[^\s]+|www\.[^\s]+/g;
const URL_REGEX = /https?:\/\/[^\s]+|www\.[^\s]+/i;
const EMAIL_REGEX = /[\w\.-]+@[\w\.-]+\.\w+/i;

export interface ContactSegment {
  text: string;
  url?: string;
  isLink: boolean;
}

export interface SkillLine {
  label: string;
  value: string;
}

export interface ProjectBlock {
  name: string;
  tech?: string;
  projectUrl?: string;
  bullets: string[];
}

export interface JobBlock {
  title: string;
  company: string;
  dates: string;
  bullets: string[];
}

export interface EducationBlock {
  degree: string;
  dates: string;
  school: string;
  gpa: string;
}

export interface StandaloneLink {
  label: string;
  url: string;
}

export type ParsedResumeBlock =
  | { type: 'name'; text: string }
  | { type: 'contact'; segments: ContactSegment[] }
  | { type: 'section'; text: string }
  | { type: 'summary'; text: string }
  | { type: 'skillLine'; label: string; value: string }
  | { type: 'project'; name: string; tech?: string; projectUrl?: string; bullets: string[] }
  | { type: 'job'; title: string; company: string; dates: string; bullets: string[] }
  | { type: 'education'; degree: string; dates: string; school: string; gpa: string }
  | { type: 'bullet'; text: string }
  | { type: 'link'; label: string; url: string }
  | { type: 'cert'; text: string }
  | { type: 'normal'; text: string }
  | { type: 'spacer' };

export type ResumeBlock = ParsedResumeBlock;

function cleanUrl(url: string): string {
  let clean = url.trim();
  // Strip trailing bracket or punctuation if matched lazily
  if (clean.endsWith(')') || clean.endsWith(']') || clean.endsWith(',')) {
    clean = clean.substring(0, clean.length - 1);
  }
  if (!/^https?:\/\//i.test(clean)) {
    clean = 'https://' + clean;
  }
  return clean;
}

export function parseResumeIntoBlocks(text: string): ParsedResumeBlock[] {
  const rawLines = text.split('\n');
  const blocks: ParsedResumeBlock[] = [];
  
  let isFirstLine = true;
  let currentSection = "";
  
  for (let idx = 0; idx < rawLines.length; idx++) {
    const line = rawLines[idx].trim();
    if (!line) {
      blocks.push({ type: 'spacer' });
      continue;
    }

    // 1. First Line Name detection
    if (isFirstLine) {
      blocks.push({ type: 'name', text: line });
      isFirstLine = false;
      continue;
    }

    // 2. Contact row detection
    const isContactLine = 
      line.includes('@') || 
      /\+?\d[\d\s\-\(\)]{7,}/.test(line) ||
      line.toLowerCase().includes('linkedin.com') ||
      line.toLowerCase().includes('github.com');
      
    if (isContactLine && blocks.filter(b => b.type === 'contact').length === 0) {
      // Split header items by | or • or — or – or " - " (but not hyphen in urls)
      const parts = line.split(/\s*(?:[|•\u2022—–]|\s+-\s+)\s*/);
      const segments: ContactSegment[] = [];
      
      parts.forEach(part => {
        const txt = part.trim();
        if (!txt) return;
        
        const emailMatch = txt.match(EMAIL_REGEX);
        const urlMatch = txt.match(URL_REGEX);
        
        if (emailMatch) {
          segments.push({ text: txt, url: `mailto:${emailMatch[0]}`, isLink: true });
        } else if (urlMatch) {
          segments.push({ text: txt, url: cleanUrl(urlMatch[0]), isLink: true });
        } else if (txt.toLowerCase().includes('linkedin.com') || txt.toLowerCase().includes('github.com')) {
          const clean = txt.startsWith('http') ? txt : 'https://' + txt;
          segments.push({ text: txt, url: cleanUrl(clean), isLink: true });
        } else if (txt.toLowerCase().includes('linkedin') || txt.toLowerCase().includes('github')) {
          // If text mentions LinkedIn/GitHub but URL matches are implicit
          const implicitUrl = txt.toLowerCase().includes('linkedin') 
            ? 'https://linkedin.com' 
            : 'https://github.com';
          segments.push({ text: txt, url: implicitUrl, isLink: true });
        } else if (/\+?\d[\d\s\-\(\)]{7,}/.test(txt)) {
          // Phone link
          const cleanPhone = txt.replace(/[^\d\+]/g, '');
          segments.push({ text: txt, url: `tel:${cleanPhone}`, isLink: true });
        } else {
          segments.push({ text: txt, isLink: false });
        }
      });
      
      blocks.push({ type: 'contact', segments });
      continue;
    }

    // 3. Section Header check
    const upperLine = line.toUpperCase().replace(/[^A-Z ]/g, '').trim();
    const isSection = SECTION_NAMES.includes(upperLine);
    if (isSection) {
      currentSection = upperLine;
      // Push original cased section header (e.g. Professional Summary)
      blocks.push({ type: 'section', text: line });
      continue;
    }

    // 4. Section dependent parsing
    if (currentSection === 'PROFESSIONAL SUMMARY' || currentSection === 'SUMMARY' || currentSection === 'OBJECTIVE') {
      blocks.push({ type: 'summary', text: line });
      continue;
    }

    if (currentSection === 'TECHNICAL SKILLS' || currentSection === 'SKILLS' || currentSection === 'CORE SKILLS') {
      if (line.includes(':')) {
        const colonIdx = line.indexOf(':');
        const label = line.substring(0, colonIdx).replace(/^\*\*|\*\*$/g, "").trim();
        const value = line.substring(colonIdx + 1).replace(/^\*\*|\*\*$/g, "").replace(/^[•\-\*–\s\u2022]+/, "").trim();
        blocks.push({ type: 'skillLine', label, value });
      } else {
        const cleanVal = line.replace(/^\*\*|\*\*$/g, "").replace(/^[•\-\*–\s\u2022]+/, "").trim();
        if (cleanVal) {
          blocks.push({ type: 'summary', text: cleanVal });
        }
      }
      continue;
    }

    // Experience entry
    if (currentSection === 'EXPERIENCE' || currentSection === 'WORK EXPERIENCE' || currentSection === 'INTERNSHIP') {
      const isBullet = /^[•\-\*–]\s*/.test(line);
      if (!isBullet) {
        // Might be title/company or date
        const dateMatch = line.match(/\b\d{4}\b/);
        const hasDatePattern = dateMatch && (line.toLowerCase().includes('present') || line.toLowerCase().includes('current') || line.includes('–') || line.includes('-'));
        
        if (hasDatePattern) {
          // If this is date range line, update the last job dates
          const lastBlock = blocks[blocks.length - 1];
          if (lastBlock && lastBlock.type === 'job') {
            lastBlock.dates = line;
          } else {
            blocks.push({ type: 'bullet', text: line });
          }
        } else {
          // Format: Role | Company or Role – Company
          const parts = line.split(/\s*(?:[|—–]|\s+-\s+)\s*/);
          const title = parts[0]?.replace(/^[\*\_]+|[\*\_]+$/g, "").trim() || "Title";
          const company = parts[1]?.replace(/^[\*\_]+|[\*\_]+$/g, "").trim() || "";
          
          // Peek next line to see if it is a date range
          let dates = "";
          if (idx + 1 < rawLines.length) {
            const nextLine = rawLines[idx + 1].trim();
            const nextDateMatch = nextLine.match(/\b\d{4}\b/);
            if (nextDateMatch && (nextLine.toLowerCase().includes('present') || nextLine.toLowerCase().includes('current') || nextLine.includes('–') || nextLine.includes('-'))) {
              dates = nextLine;
              idx++; // consume date line
            }
          }
          
          blocks.push({
            type: 'job',
            title,
            company,
            dates: dates.replace(/^[\*\_]+|[\*\_]+$/g, "").trim(),
            bullets: []
          });
        }
      } else {
        // Bullet point, append to current experience
        const cleanBulletText = line.replace(/^[•\-\*–]\s*/, '').trim();
        
        // Find last experience block
        let lastJobIdx = -1;
        for (let i = blocks.length - 1; i >= 0; i--) {
          if (blocks[i].type === 'job') {
            lastJobIdx = i;
            break;
          }
        }
        if (lastJobIdx !== -1) {
          const job = blocks[lastJobIdx];
          if (job.type === 'job') {
            job.bullets.push(cleanBulletText);
          }
        } else {
          blocks.push({ type: 'bullet', text: cleanBulletText });
        }
      }
      continue;
    }

    // Projects block
    if (currentSection === 'PROJECTS' || currentSection === 'PERSONAL PROJECTS') {
      const isBullet = /^[•\-\*–]\s*/.test(line);
      if (!isBullet) {
        // Format: Project Name — Tech Stack or Project Name | Tech
        const parts = line.split(/\s*(?:[|—–]|\s+-\s+)\s*/);
        const name = parts[0]?.replace(/^[\*\_]+|[\*\_]+$/g, "").trim() || "Project";
        const tech = parts[1]?.replace(/^[\*\_]+|[\*\_]+$/g, "").trim() || "";
        
        // Find URLs in project line
        let projectUrl: string | undefined;
        const urlMatches = line.match(URL_REGEX);
        if (urlMatches && urlMatches.length > 0) {
          projectUrl = cleanUrl(urlMatches[0]);
        }
        
        blocks.push({
          type: 'project',
          name,
          tech,
          projectUrl,
          bullets: []
        });
      } else {
        const cleanBulletText = line.replace(/^[•\-\*–]\s*/, '').trim();
        
        let lastProjIdx = -1;
        for (let i = blocks.length - 1; i >= 0; i--) {
          if (blocks[i].type === 'project') {
            lastProjIdx = i;
            break;
          }
        }
        if (lastProjIdx !== -1) {
          const proj = blocks[lastProjIdx];
          if (proj.type === 'project') {
            proj.bullets.push(cleanBulletText);
          }
        } else {
          blocks.push({ type: 'bullet', text: cleanBulletText });
        }
      }
      continue;
    }

    // Education block
    if (currentSection === 'EDUCATION') {
      const lowerLine = line.toLowerCase();
      const DEGREE_KEYWORDS = [
        'b.tech', 'btech', 'intermediate', 'ssc', 'b.s.', 'bs', 'bachelor', 'master', 
        'm.tech', 'mtech', 'ph.d', 'phd', 'class xii', 'class x', 'diploma', 'matriculation', 
        'secondary', 'hsc', 'cbse', 'board', 'high school'
      ];
      
      let lastEdu: EducationBlock | undefined;
      for (let i = blocks.length - 1; i >= 0; i--) {
        if (blocks[i].type === 'education') {
          lastEdu = blocks[i] as EducationBlock;
          break;
        }
      }

      const isNewEntry = (DEGREE_KEYWORDS.some(kw => lowerLine.includes(kw)) || 
                          lowerLine.startsWith('b.') || lowerLine.startsWith('m.') ||
                          !lastEdu) && (!lastEdu || lastEdu.school !== "");
      
      const dateRangeRegex = /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|20\d{2})\b[\s\-\–]+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|20\d{2}|Present)\b/i;
      const singleDateRegex = /\b(20\d{2})\b/;
      const gpaRegex = /(GPA|CGPA|%)\s*:?\s*([\d\.\%]+)/i;
      
      let cleanText = line.replace(/^\*\*|\*\*$/g, "").trim();
      let dates = "";
      let gpa = "";
      
      const dateMatch = line.match(dateRangeRegex);
      if (dateMatch) {
        dates = dateMatch[0];
        cleanText = cleanText.replace(dateMatch[0], "").trim();
      } else {
        const singleMatch = line.match(singleDateRegex);
        if (singleMatch && (line.includes('-') || line.includes('–') || line.toLowerCase().includes('present'))) {
          const approxDateMatch = line.match(/(\b(20\d{2})\b.*?(\b(20\d{2})\b|Present))/i);
          if (approxDateMatch) {
            dates = approxDateMatch[0];
            cleanText = cleanText.replace(approxDateMatch[0], "").trim();
          }
        } else if (singleMatch) {
          dates = singleMatch[0];
          cleanText = cleanText.replace(singleMatch[0], "").trim();
        }
      }
      
      const gpaMatch = line.match(gpaRegex);
      if (gpaMatch) {
        gpa = gpaMatch[0];
        cleanText = cleanText.replace(gpaMatch[0], "").trim();
      }
      
      cleanText = cleanText.replace(/^[\s\|\-\–\—\:]+|[\s\|\-\–\—\:]+$/g, "").trim();
      
      if (isNewEntry) {
        blocks.push({
          type: 'education',
          degree: cleanText || "Degree",
          school: "",
          dates: dates,
          gpa: gpa
        });
      } else {
        if (lastEdu) {
          if (!lastEdu.school) {
            lastEdu.school = cleanText;
          }
          if (dates) lastEdu.dates = dates;
          if (gpa) lastEdu.gpa = gpa;
        } else {
          blocks.push({
            type: 'education',
            degree: cleanText || "Degree",
            school: "",
            dates: dates,
            gpa: gpa
          });
        }
      }
      continue;
    }

    if (currentSection === 'CERTIFICATIONS' || currentSection === 'ACHIEVEMENTS' || currentSection === 'AWARDS') {
      blocks.push({ type: 'cert', text: line });
      continue;
    }

    // Default standalone items
    const isBullet = /^[•\-\*–]\s*/.test(line);
    if (isBullet) {
      blocks.push({ type: 'bullet', text: line.replace(/^[•\-\*–]\s*/, '').trim() });
    } else {
      const urlMatches = line.match(URL_REGEX);
      if (urlMatches && urlMatches.length > 0 && line.length < 150) {
        blocks.push({ type: 'link', label: line, url: cleanUrl(urlMatches[0]) });
      } else {
        blocks.push({ type: 'normal', text: line });
      }
    }
  }

  return blocks;
}

interface BulletRowProps {
  text: string;
}

const BulletRow: React.FC<BulletRowProps> = ({ text }) => {
  // Parse links inside bullet points dynamically
  const urlMatches = text.match(URL_REGEX_G);
  
  if (urlMatches && urlMatches.length > 0) {
    const segments: React.ReactNode[] = [];
    let lastIdx = 0;
    
    urlMatches.forEach((match, idx) => {
      const matchStart = text.indexOf(match, lastIdx);
      if (matchStart > lastIdx) {
        segments.push(<Text key={`text-${idx}`}>{text.substring(lastIdx, matchStart)}</Text>);
      }
      
      const clean = cleanUrl(match);
      segments.push(
        <Link key={`link-${idx}`} src={clean} style={{ color: '#0000EE', textDecoration: 'underline' }}>
          <Text style={{ color: '#0000EE', textDecoration: 'underline' }}>{match}</Text>
        </Link>
      );
      
      lastIdx = matchStart + match.length;
    });
    
    if (lastIdx < text.length) {
      segments.push(<Text key="text-end">{text.substring(lastIdx)}</Text>);
    }
    
    return (
      <View style={styles.bulletRow}>
        <Text style={styles.bulletDot}>•</Text>
        <Text style={styles.bulletText}>{segments}</Text>
      </View>
    );
  }

  return (
    <View style={styles.bulletRow}>
      <Text style={styles.bulletDot}>•</Text>
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
};

interface ResumePDFProps {
  text: string;
  watermarked?: boolean;
}

export const ResumePDFDocument: React.FC<ResumePDFProps> = ({ text }) => {
  const blocks = parseResumeIntoBlocks(text);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
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
                <View key={i} style={styles.contactRow}>
                  {block.segments.map((seg, sIdx) => {
                    const elements: React.ReactNode[] = [];
                    if (seg.isLink && seg.url) {
                      elements.push(
                        <Link key={`link-${sIdx}`} src={seg.url} style={styles.contactLink}>
                          <Text style={styles.contactLink}>{seg.text}</Text>
                        </Link>
                      );
                    } else {
                      elements.push(
                        <Text key={`txt-${sIdx}`} style={styles.contactText}>
                          {seg.text}
                        </Text>
                      );
                    }
                    if (sIdx < block.segments.length - 1) {
                      elements.push(
                        <Text key={`sep-${sIdx}`} style={styles.contactSeparator}>
                          —
                        </Text>
                      );
                    }
                    return elements;
                  })}
                </View>
              );
            case 'section':
              return (
                <Text key={i} style={styles.sectionHeader}>
                  {block.text}
                </Text>
              );
            case 'summary':
              return (
                <Text key={i} style={styles.summaryText}>
                  {block.text}
                </Text>
              );
            case 'skillLine':
              return (
                <View key={i} style={styles.skillRow}>
                  <Text style={styles.skillLabel}>{block.label}: </Text>
                  <Text style={styles.skillValue}>{block.value}</Text>
                </View>
              );
            case 'project':
              return (
                <View key={i} style={{ marginBottom: 4 }}>
                  <View style={styles.projectTitleRow}>
                    <View style={styles.projectTitleLeft}>
                      <Text style={styles.projectTitle}>{block.name}</Text>
                      {block.projectUrl && (
                        <Link src={block.projectUrl} style={styles.projectLink}>
                          <Text style={styles.projectLink}>{block.projectUrl}</Text>
                        </Link>
                      )}
                    </View>
                    {block.tech && (
                      <Text style={styles.projectTech}>{block.tech}</Text>
                    )}
                  </View>
                  {block.bullets.map((bullet, bIdx) => (
                    <BulletRow key={bIdx} text={bullet} />
                  ))}
                </View>
              );
            case 'job':
              return (
                <View key={i} style={{ marginBottom: 4 }}>
                  <View style={styles.jobTitleRow}>
                    <Text style={styles.jobTitle}>{block.title}</Text>
                    <Text style={styles.jobDates}>{block.dates}</Text>
                  </View>
                  <Text style={styles.jobCompany}>{block.company}</Text>
                  {block.bullets.map((bullet, bIdx) => (
                    <BulletRow key={bIdx} text={bullet} />
                  ))}
                </View>
              );
            case 'education':
              return (
                <View key={i} style={{ marginBottom: 4 }}>
                  <View style={styles.educationRow}>
                    <Text style={styles.educationDegree}>{block.degree}</Text>
                    <Text style={styles.educationDates}>{block.dates}</Text>
                  </View>
                  <View style={styles.educationInstitution}>
                    <Text style={styles.educationSchool}>{block.school}</Text>
                    <Text style={styles.educationGPA}>{block.gpa}</Text>
                  </View>
                </View>
              );
            case 'bullet':
              return <BulletRow key={i} text={block.text} />;
            case 'cert':
              return (
                <Text key={i} style={styles.certItem}>
                  {block.text}
                </Text>
              );
            case 'link':
              return (
                <Link key={i} src={block.url} style={styles.link}>
                  <Text style={styles.link}>{block.label}</Text>
                </Link>
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

export function parseLaTeXToPlainText(latex: string): string {
  const lines = latex.split('\n');
  const resultLines: string[] = [];
  
  let name = "";
  let contact = "";
  
  for (let line of lines) {
    line = line.trim();
    if (!line) continue;
    
    if (line.startsWith('%')) continue;
    if (line.startsWith('\\documentclass') || line.startsWith('\\usepackage') || line.startsWith('\\pagestyle') || line.startsWith('\\fancy') || line.startsWith('\\addtolength') || line.startsWith('\\urlstyle') || line.startsWith('\\ragged') || line.startsWith('\\setlength') || line.startsWith('\\titleformat')) {
      continue;
    }
    if (line.startsWith('\\begin{document}') || line.startsWith('\\end{document}') || line.startsWith('\\begin{center}') || line.startsWith('\\end{center}') || line.startsWith('\\begin{itemize}') || line.startsWith('\\end{itemize}')) {
      continue;
    }
    
    // Name
    const nameMatch = line.match(/\\textbf\{\\Huge\s*([^\}]+)\}/);
    if (nameMatch) {
      name = nameMatch[1];
      continue;
    }
    
    // Contact
    if (line.startsWith('\\small ')) {
      contact = line.substring(7).trim();
      continue;
    }
    
    // Section
    const sectionMatch = line.match(/\\section\{([^\}]+)\}/);
    if (sectionMatch) {
      resultLines.push(sectionMatch[1].toUpperCase());
      continue;
    }
    
    // Item
    const itemMatch = line.match(/\\item\s+(.+)/);
    if (itemMatch) {
      resultLines.push(`• ${itemMatch[1]}`);
      continue;
    }
    
    // Bold Title/Company
    const boldMatch = line.match(/\\textbf\{([^\}]+)\}/);
    if (boldMatch) {
      resultLines.push(boldMatch[1]);
      continue;
    }
    
    // Italic Date/Location
    const italicMatch = line.match(/\\textit\{([^\}]+)\}/);
    if (italicMatch) {
      resultLines.push(italicMatch[1]);
      continue;
    }
    
    // Small italic
    const smallItalicMatch = line.match(/\{\\small\s*\\textit\{([^\}]+)\}\}/);
    if (smallItalicMatch) {
      resultLines.push(smallItalicMatch[1]);
      continue;
    }
    
    let cleanLine = line.replace(/\\\\\s*$/, '').trim();
    cleanLine = cleanLine.replace(/^\{/, '').replace(/\}$/, '');
    
    if (cleanLine) {
      resultLines.push(cleanLine);
    }
  }
  
  let plainText = [name, contact, ...resultLines]
    .filter(Boolean)
    .join('\n');
    
  plainText = plainText
    .replace(/\\&/g, '&')
    .replace(/\\%/g, '%')
    .replace(/\\\$/g, '$')
    .replace(/\\#/g, '#')
    .replace(/\\_/g, '_')
    .replace(/\\\{/g, '{')
    .replace(/\\\}/g, '}')
    .replace(/\\\\/g, '\\');
    
  return plainText;
}
