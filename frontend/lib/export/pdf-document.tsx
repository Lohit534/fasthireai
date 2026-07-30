import React from "react";
import { Font, Document, Page, Text, View, Link, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { logger } from "../logger";

// Register Times New Roman natively supported aliases
Font.registerHyphenationCallback(word => [word]);

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Times-Roman',
    fontSize: 10,
    paddingTop: 36,
    paddingBottom: 36,
    paddingHorizontal: 40,
    color: '#000000',
    lineHeight: 1.3,
    backgroundColor: '#FFFFFF',
  },

  // ── NAME ──
  name: {
    fontFamily: 'Times-Bold',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 3,
    letterSpacing: 0.5,
    color: '#000000',
  },

  // ── CONTACT LINE ──
  contactRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginBottom: 8,
    fontSize: 9.5,
  },
  contactText: {
    fontFamily: 'Times-Roman',
    fontSize: 9.5,
    color: '#000000',
  },
  contactSeparator: {
    fontFamily: 'Times-Roman',
    fontSize: 9.5,
    marginHorizontal: 5,
    color: '#000000',
  },
  contactLink: {
    fontFamily: 'Times-Roman',
    fontSize: 9.5,
    color: '#0000EE',
    textDecoration: 'underline',
  },

  // ── SECTION HEADER ──
  sectionHeader: {
    fontFamily: 'Times-Bold',
    fontSize: 11,
    marginTop: 10,
    marginBottom: 3,
    paddingBottom: 1,
    borderBottomWidth: 0.75,
    borderBottomColor: '#000000',
    borderBottomStyle: 'solid',
    textTransform: 'uppercase',
  },

  // ── PROFESSIONAL SUMMARY ──
  summaryText: {
    fontFamily: 'Times-Roman',
    fontSize: 10,
    lineHeight: 1.35,
    marginBottom: 3,
    textAlign: 'justify',
  },

  // ── SKILLS ──
  skillRow: {
    flexDirection: 'row',
    marginBottom: 2.5,
  },
  skillLabel: {
    fontFamily: 'Times-Bold',
    fontSize: 10,
    width: 140,
  },
  skillValue: {
    fontFamily: 'Times-Roman',
    fontSize: 10,
    flex: 1,
  },

  // ── PROJECT TITLE ──
  projectTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 4,
    marginBottom: 2,
  },
  projectTitleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  projectTitle: {
    fontFamily: 'Times-Bold',
    fontSize: 10,
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
    fontSize: 9.5,
    color: '#333333',
    marginLeft: 8,
    textAlign: 'right',
  },

  // ── EXPERIENCE / INTERNSHIP ──
  jobTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 1,
  },
  jobTitle: {
    fontFamily: 'Times-Bold',
    fontSize: 10,
    flex: 1,
  },
  jobDates: {
    fontFamily: 'Times-Roman',
    fontSize: 9.5,
    color: '#000000',
    textAlign: 'right',
  },
  jobCompany: {
    fontFamily: 'Times-Italic',
    fontSize: 9.5,
    marginBottom: 2,
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
    fontSize: 10,
    flex: 1,
  },
  educationDates: {
    fontFamily: 'Times-Roman',
    fontSize: 9.5,
    textAlign: 'right',
    minWidth: 80,
  },
  educationInstitution: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  educationSchool: {
    fontFamily: 'Times-Roman',
    fontSize: 10,
    color: '#000000',
    flex: 1,
  },
  educationGPA: {
    fontFamily: 'Times-Roman',
    fontSize: 9.5,
    textAlign: 'right',
    minWidth: 80,
  },

  // ── BULLET POINTS ──
  bulletRow: {
    flexDirection: 'row',
    marginBottom: 2,
    paddingLeft: 10,
  },
  bulletDot: {
    width: 10,
    fontSize: 10,
    fontFamily: 'Times-Roman',
  },
  bulletText: {
    flex: 1,
    fontFamily: 'Times-Roman',
    fontSize: 9.5,
    lineHeight: 1.3,
  },

  // ── CERTIFICATIONS / LANGUAGES ──
  certItem: {
    fontFamily: 'Times-Roman',
    fontSize: 10,
    marginBottom: 2,
  },

  // ── STANDALONE LINK ──
  link: {
    color: '#0000EE',
    textDecoration: 'underline',
    fontFamily: 'Times-Roman',
    fontSize: 9.5,
    marginBottom: 2,
  },
  spacer: {
    height: 3,
  },
});

const SECTION_NAMES = [
  'PROFESSIONAL SUMMARY', 'SUMMARY', 'OBJECTIVE', 'PROFILE',
  'TECHNICAL SKILLS', 'SKILLS', 'CORE SKILLS', 'SOFT SKILLS', 'SKILLS & COMPETENCIES', 'KEY SKILLS',
  'EXPERIENCE', 'WORK EXPERIENCE', 'PROFESSIONAL EXPERIENCE', 'EMPLOYMENT HISTORY', 'INTERNSHIP', 'WORK HISTORY', 'INTERNSHIPS',
  'PROJECTS', 'PERSONAL PROJECTS', 'KEY PROJECTS', 'ACADEMIC PROJECTS',
  'EDUCATION', 'ACADEMIC BACKGROUND', 'QUALIFICATIONS', 'ACADEMICS',
  'CERTIFICATIONS', 'CERTIFICATIONS & ACHIEVEMENTS', 'ACHIEVEMENTS', 'AWARDS', 'HONORS', 'CERTIFICATES',
  'LANGUAGES', 'LANGUAGES SPOKEN', 'LANGUAGES KNOWN', 'INTERESTS', 'VOLUNTEER',
  'PUBLICATIONS', 'PUBLICATIONS & ACHIEVEMENTS', 'ACTIVITIES', 'EXTRA-CURRICULAR ACTIVITIES'
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

export function getCleanExportFilename(text: string, ext = ".pdf", fallbackTitle?: string): string {
  let candidateName = "";
  if (text) {
    const firstLine = text.trim().split("\n")[0] || "";
    candidateName = firstLine
      .replace(/[^a-zA-Z0-9\s_]/g, "")
      .trim()
      .replace(/\s+/g, "_");
  }

  if (!candidateName || candidateName.length < 2 || candidateName.toUpperCase().includes("RESUME")) {
    if (fallbackTitle) {
      const cleanFallback = fallbackTitle.replace(/[^a-zA-Z0-9\s_]/g, "").trim().replace(/\s+/g, "_");
      if (cleanFallback) candidateName = cleanFallback;
    }
  }

  if (!candidateName || candidateName.length < 2) {
    candidateName = "Resume";
  }

  // Remove any lingering 'optimized' or 'fasthire' words from title
  candidateName = candidateName.replace(/_?optimized/gi, "").replace(/_?fasthire/gi, "").trim();
  if (!candidateName) candidateName = "Resume";

  if (!candidateName.toUpperCase().includes("RESUME")) {
    return `${candidateName}_Resume${ext}`;
  }
  return `${candidateName}${ext}`;
}

export function cleanUrl(url: string): string {
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

export function stripMarkdownAsterisks(str: string): string {
  if (!str) return "";
  return str
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, "$1")
    .replace(/\*/g, "")
    .replace(/\s*\|\|\s*/g, " || ")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function swapEducationAndSkillsIfNeeded(blocks: ParsedResumeBlock[]): ParsedResumeBlock[] {
  const sectionGroups: { name: string; blocks: ParsedResumeBlock[] }[] = [];
  let currentGroup: { name: string; blocks: ParsedResumeBlock[] } = { name: 'HEADER', blocks: [] };

  for (const block of blocks) {
    if (block.type === 'section') {
      if (currentGroup.blocks.length > 0) {
        sectionGroups.push(currentGroup);
      }
      const upperName = block.text.toUpperCase().replace(/[^A-Z ]/g, '').trim();
      currentGroup = { name: upperName, blocks: [block] };
    } else {
      currentGroup.blocks.push(block);
    }
  }
  if (currentGroup.blocks.length > 0) {
    sectionGroups.push(currentGroup);
  }

  const isEdu = (name: string) => name === 'EDUCATION';
  const isSkill = (name: string) => name === 'SKILLS' || name === 'TECHNICAL SKILLS' || name === 'CORE SKILLS';

  const eduIdx = sectionGroups.findIndex(g => isEdu(g.name));
  const skillIdx = sectionGroups.findIndex(g => isSkill(g.name));

  // If both Education and Skills sections exist, and Education appears before Skills, swap them!
  if (eduIdx !== -1 && skillIdx !== -1 && eduIdx < skillIdx) {
    const temp = sectionGroups[eduIdx];
    sectionGroups[eduIdx] = sectionGroups[skillIdx];
    sectionGroups[skillIdx] = temp;
  }

  return sectionGroups.flatMap(g => g.blocks);
}

export function parseResumeIntoBlocks(text: string): ParsedResumeBlock[] {
  const rawLines = text.split('\n');
  const blocks: ParsedResumeBlock[] = [];
  
  let isFirstLine = true;
  let currentSection = "";
  
  for (let idx = 0; idx < rawLines.length; idx++) {
    const rawLine = rawLines[idx].trim();
    if (!rawLine) {
      blocks.push({ type: 'spacer' });
      continue;
    }

    const line = stripMarkdownAsterisks(rawLine);
    if (!line) continue;

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
      const parts = line.split(/\s*(?:[|•\u2022—–]|\s+-\s+)\s*/);
      const segments: ContactSegment[] = [];
      
      parts.forEach(part => {
        const txt = stripMarkdownAsterisks(part.trim());
        if (!txt) return;
        
        const emailMatch = txt.match(EMAIL_REGEX);
        const urlMatch = txt.match(URL_REGEX);
        
        if (emailMatch) {
          segments.push({ text: txt, isLink: false });
        } else if (urlMatch) {
          segments.push({ text: txt, url: cleanUrl(urlMatch[0]), isLink: true });
        } else if (txt.toLowerCase().includes('linkedin.com') || txt.toLowerCase().includes('github.com')) {
          const clean = txt.startsWith('http') ? txt : 'https://' + txt;
          segments.push({ text: txt, url: cleanUrl(clean), isLink: true });
        } else if (txt.toLowerCase().includes('linkedin') || txt.toLowerCase().includes('github')) {
          const implicitUrl = txt.toLowerCase().includes('linkedin') 
            ? 'https://linkedin.com' 
            : 'https://github.com';
          segments.push({ text: txt, url: implicitUrl, isLink: true });
        } else if (/\+?\d[\d\s\-\(\)]{7,}/.test(txt)) {
          segments.push({ text: txt, isLink: false });
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
      blocks.push({ type: 'section', text: line });
      continue;
    }

    // 4. Section dependent parsing
    if (currentSection === 'PROFESSIONAL SUMMARY' || currentSection === 'SUMMARY' || currentSection === 'OBJECTIVE') {
      blocks.push({ type: 'summary', text: line });
      continue;
    }

    if (currentSection === 'TECHNICAL SKILLS' || currentSection === 'SKILLS' || currentSection === 'CORE SKILLS' || currentSection === 'SOFT SKILLS' || currentSection === 'SKILLS & COMPETENCIES' || currentSection === 'KEY SKILLS') {
      if (line.includes(':')) {
        const colonIdx = line.indexOf(':');
        const label = stripMarkdownAsterisks(line.substring(0, colonIdx));
        const value = stripMarkdownAsterisks(line.substring(colonIdx + 1).replace(/^[•\-\*–\s\u2022]+/, ""));
        blocks.push({ type: 'skillLine', label, value });
      } else {
        const cleanVal = stripMarkdownAsterisks(line.replace(/^[•\-\*–\s\u2022]+/, ""));
        if (cleanVal) {
          blocks.push({ type: 'skillLine', label: currentSection === 'SOFT SKILLS' ? 'Soft Skills' : 'Skills', value: cleanVal });
        }
      }
      continue;
    }

    if (currentSection === 'LANGUAGES' || currentSection === 'LANGUAGES SPOKEN' || currentSection === 'LANGUAGES KNOWN') {
      const cleanVal = stripMarkdownAsterisks(line.replace(/^[•\-\*–\s\u2022]+/, ""));
      if (cleanVal) {
        if (cleanVal.includes(':')) {
          const colonIdx = cleanVal.indexOf(':');
          const label = cleanVal.substring(0, colonIdx).trim();
          const value = cleanVal.substring(colonIdx + 1).trim();
          blocks.push({ type: 'skillLine', label, value });
        } else {
          // Format comma/pipe separated languages cleanly (e.g. English, Telugu)
          blocks.push({ type: 'skillLine', label: 'Languages', value: cleanVal });
        }
      }
      continue;
    }

    // Experience entry
    if (currentSection === 'EXPERIENCE' || currentSection === 'WORK EXPERIENCE' || currentSection === 'PROFESSIONAL EXPERIENCE' || currentSection === 'EMPLOYMENT HISTORY' || currentSection === 'INTERNSHIP' || currentSection === 'INTERNSHIPS' || currentSection === 'WORK HISTORY') {
      const isBullet = /^[•\-\*–]\s*/.test(rawLine);
      if (!isBullet) {
        const dateMatch = line.match(/\b\d{4}\b/);
        const hasDatePattern = dateMatch && (line.toLowerCase().includes('present') || line.toLowerCase().includes('current') || line.includes('–') || line.includes('-'));
        
        let lastJobIdx = -1;
        for (let i = blocks.length - 1; i >= 0; i--) {
          if (blocks[i].type === 'job') {
            lastJobIdx = i;
            break;
          }
        }

        if (hasDatePattern) {
          if (lastJobIdx !== -1 && !(blocks[lastJobIdx] as JobBlock).dates) {
            (blocks[lastJobIdx] as JobBlock).dates = line;
          } else {
            blocks.push({ type: 'bullet', text: line });
          }
        } else {
          // Check if line looks like a genuine Job Title / Role Header
          const lowerLine = line.toLowerCase();
          const TITLE_KEYWORDS = ['developer', 'engineer', 'manager', 'lead', 'architect', 'consultant', 'analyst', 'designer', 'intern', 'specialist', 'associate', 'head', 'director', 'officer'];
          const looksLikeJobHeader = line.includes('|') || line.includes('—') || line.includes('–') || TITLE_KEYWORDS.some(kw => lowerLine.includes(kw)) || lastJobIdx === -1;

          if (looksLikeJobHeader) {
            const parts = line.split(/\s*(?:[|—–]|\s+-\s+)\s*/);
            const title = stripMarkdownAsterisks(parts[0] || line);
            const company = stripMarkdownAsterisks(parts[1] || "");
            
            let dates = "";
            if (idx + 1 < rawLines.length) {
              const nextLine = stripMarkdownAsterisks(rawLines[idx + 1]);
              const nextDateMatch = nextLine.match(/\b\d{4}\b/);
              if (nextDateMatch && (nextLine.toLowerCase().includes('present') || nextLine.toLowerCase().includes('current') || nextLine.includes('–') || nextLine.includes('-'))) {
                dates = nextLine;
                idx++;
              }
            }
            
            blocks.push({
              type: 'job',
              title,
              company,
              dates,
              bullets: []
            });
          } else {
            // It's body description text! Append to current job bullets as normal text
            if (lastJobIdx !== -1) {
              (blocks[lastJobIdx] as JobBlock).bullets.push(line);
            } else {
              blocks.push({ type: 'summary', text: line });
            }
          }
        }
      } else {
        const cleanBulletText = stripMarkdownAsterisks(rawLine.replace(/^[•\-\*–]\s*/, ''));
        
        let lastJobIdx = -1;
        for (let i = blocks.length - 1; i >= 0; i--) {
          if (blocks[i].type === 'job') {
            lastJobIdx = i;
            break;
          }
        }
        if (lastJobIdx !== -1) {
          (blocks[lastJobIdx] as JobBlock).bullets.push(cleanBulletText);
        } else {
          blocks.push({ type: 'bullet', text: cleanBulletText });
        }
      }
      continue;
    }

    // Projects block
    if (currentSection === 'PROJECTS' || currentSection === 'PERSONAL PROJECTS') {
      const isBullet = /^[•\-\*–]\s*/.test(rawLine);
      if (!isBullet) {
        const parts = line.split(/\s*(?:[|—–]|\s+-\s+)\s*/);
        const name = stripMarkdownAsterisks(parts[0] || "Project");
        const tech = stripMarkdownAsterisks(parts[1] || "");
        
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
        const cleanBulletText = stripMarkdownAsterisks(rawLine.replace(/^[•\-\*–]\s*/, ''));
        
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
    if (currentSection === 'EDUCATION' || currentSection === 'ACADEMIC BACKGROUND' || currentSection === 'QUALIFICATIONS' || currentSection === 'ACADEMICS') {
      const lowerLine = line.toLowerCase();
      const DEGREE_KEYWORDS = [
        'b.tech', 'btech', 'intermediate', 'ssc', 'b.s.', 'bs', 'bachelor', 'master', 
        'm.tech', 'mtech', 'ph.d', 'phd', 'class xii', 'class x', 'class 12', 'class 10',
        'diploma', 'matriculation', 'secondary', 'hsc', 'cbse', 'board', 'high school',
        '10th', '12th', 'senior secondary', 'higher secondary', 'degree', 'university', 'college', 'school'
      ];
      
      let lastEdu: EducationBlock | undefined;
      for (let i = blocks.length - 1; i >= 0; i--) {
        if (blocks[i].type === 'education') {
          lastEdu = blocks[i] as EducationBlock;
          break;
        }
      }

      const gpaRegex = /(GPA|CGPA|%)\s*:?\s*([\d\.\%]+)/i;
      const gpaMatch = line.match(gpaRegex);

      // Check if this line has a pipe separator (degree | year format from serializer)
      // e.g. "B.Tech in Computer Science | 2022 – 2026"
      const pipeIdx = line.indexOf(' | ');
      const hasPipeWithDate = pipeIdx !== -1 && /\b20\d{2}\b/.test(line.substring(pipeIdx));

      const dateRangeRegex = /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|20\d{2})\b[\s\-\u2013]+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|20\d{2}|Present)\b/i;
      const singleDateRegex = /\b(20\d{2})\b/;
      
      let cleanText = stripMarkdownAsterisks(line);
      let dates = "";
      let gpa = "";

      if (gpaMatch) {
        gpa = gpaMatch[0];
        cleanText = cleanText.replace(gpaMatch[0], "").trim();
      }

      if (hasPipeWithDate) {
        // Format: "B.Tech in CS | 2022 – 2026" — split at pipe
        dates = stripMarkdownAsterisks(line.substring(pipeIdx + 3).trim());
        cleanText = stripMarkdownAsterisks(line.substring(0, pipeIdx).trim());
      } else {
        const dateMatch = line.match(dateRangeRegex);
        if (dateMatch) {
          dates = dateMatch[0];
          cleanText = cleanText.replace(dateMatch[0], "").trim();
        } else {
          const singleMatch = line.match(singleDateRegex);
          if (singleMatch && (line.includes('-') || line.includes('\u2013') || line.toLowerCase().includes('present'))) {
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
      }
      
      cleanText = stripMarkdownAsterisks(cleanText.replace(/^[\s\|\-\u2013\u2014\:]+|[\s\|\-\u2013\u2014\:]+$/g, ""));

      // Determine if this is a new entry or continuation
      const isNewEntry = (DEGREE_KEYWORDS.some(kw => lowerLine.includes(kw)) || 
                          lowerLine.startsWith('b.') || lowerLine.startsWith('m.') ||
                          !lastEdu || hasPipeWithDate) && (!lastEdu || lastEdu.school !== "");
      
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
          } else if (!lastEdu.gpa && gpa) {
            lastEdu.gpa = gpa;
          } else if (!lastEdu.dates && dates) {
            lastEdu.dates = dates;
          }
          if (dates && !lastEdu.dates) lastEdu.dates = dates;
          if (gpa && !lastEdu.gpa) lastEdu.gpa = gpa;
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

    if (currentSection === 'CERTIFICATIONS' || currentSection === 'ACHIEVEMENTS' || currentSection === 'AWARDS' || currentSection === 'LANGUAGES' || currentSection === 'LANGUAGES SPOKEN' || currentSection === 'LANGUAGES KNOWN') {
      blocks.push({ type: 'cert', text: line });
      continue;
    }

    // Default standalone items
    const isBullet = /^[•\-\*–]\s*/.test(rawLine);
    if (isBullet) {
      blocks.push({ type: 'bullet', text: line });
    } else {
      const urlMatches = line.match(URL_REGEX);
      if (urlMatches && urlMatches.length > 0 && line.length < 150) {
        blocks.push({ type: 'link', label: line, url: cleanUrl(urlMatches[0]) });
      } else {
        blocks.push({ type: 'normal', text: line });
      }
    }
  }

  // Swap Education and Skills sections if Education is above Skills
  return swapEducationAndSkillsIfNeeded(blocks);
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
                      const lowerUrl = seg.url.toLowerCase();
                      const lowerTxt = seg.text.toLowerCase();
                      let label = seg.text;
                      if (lowerUrl.includes('linkedin') || lowerTxt.includes('linkedin')) {
                        label = 'LinkedIn';
                      } else if (lowerUrl.includes('github') || lowerTxt.includes('github')) {
                        label = 'GitHub';
                      } else if (lowerUrl.includes('portfolio') || lowerTxt.includes('portfolio')) {
                        label = 'Portfolio';
                      } else {
                        label = seg.text.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '');
                      }
                      elements.push(
                        <Link key={`link-${sIdx}`} src={seg.url} style={styles.contactLink}>
                          <Text style={styles.contactLink}>{label}</Text>
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
                          |
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
                          <Text style={styles.projectLink}>{block.name}</Text>
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
                    {block.dates ? <Text style={styles.jobDates}>{block.dates}</Text> : null}
                  </View>
                  {block.company ? <Text style={styles.jobCompany}>{block.company}</Text> : null}
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
