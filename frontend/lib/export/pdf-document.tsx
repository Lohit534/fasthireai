import React from "react";
import { Font, Document, Page, Text, View, Link, StyleSheet, renderToBuffer, Svg, Path } from "@react-pdf/renderer";
import { logger } from "../logger";
import { estimateYearsOfExperience } from "../resume-format";
import { looksLikeSentenceBullet } from "../ats/bullets";
export { looksLikeSentenceBullet };

// Register Times New Roman natively supported aliases
Font.registerHyphenationCallback(word => [word]);

const baseStyleDefs: Record<string, any> = {
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
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 2,
    letterSpacing: 0.5,
    color: '#000000',
  },

  // ── SUBTITLE ROLE ──
  subtitle: {
    fontFamily: 'Times-Roman',
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 4,
    color: '#000000',
  },

  // ── CONTACT LINE ──
  contactRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 2,
    marginBottom: 8,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 5,
    marginVertical: 1,
  },
  contactText: {
    fontFamily: 'Times-Roman',
    fontSize: 9.5,
    color: '#000000',
  },
  contactLink: {
    fontFamily: 'Times-Roman',
    fontSize: 9.5,
    color: '#000000',
    textDecoration: 'none',
  },

  // ── SECTION HEADER ──
  sectionHeaderWrapper: {
    marginTop: 8,
    marginBottom: 4,
  },
  sectionHeader: {
    fontFamily: 'Times-Bold',
    fontSize: 11.5,
    color: '#000000',
    marginBottom: 2,
  },
  sectionUnderline: {
    borderBottomWidth: 0.75,
    borderBottomColor: '#000000',
    width: '100%',
  },

  // ── PROFESSIONAL SUMMARY ──
  summaryText: {
    fontFamily: 'Times-Roman',
    fontSize: 10,
    lineHeight: 1.35,
    marginBottom: 4,
    textAlign: 'justify',
  },

  // ── SKILLS ──
  skillLine: {
    fontFamily: 'Times-Roman',
    fontSize: 10,
    lineHeight: 1.35,
    marginBottom: 2.5,
  },
  skillLabel: {
    fontFamily: 'Times-Bold',
    fontSize: 10,
    color: '#000000',
  },
  skillValue: {
    fontFamily: 'Times-Roman',
    fontSize: 10,
    color: '#000000',
  },

  // ── PROJECT TITLE ──
  projectTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 2,
  },
  projectTitle: {
    fontFamily: 'Times-Bold',
    fontSize: 10.5,
    flex: 1,
  },
  projectLink: {
    fontFamily: 'Times-Roman',
    fontSize: 9.5,
    color: '#000000',
    textDecoration: 'none',
    marginLeft: 6,
  },
  projectTech: {
    fontFamily: 'Times-Roman',
    fontSize: 10,
    color: '#000000',
  },
  projectDates: {
    fontFamily: 'Times-Roman',
    fontSize: 10,
    color: '#000000',
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
    fontSize: 10.5,
    flex: 1,
  },
  jobDates: {
    fontFamily: 'Times-Roman',
    fontSize: 10,
    color: '#000000',
    textAlign: 'right',
  },
  jobSubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  jobCompany: {
    fontFamily: 'Times-Italic',
    fontSize: 10,
    color: '#000000',
    flex: 1,
  },
  jobTech: {
    fontFamily: 'Times-Italic',
    fontSize: 9.5,
    color: '#333333',
    textAlign: 'right',
  },

  // ── EDUCATION ──
  educationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 3,
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
  },
  educationInstitution: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  educationSchool: {
    fontFamily: 'Times-Italic',
    fontSize: 10,
    color: '#000000',
    flex: 1,
  },
  educationGPA: {
    fontFamily: 'Times-Roman',
    fontSize: 10,
    textAlign: 'right',
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
    fontSize: 10,
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
    color: '#000000',
    textDecoration: 'none',
    fontFamily: 'Times-Roman',
    fontSize: 10,
    marginBottom: 2,
  },
  spacer: {
    height: 1.5,
  },
};

const ContactIcon: React.FC<{ type: 'phone' | 'email' | 'linkedin' | 'github' | 'globe' }> = ({ type }) => {
  let path = "";
  if (type === 'phone') {
    path = "M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24c1.12.37 2.33.57 3.58.57a1 1 0 011 1v3.5a1 1 0 01-1 1A19.93 19.93 0 012 3a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.46.57 3.58a1 1 0 01-.24 1.01l-2.21 2.2z";
  } else if (type === 'email') {
    path = "M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z";
  } else if (type === 'linkedin') {
    path = "M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v7.6h2.79v-7.6H6.46M7.86 6.5a1.63 1.63 0 1 0 0 3.26 1.63 1.63 0 0 0 0-3.26z";
  } else if (type === 'github') {
    path = "M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z";
  } else {
    path = "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z";
  }

  return (
    <Svg width={8} height={8} viewBox="0 0 24 24" style={{ marginRight: 3 }}>
      <Path d={path} fill="#000000" />
    </Svg>
  );
};

const styles = StyleSheet.create(baseStyleDefs) as Record<string, any>;

const SCALABLE_STYLE_KEYS = new Set([
  'fontSize', 'marginTop', 'marginBottom', 'paddingTop', 'paddingBottom', 'height', 'width', 'paddingLeft',
]);

/** Returns a density-scaled copy of the universal template styles (1 = default). */
function getScaledStyles(scale: number): Record<string, any> {
  if (scale >= 0.999) return styles;
  const scaled: Record<string, any> = {};
  for (const [name, def] of Object.entries(baseStyleDefs)) {
    const copy: Record<string, any> = { ...def };
    for (const key of Object.keys(copy)) {
      if (SCALABLE_STYLE_KEYS.has(key) && typeof copy[key] === 'number') {
        copy[key] = Math.round(copy[key] * scale * 100) / 100;
      }
    }
    scaled[name] = copy;
  }
  // Tighter page margins in compact mode
  scaled.page = {
    ...scaled.page,
    paddingTop: Math.max(24, Math.round(36 * scale)),
    paddingBottom: Math.max(24, Math.round(36 * scale)),
    paddingHorizontal: Math.max(30, Math.round(40 * scale)),
  };
  return StyleSheet.create(scaled) as Record<string, any>;
}

/** Rough rendered height (pt) of the blocks at scale 1 on A4 with the default template. */
function estimateContentHeight(blocks: ParsedResumeBlock[]): number {
  const LINE = 13.65; // 10.5pt * 1.3 line height
  const lines = (text: string, charsPerLine: number) => Math.max(1, Math.ceil((text || '').length / charsPerLine));
  let h = 0;
  for (const b of blocks) {
    switch (b.type) {
      case 'name': h += 32; break;
      case 'subtitle': h += 16; break;
      case 'contact': h += 20; break;
      case 'section': h += 28; break;
      case 'summary': case 'normal': h += lines(b.text, 108) * 14.2 + 4; break;
      case 'skillLine': h += lines(b.value, 70) * LINE + 3; break;
      case 'project': h += 20 + b.bullets.reduce((s, x) => s + lines(x, 100) * LINE + 2, 0); break;
      case 'job': h += 20 + (b.company ? 15 : 0) + b.bullets.reduce((s, x) => s + lines(x, 100) * LINE + 2, 0); break;
      case 'education': h += 36; break;
      case 'bullet': case 'cert': h += lines(b.text, 100) * LINE + 2; break;
      case 'link': h += 15; break;
      case 'spacer': h += 1.5; break;
    }
  }
  return h;
}

/**
 * Universal page-fit: fresher / <5 yrs => 1 page, 5+ yrs => up to 2 pages.
 * Height scales ~ scale² (smaller font => more chars per line AND shorter lines).
 */
export function computeDensityScale(text: string, blocks: ParsedResumeBlock[]): number {
  const years = estimateYearsOfExperience(text);
  const maxPages = years >= 5 ? 2 : 1;
  const capacity = 770 * maxPages; // A4 842pt - 72pt default vertical padding
  const height = estimateContentHeight(blocks);
  if (height <= capacity) return 1;
  const scale = Math.sqrt(capacity / height);
  return Math.max(0.8, Math.min(1, Math.floor(scale * 100) / 100));
}

/** Collapse runs of spacers and drop spacers directly after headers (prevents ballooning length). */
function compactBlocks(blocks: ParsedResumeBlock[]): ParsedResumeBlock[] {
  const out: ParsedResumeBlock[] = [];
  for (const b of blocks) {
    const prev = out[out.length - 1];
    if (b.type === 'spacer' && (!prev || prev.type === 'spacer' || prev.type === 'section' || prev.type === 'name' || prev.type === 'subtitle' || prev.type === 'contact')) continue;
    out.push(b);
  }
  while (out.length && out[out.length - 1].type === 'spacer') out.pop();
  return out;
}

const EDU_PLACEHOLDER = /^(?:university name|institution name|college name|school name|city,?\s*country|location|n\/a|\[[^\]]*\]|_+)$/i;

/** Removes placeholder / duplicated comma segments from education text. */
function cleanEducationText(value: string): string {
  if (!value) return value;
  const seen = new Set<string>();
  return value
    .split(/\s*,\s*/)
    .map((s) => s.trim())
    .filter((s) => {
      const k = s.toLowerCase();
      if (!s || EDU_PLACEHOLDER.test(s) || seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .join(', ');
}

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
  dates?: string;
  projectUrl?: string;
  bullets: string[];
}

export interface JobBlock {
  title: string;
  company: string;
  dates: string;
  tech?: string;
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
  | { type: 'subtitle'; text: string }
  | { type: 'contact'; segments: ContactSegment[] }
  | { type: 'section'; text: string }
  | { type: 'summary'; text: string }
  | { type: 'skillLine'; label: string; value: string }
  | { type: 'project'; name: string; tech?: string; dates?: string; projectUrl?: string; bullets: string[] }
  | { type: 'job'; title: string; company: string; dates: string; tech?: string; bullets: string[] }
  | { type: 'education'; degree: string; dates: string; school: string; gpa: string }
  | { type: 'bullet'; text: string }
  | { type: 'link'; label: string; url: string }
  | { type: 'cert'; text: string }
  | { type: 'normal'; text: string }
  | { type: 'spacer' };

export type ResumeBlock = ParsedResumeBlock;

export function getCleanExportFilename(text: string, ext = ".pdf", jobTitle?: string): string {
  // Prefer jobTitle as filename (e.g. "Java_Full_Stack_Developer_Resume.pdf")
  if (jobTitle && jobTitle.trim() && jobTitle.toLowerCase() !== 'optimized resume' && jobTitle.toLowerCase() !== 'resume') {
    const cleanRole = jobTitle.replace(/[^a-zA-Z0-9\s]/g, "").trim().replace(/\s+/g, "_");
    if (cleanRole && cleanRole.length > 2) {
      return `${cleanRole}_Resume${ext}`;
    }
  }

  // Fallback: use candidate name from first line
  let candidateName = "";
  if (text) {
    const firstLine = text.trim().split("\n")[0] || "";
    candidateName = firstLine
      .replace(/[^a-zA-Z0-9\s_]/g, "")
      .trim()
      .replace(/\s+/g, "_");
  }

  if (!candidateName || candidateName.length < 2) {
    candidateName = "Resume";
  }

  candidateName = candidateName.replace(/_?optimized/gi, "").replace(/_?fasthire/gi, "").trim();
  if (!candidateName) candidateName = "Resume";

  if (!candidateName.toUpperCase().includes("RESUME")) {
    return `${candidateName}_Resume${ext}`;
  }
  return `${candidateName}${ext}`;
}

export function cleanUrl(url: string): string {
  let clean = url.trim();
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
  const sectionGroups: { category: string; blocks: ParsedResumeBlock[] }[] = [];
  let currentGroup: { category: string; blocks: ParsedResumeBlock[] } = { category: 'HEADER', blocks: [] };

  const getCategory = (rawName: string): string => {
    const name = rawName.toUpperCase().replace(/[^A-Z ]/g, '').trim();
    if (['PROFESSIONAL SUMMARY', 'SUMMARY', 'OBJECTIVE', 'PROFILE'].includes(name)) return 'SUMMARY';
    if (['EXPERIENCE', 'WORK EXPERIENCE', 'PROFESSIONAL EXPERIENCE', 'EMPLOYMENT HISTORY', 'INTERNSHIP', 'INTERNSHIPS', 'WORK HISTORY'].includes(name)) return 'EXPERIENCE';
    if (['PROJECTS', 'PERSONAL PROJECTS', 'KEY PROJECTS', 'ACADEMIC PROJECTS'].includes(name)) return 'PROJECTS';
    if (['TECHNICAL SKILLS', 'SKILLS', 'CORE SKILLS', 'SOFT SKILLS', 'SKILLS & COMPETENCIES', 'KEY SKILLS'].includes(name)) return 'SKILLS';
    if (['EDUCATION', 'ACADEMIC BACKGROUND', 'QUALIFICATIONS', 'ACADEMICS'].includes(name)) return 'EDUCATION';
    if (['CERTIFICATIONS', 'CERTIFICATES'].includes(name)) return 'CERTIFICATIONS';
    if (['ACHIEVEMENTS', 'KEY ACHIEVEMENTS', 'AWARDS', 'HONORS', 'CERTIFICATIONS & ACHIEVEMENTS'].includes(name)) return 'ACHIEVEMENTS';
    if (['LANGUAGES', 'LANGUAGES SPOKEN', 'LANGUAGES KNOWN'].includes(name)) return 'LANGUAGES';
    return name;
  };

  for (const block of blocks) {
    if (block.type === 'section') {
      if (currentGroup.blocks.length > 0) {
        sectionGroups.push(currentGroup);
      }
      currentGroup = { category: getCategory(block.text), blocks: [block] };
    } else {
      currentGroup.blocks.push(block);
    }
  }
  if (currentGroup.blocks.length > 0) {
    sectionGroups.push(currentGroup);
  }

  // Strict section priority order:
  // HEADER -> SUMMARY -> SKILLS -> EXPERIENCE -> PROJECTS -> EDUCATION -> CERTIFICATIONS -> ACHIEVEMENTS -> LANGUAGES
  const priorityOrder = ['HEADER', 'SUMMARY', 'SKILLS', 'EXPERIENCE', 'PROJECTS', 'EDUCATION', 'CERTIFICATIONS', 'ACHIEVEMENTS', 'LANGUAGES'];

  sectionGroups.sort((a, b) => {
    const idxA = priorityOrder.indexOf(a.category);
    const idxB = priorityOrder.indexOf(b.category);
    const posA = idxA !== -1 ? idxA : 99;
    const posB = idxB !== -1 ? idxB : 99;
    return posA - posB;
  });

  return sectionGroups.flatMap(g => g.blocks);
}

export function parseResumeIntoBlocks(text: string): ParsedResumeBlock[] {
  const SECTION_NAMES_LIST = [
    'PROFESSIONAL SUMMARY', 'TECHNICAL SKILLS', 'PROFESSIONAL EXPERIENCE', 'WORK EXPERIENCE', 'EMPLOYMENT HISTORY',
    'PERSONAL PROJECTS', 'ACADEMIC PROJECTS', 'ACADEMIC BACKGROUND', 'CORE SKILLS', 'KEY SKILLS', 'SUMMARY', 'OBJECTIVE', 'SKILLS',
    'EXPERIENCE', 'INTERNSHIP', 'INTERNSHIPS', 'PROJECTS', 'EDUCATION', 'CERTIFICATIONS', 'ACHIEVEMENTS', 'KEY ACHIEVEMENTS', 'EXTRA-CURRICULAR', 'AWARDS', 'LANGUAGES'
  ];

  let cleanInput = (text || "");

  // Convert any unfilled [ADD: ...] placeholders to professional blank underlines.
  // This fires only when user clicked "Skip All" — filled text has no [ADD:] markers.
  cleanInput = cleanInput.replace(/\[ADD:[^\]]+\]/g, "_______________");

  // Rejoin compound tech terms and unwrap hyphenated words broken across linebreaks
  const COMPOUND_TERMS: [RegExp, string][] = [
    [/(\b[A-Za-z]+)-\s*\r?\n+\s*([A-Za-z]+\b)/g, '$1$2'],
    [/My\s*\n+\s*SQL/gi, 'MySQL'],
    [/Type\s*\n+\s*Script/gi, 'TypeScript'],
    [/Java\s*\n+\s*Script/gi, 'JavaScript'],
    [/Post\s*\n+\s*gre\s*SQL/gi, 'PostgreSQL'],
    [/Spring\s*\n+\s*Boot/gi, 'Spring Boot'],
    [/Power\s*\n+\s*BI/gi, 'Power BI'],
    [/Node\s*\n+\s*js/gi, 'Node.js'],
    [/React\s*\n+\s*js/gi, 'React.js'],
    [/Next\s*\n+\s*js/gi, 'Next.js'],
    [/Mon\s*\n+\s*go\s*DB/gi, 'MongoDB'],
    [/Kube\s*\n+\s*rnetes/gi, 'Kubernetes'],
    [/Ten\s*\n+\s*sor\s*Flow/gi, 'TensorFlow'],
    [/Git\s*\n+\s*Hub/gi, 'GitHub'],
    [/VS\s*\n+\s*Code/gi, 'VS Code'],
    [/Chat\s*\n+\s*GPT/gi, 'ChatGPT'],
    [/CI\s*\n+\s*CD/gi, 'CI/CD'],
    [/De\s*\n+\s*vOps/gi, 'DevOps'],
  ];

  for (const [pattern, replacement] of COMPOUND_TERMS) {
    cleanInput = cleanInput.replace(pattern, replacement);
  }

  // Insert newlines before section headers ONLY when at boundary
  for (const sec of SECTION_NAMES_LIST) {
    const reg = new RegExp(`(^|\\n)\\s*(${sec})\\b`, 'gi');
    cleanInput = cleanInput.replace(reg, '\n\n$2\n');
  }

  // Separate candidate name from contact info if on same line (e.g. PEYYALA LOHITIndia)
  cleanInput = cleanInput.replace(/^([A-Z\s]{3,30})(India|\+?\d|[\w.-]+@)/m, '$1\n$2');

  const rawLines = cleanInput.split('\n');
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

    // 2. Subtitle / Target Role below Name (e.g. "Java Backend Developer")
    const hasAnySection = blocks.some(b => b.type === 'section');
    const hasSubtitle = blocks.some(b => b.type === 'subtitle');
    const upperLine = line.toUpperCase().replace(/[^A-Z ]/g, '').trim();
    const isSection = SECTION_NAMES.includes(upperLine);
    const isContactLine = 
      line.includes('@') || 
      /\+?\d[\d\s\-\(\)]{7,}/.test(line) ||
      line.toLowerCase().includes('linkedin.com') ||
      line.toLowerCase().includes('github.com') ||
      line.toLowerCase().includes('linkedin') ||
      line.toLowerCase().includes('github') ||
      line.toLowerCase().includes('portfolio');

    if (!hasAnySection && !hasSubtitle && !isContactLine && !isSection) {
      blocks.push({ type: 'subtitle', text: line });
      continue;
    }

    // 3. Contact row detection (collect all contact rows before any section header)
    if (isContactLine && blocks.filter(b => b.type === 'section').length === 0) {
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
      
      if (segments.length > 0) {
        const existingContact = blocks.find(b => b.type === 'contact') as { type: 'contact'; segments: ContactSegment[] } | undefined;
        if (existingContact) {
          existingContact.segments.push(...segments);
        } else {
          blocks.push({ type: 'contact', segments });
        }
      }
      continue;
    }

    // 3. Section Header check
    if (isSection) {
      currentSection = upperLine;
      blocks.push({ type: 'section', text: line });
      continue;
    }

    // 4. Section dependent parsing
    if (currentSection === 'PROFESSIONAL SUMMARY' || currentSection === 'SUMMARY' || currentSection === 'OBJECTIVE') {
      const cleanLine = stripMarkdownAsterisks(line).trim();
      if (cleanLine) {
        const lastBlock = blocks[blocks.length - 1];
        if (lastBlock && lastBlock.type === 'summary') {
          lastBlock.text = `${lastBlock.text} ${cleanLine}`.replace(/\s+/g, ' ');
        } else {
          blocks.push({ type: 'summary', text: cleanLine });
        }
      }
      continue;
    }

    if (currentSection === 'TECHNICAL SKILLS' || currentSection === 'SKILLS' || currentSection === 'CORE SKILLS' || currentSection === 'SOFT SKILLS' || currentSection === 'SKILLS & COMPETENCIES' || currentSection === 'KEY SKILLS') {
      if (line.includes(':')) {
        const colonIdx = line.indexOf(':');
        let label = stripMarkdownAsterisks(line.substring(0, colonIdx)).trim();
        if (/^languages?$/i.test(label)) label = 'Programming Languages';
        const value = stripMarkdownAsterisks(line.substring(colonIdx + 1).replace(/^[•\-\*–\s\u2022]+/, "")).trim();
        if (value) {
          blocks.push({ type: 'skillLine', label: label || 'Technical Skills', value });
        }
      } else {
        const cleanVal = stripMarkdownAsterisks(line.replace(/^[•\-\*–\s\u2022]+/, "")).trim();
        if (cleanVal) {
          // If the next line starts with a colon, merge them
          if (idx + 1 < rawLines.length && rawLines[idx + 1].trim().startsWith(':')) {
            const nextVal = stripMarkdownAsterisks(rawLines[idx + 1].replace(/^:\s*/, '')).trim();
            let label = cleanVal;
            if (/^languages?$/i.test(label)) label = 'Programming Languages';
            blocks.push({ type: 'skillLine', label, value: nextVal });
            idx++; // skip the colon line
          } else {
            // Check if previous block was a skillLine — append to it instead of creating duplicate Technical Skills heading
            const lastBlock = blocks[blocks.length - 1];
            if (lastBlock && lastBlock.type === 'skillLine') {
              const sep = lastBlock.value.endsWith(',') || lastBlock.value.endsWith('-') ? ' ' : ', ';
              lastBlock.value += sep + cleanVal;
            } else {
              blocks.push({ type: 'skillLine', label: currentSection === 'SOFT SKILLS' ? 'Soft Skills' : 'Technical Skills', value: cleanVal });
            }
          }
        }
      }
      continue;
    }

    // Parse LANGUAGES as individual bullet items (• English, • Telugu)
    if (currentSection === 'LANGUAGES' || currentSection === 'LANGUAGES SPOKEN' || currentSection === 'LANGUAGES KNOWN') {
      const cleanVal = stripMarkdownAsterisks(line.replace(/^[•\-\*–\s\u2022]+/, ""));
      if (!cleanVal || cleanVal.toUpperCase() === 'LANGUAGES') {
        continue;
      }
      // Split by comma, pipe, en-dash, em-dash, or hyphen into individual language bullet items
      const items = cleanVal
        .split(/[,|–—\-\/]+\s*/)
        .map(s => s.trim())
        .filter(s => s && !s.toUpperCase().startsWith('LANGUAGE') && !/^(proficient|fluent|native|intermediate|basic|read|write|speak)$/i.test(s));

      for (const lang of items) {
        blocks.push({ type: 'bullet', text: lang });
      }
      continue;
    }

    // Experience entry
    if (currentSection === 'EXPERIENCE' || currentSection === 'WORK EXPERIENCE' || currentSection === 'PROFESSIONAL EXPERIENCE' || currentSection === 'EMPLOYMENT HISTORY' || currentSection === 'INTERNSHIP' || currentSection === 'INTERNSHIPS' || currentSection === 'WORK HISTORY') {
      const isBullet = /^\s*([•\-\*–—+•\u2022\u25cf\u2043]|\d+\.)\s*/.test(rawLine);
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
        } else if (lastJobIdx !== -1 && looksLikeSentenceBullet(line)) {
          // Bullet sentence that lost its "•" marker — attach to current role
          (blocks[lastJobIdx] as JobBlock).bullets.push(line);
        } else {
          const lowerLine = line.toLowerCase();
          const TITLE_KEYWORDS = ['developer', 'engineer', 'manager', 'lead', 'architect', 'consultant', 'analyst', 'designer', 'intern', 'specialist', 'associate', 'head', 'director', 'officer'];
          // Whole-word match only ("intern" must not match "internal")
          const looksLikeJobHeader = line.includes('|') || line.includes('—') || line.includes('–') || TITLE_KEYWORDS.some(kw => new RegExp(`\\b${kw}s?\\b`).test(lowerLine)) || lastJobIdx === -1;

          if (looksLikeJobHeader) {
            const parts = line.split(/\s*(?:[|—–]|\s{3,}|\s+-\s+)\s*/);
            let title = stripMarkdownAsterisks(parts[0] || line);
            let company = stripMarkdownAsterisks(parts[1] || "");
            let tech = "";
            let dates = "";

            if (parts.length > 1) {
              const lastPart = parts[parts.length - 1];
              if (/\b\d{4}\b/.test(lastPart) || /present|current/i.test(lastPart)) {
                dates = lastPart;
                if (parts.length === 2) {
                  title = parts[0];
                  company = "";
                } else if (parts.length === 3) {
                  title = parts[0];
                  company = parts[1];
                }
              }
            }

            if (idx + 1 < rawLines.length) {
              const nextLine = stripMarkdownAsterisks(rawLines[idx + 1]);
              const nextUpper = nextLine.toUpperCase().replace(/[^A-Z ]/g, '').trim();
              const isNextBullet = /^\s*([•\-\*–—+•\u2022\u25cf\u2043]|\d+\.)\s*/.test(rawLines[idx + 1]);
              const isNextSection = SECTION_NAMES.includes(nextUpper);

              if (!isNextBullet && !isNextSection && nextLine) {
                const nextDateMatch = nextLine.match(/\b\d{4}\b/);
                if (!dates && nextDateMatch && (nextLine.toLowerCase().includes('present') || nextLine.toLowerCase().includes('current') || nextLine.includes('–') || nextLine.includes('-'))) {
                  dates = nextLine;
                  idx++;
                } else if (!company) {
                  const nextParts = nextLine.split(/\s*(?:[|—–]|\s{3,}|\s+-\s+)\s*/);
                  company = nextParts[0] || nextLine;
                  if (nextParts.length > 1) {
                    tech = nextParts.slice(1).join(", ");
                  }
                  idx++;
                } else if (company && !tech) {
                  tech = nextLine;
                  idx++;
                }
              }
            }
            
            blocks.push({
              type: 'job',
              title,
              company,
              dates,
              tech: tech || undefined,
              bullets: []
            });
          } else {
            if (lastJobIdx !== -1) {
              (blocks[lastJobIdx] as JobBlock).bullets.push(line);
            } else {
              blocks.push({ type: 'summary', text: line });
            }
          }
        }
      } else {
        const cleanBulletText = stripMarkdownAsterisks(rawLine.replace(/^\s*([•\-\*–—+•\u2022\u25cf\u2043]|\d+\.)\s*/, ''));
        
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
    if (currentSection === 'PROJECTS' || currentSection === 'PERSONAL PROJECTS' || currentSection === 'KEY PROJECTS' || currentSection === 'ACADEMIC PROJECTS') {
      const hasProject = blocks.some(b => b.type === 'project');
      const isBullet = /^\s*([•\-\*–—+•\u2022\u25cf\u2043]|\d+\.)\s*/.test(rawLine) || (hasProject && looksLikeSentenceBullet(line));
      if (!isBullet) {
        let lineClean = line;
        let dates = "";
        const dateMatch = lineClean.match(/\s+(\b20\d{2}\b.*?|\b\d{4}\b)$/);
        if (dateMatch) {
          dates = dateMatch[1].trim();
          lineClean = lineClean.substring(0, lineClean.length - dateMatch[0].length).trim();
        }

        const parts = lineClean.split(/\s*(?:[|—–]|\s+-\s+)\s*/);
        const name = stripMarkdownAsterisks(parts[0] || "Project");
        const tech = stripMarkdownAsterisks(parts.slice(1).join(" — ") || "");
        
        let projectUrl: string | undefined;
        const urlMatches = line.match(URL_REGEX);
        if (urlMatches && urlMatches.length > 0) {
          projectUrl = cleanUrl(urlMatches[0]);
        }
        
        blocks.push({
          type: 'project',
          name,
          tech: tech || undefined,
          dates: dates || undefined,
          projectUrl,
          bullets: []
        });
      } else {
        const cleanBulletText = stripMarkdownAsterisks(rawLine.replace(/^\s*([•\-\*–—+•\u2022\u25cf\u2043]|\d+\.)\s*/, ''));
        
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

    if (currentSection === 'CERTIFICATIONS' || currentSection === 'ACHIEVEMENTS' || currentSection === 'AWARDS' ||
        currentSection === 'CERTIFICATIONS & ACHIEVEMENTS' || currentSection === 'HONORS' || currentSection === 'CERTIFICATES') {
      const cleanCertLine = stripMarkdownAsterisks(line.replace(/^[•\-\*–\s\u2022]+/, ''));
      if (cleanCertLine) blocks.push({ type: 'cert', text: cleanCertLine });
      continue;
    }

    // Default standalone items
    const isBullet = /^[•\-\*–—+•\u2022\u25cf\u2043▸►→]\s*/.test(rawLine);
    if (isBullet) {
      const cleanBulletText = stripMarkdownAsterisks(rawLine.replace(/^[•\-\*–—+•\u2022\u25cf\u2043▸►→]\s*/, '')).trim();
      blocks.push({ type: 'bullet', text: cleanBulletText });
    } else {
      const urlMatches = line.match(URL_REGEX);
      if (urlMatches && urlMatches.length > 0 && line.length < 150) {
        blocks.push({ type: 'link', label: line, url: cleanUrl(urlMatches[0]) });
      } else {
        blocks.push({ type: 'normal', text: line });
      }
    }
  }

  // Final cleanup of education entries (no placeholder / duplicated institution text)
  for (const b of blocks) {
    if (b.type === 'education') {
      b.degree = cleanEducationText(b.degree);
      b.school = cleanEducationText(b.school);
      if (b.school && b.degree && b.school.toLowerCase() === b.degree.toLowerCase()) b.school = '';
    }
  }

  return compactBlocks(swapEducationAndSkillsIfNeeded(blocks));
}

interface BulletRowProps {
  text: string;
  s?: Record<string, any>;
}

const BulletRow: React.FC<BulletRowProps> = ({ text, s = styles }) => {
  const clean = stripMarkdownAsterisks(text)
    .replace(/^\s*([•\-\*–—+•\u2022\u25cf\u2043▸►→]|\d+\.)\s*/, "")
    .trim();

  const urlMatches = clean.match(URL_REGEX_G);
  
  if (urlMatches && urlMatches.length > 0) {
    const segments: React.ReactNode[] = [];
    let lastIdx = 0;
    
    urlMatches.forEach((match, idx) => {
      const matchStart = clean.indexOf(match, lastIdx);
      if (matchStart > lastIdx) {
        segments.push(<Text key={`text-${idx}`}>{clean.substring(lastIdx, matchStart)}</Text>);
      }
      
      const cleanLink = cleanUrl(match);
      segments.push(
        <Link key={`link-${idx}`} src={cleanLink} style={{ color: '#0000EE', textDecoration: 'underline' }}>
          <Text style={{ color: '#0000EE', textDecoration: 'underline' }}>{match}</Text>
        </Link>
      );
      
      lastIdx = matchStart + match.length;
    });
    
    if (lastIdx < clean.length) {
      segments.push(<Text key="text-end">{clean.substring(lastIdx)}</Text>);
    }
    
    return (
      <View style={s.bulletRow}>
        <Text style={s.bulletDot}>•</Text>
        <Text style={s.bulletText}>{segments}</Text>
      </View>
    );
  }

  return (
    <View style={s.bulletRow}>
      <Text style={s.bulletDot}>•</Text>
      <Text style={s.bulletText}>{clean}</Text>
    </View>
  );
};

interface ResumePDFProps {
  text: string;
  watermarked?: boolean;
}

export const ResumePDFDocument: React.FC<ResumePDFProps> = ({ text }) => {
  const blocks = parseResumeIntoBlocks(text);
  // Universal page-fit (1 page for fresher / <5 yrs, up to 2 pages for 5+ yrs)
  const densityScale = computeDensityScale(text, blocks);
  const styles = getScaledStyles(densityScale);

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
            case 'subtitle':
              return (
                <Text key={i} style={styles.subtitle}>
                  {block.text}
                </Text>
              );
            case 'contact':
              return (
                <View key={i} style={styles.contactRow}>
                  {block.segments.map((seg, sIdx) => {
                    const lower = (seg.text || "").toLowerCase() + " " + (seg.url || "").toLowerCase();
                    let iconType: 'phone' | 'email' | 'linkedin' | 'github' | 'globe' = 'globe';
                    if (seg.text.includes('@') || lower.includes('@')) iconType = 'email';
                    else if (/\+?\d[\d\s\-\(\)]{7,}/.test(seg.text)) iconType = 'phone';
                    else if (lower.includes('linkedin')) iconType = 'linkedin';
                    else if (lower.includes('github')) iconType = 'github';

                    let displayLabel = seg.text.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '');
                    if (displayLabel.startsWith('mailto:')) displayLabel = displayLabel.replace('mailto:', '');
                    if (displayLabel.startsWith('tel:')) displayLabel = displayLabel.replace('tel:', '');

                    return (
                      <View key={sIdx} style={styles.contactItem}>
                        <ContactIcon type={iconType} />
                        {seg.isLink && seg.url ? (
                          <Link src={seg.url} style={styles.contactLink}>
                            <Text style={styles.contactLink}>{displayLabel}</Text>
                          </Link>
                        ) : (
                          <Text style={styles.contactText}>{displayLabel}</Text>
                        )}
                      </View>
                    );
                  })}
                </View>
              );
            case 'section':
              return (
                <View key={i} style={styles.sectionHeaderWrapper}>
                  <Text style={styles.sectionHeader}>{block.text}</Text>
                  <View style={styles.sectionUnderline} />
                </View>
              );
            case 'summary':
              return (
                <Text key={i} style={styles.summaryText}>
                  {block.text}
                </Text>
              );
            case 'skillLine':
              return (
                <Text key={i} style={styles.skillLine}>
                  <Text style={styles.skillLabel}>{block.label}: </Text>
                  <Text style={styles.skillValue}>{block.value}</Text>
                </Text>
              );
            case 'project':
              return (
                <View key={i} style={{ marginBottom: 3 }}>
                  <View style={styles.projectTitleRow}>
                    <Text style={styles.projectTitle}>
                      {block.name}
                      {block.tech ? <Text style={styles.projectTech}> — {block.tech}</Text> : null}
                    </Text>
                    {block.dates ? (
                      <Text style={styles.projectDates}>{block.dates}</Text>
                    ) : null}
                  </View>
                  {block.bullets.map((bullet, bIdx) => (
                    <BulletRow key={bIdx} text={bullet} s={styles} />
                  ))}
                </View>
              );

            case 'job':
              return (
                <View key={i} style={{ marginBottom: 3 }}>
                  <View style={styles.jobTitleRow}>
                    <Text style={styles.jobTitle}>{block.title}</Text>
                    {block.dates ? <Text style={styles.jobDates}>{block.dates}</Text> : null}
                  </View>
                  {(block.company || block.tech) ? (
                    <View style={styles.jobSubRow}>
                      <Text style={styles.jobCompany}>{block.company || ""}</Text>
                      {block.tech ? <Text style={styles.jobTech}>{block.tech}</Text> : null}
                    </View>
                  ) : null}
                  {block.bullets.map((bullet, bIdx) => (
                    <BulletRow key={bIdx} text={bullet} s={styles} />
                  ))}
                </View>
              );
            case 'education':
              return (
                <View key={i} style={{ marginBottom: 3 }}>
                  <View style={styles.educationRow}>
                    <Text style={styles.educationDegree}>{block.degree}</Text>
                    {block.dates ? <Text style={styles.educationDates}>{block.dates}</Text> : null}
                  </View>
                  <View style={styles.educationInstitution}>
                    <Text style={styles.educationSchool}>{block.school}</Text>
                    {block.gpa ? <Text style={styles.educationGPA}>{block.gpa}</Text> : null}
                  </View>
                </View>
              );
            case 'bullet':
              return <BulletRow key={i} text={block.text} s={styles} />;
            case 'cert':
              return <BulletRow key={i} s={styles} text={(block.text || "").replace(/^[•\-\*–\s\u2022]+/, "")} />;
            case 'normal':
              return (
                <Text key={i} style={styles.summaryText}>
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
    
    const nameMatch = line.match(/\\textbf\{\\Huge\s*([^\}]+)\}/);
    if (nameMatch) {
      name = nameMatch[1];
      continue;
    }
    
    if (line.startsWith('\\small ')) {
      contact = line.substring(7).trim();
      continue;
    }
    
    const sectionMatch = line.match(/\\section\{([^\}]+)\}/);
    if (sectionMatch) {
      resultLines.push(sectionMatch[1].toUpperCase());
      continue;
    }
    
    const itemMatch = line.match(/\\item\s+(.+)/);
    if (itemMatch) {
      resultLines.push(`• ${itemMatch[1]}`);
      continue;
    }
    
    const boldMatch = line.match(/\\textbf\{([^\}]+)\}/);
    if (boldMatch) {
      resultLines.push(boldMatch[1]);
      continue;
    }
    
    const italicMatch = line.match(/\\textit\{([^\}]+)\}/);
    if (italicMatch) {
      resultLines.push(italicMatch[1]);
      continue;
    }
    
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
