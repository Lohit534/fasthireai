/**
 * Overleaf-quality resume PDF renderer using @react-pdf/renderer.
 *
 * Layout mirrors a professional LaTeX resume template:
 *  - Times New Roman (Times-Roman / Times-Bold / Times-Italic)
 *  - 10pt body, 18pt name, 11pt section headers
 *  - A4 page, margins: 36pt top/bottom, 40pt left/right
 *  - Section headers: uppercase, full-width bottom border (0.75pt)
 *  - Experience: bold role + right-aligned dates; italic company below
 *  - Projects: bold title + right-aligned italic stack; bullets below
 *  - Education: bold degree + right-aligned year; institution + CGPA below
 *  - Skills: bold label: value (two-column)
 *  - Certifications / Achievements / Languages: bullet items
 *
 * This renderer is driven entirely by ResumeJSON — no text parsing heuristics.
 */

import React from "react";
import {
  Font,
  Document,
  Page,
  Text,
  View,
  Link,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { ResumeJSON } from "@/types/resume";
import { logger } from "@/lib/logger";

Font.registerHyphenationCallback((word) => [word]);

// ─── Styles (mirrors a professional LaTeX resume) ─────────────────────────────
const S = StyleSheet.create({
  // Page
  page: {
    fontFamily: "Times-Roman",
    fontSize: 10,
    paddingTop: 36,
    paddingBottom: 36,
    paddingHorizontal: 40,
    color: "#000000",
    backgroundColor: "#ffffff",
  },

  // ── Header ──
  name: {
    fontFamily: "Times-Bold",
    fontSize: 18,
    textAlign: "center",
    letterSpacing: 0.4,
    marginBottom: 3,
  },
  contactRow: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    marginBottom: 2,
  },
  contactText: {
    fontFamily: "Times-Roman",
    fontSize: 9.5,
    color: "#000000",
  },
  contactSep: {
    fontFamily: "Times-Roman",
    fontSize: 9.5,
    marginHorizontal: 5,
    color: "#444444",
  },
  contactLink: {
    fontFamily: "Times-Roman",
    fontSize: 9.5,
    color: "#0000EE",
    textDecoration: "underline",
  },
  headerSpacer: { height: 6 },

  // ── Section Header ──
  sectionHeader: {
    fontFamily: "Times-Bold",
    fontSize: 11,
    marginTop: 9,
    marginBottom: 3,
    paddingBottom: 1.5,
    borderBottomWidth: 0.75,
    borderBottomColor: "#000000",
    borderBottomStyle: "solid",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },

  // ── Summary ──
  summaryText: {
    fontFamily: "Times-Roman",
    fontSize: 10,
    lineHeight: 1.4,
    textAlign: "justify",
    marginBottom: 2,
  },

  // ── Skills ──
  skillRow: {
    flexDirection: "row",
    marginBottom: 2,
  },
  skillLabel: {
    fontFamily: "Times-Bold",
    fontSize: 10,
    width: 145,
    flexShrink: 0,
  },
  skillValue: {
    fontFamily: "Times-Roman",
    fontSize: 10,
    flex: 1,
    lineHeight: 1.35,
  },

  // ── Experience ──
  expBlock: { marginTop: 5, marginBottom: 3 },
  expTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 1,
  },
  expRole: {
    fontFamily: "Times-Bold",
    fontSize: 10,
    flex: 1,
  },
  expDuration: {
    fontFamily: "Times-Roman",
    fontSize: 9.5,
    textAlign: "right",
    minWidth: 90,
  },
  expCompanyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  expCompany: {
    fontFamily: "Times-Italic",
    fontSize: 9.5,
    flex: 1,
  },
  expLocation: {
    fontFamily: "Times-Italic",
    fontSize: 9.5,
    textAlign: "right",
    minWidth: 90,
  },

  // ── Projects ──
  projBlock: { marginTop: 5, marginBottom: 3 },
  projTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 2,
  },
  projTitleLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  projTitle: {
    fontFamily: "Times-Bold",
    fontSize: 10,
  },
  projLink: {
    fontFamily: "Times-Roman",
    fontSize: 9,
    color: "#0000EE",
    textDecoration: "underline",
    marginLeft: 6,
  },
  projStack: {
    fontFamily: "Times-Italic",
    fontSize: 9.5,
    color: "#333333",
    textAlign: "right",
    minWidth: 100,
    maxWidth: 200,
  },

  // ── Education ──
  eduBlock: { marginTop: 5, marginBottom: 3 },
  eduTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 1,
  },
  eduDegree: {
    fontFamily: "Times-Bold",
    fontSize: 10,
    flex: 1,
  },
  eduYear: {
    fontFamily: "Times-Roman",
    fontSize: 9.5,
    textAlign: "right",
    minWidth: 80,
  },
  eduInstRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 1,
  },
  eduInstitution: {
    fontFamily: "Times-Roman",
    fontSize: 9.5,
    flex: 1,
  },
  eduCGPA: {
    fontFamily: "Times-Roman",
    fontSize: 9.5,
    textAlign: "right",
    minWidth: 80,
  },
  eduUniversity: {
    fontFamily: "Times-Italic",
    fontSize: 9,
    color: "#333333",
    marginBottom: 1,
  },

  // ── Bullets ──
  bulletRow: {
    flexDirection: "row",
    marginBottom: 2,
    paddingLeft: 8,
  },
  bulletDot: {
    fontFamily: "Times-Roman",
    fontSize: 10,
    width: 10,
    flexShrink: 0,
  },
  bulletText: {
    fontFamily: "Times-Roman",
    fontSize: 10,
    lineHeight: 1.35,
    flex: 1,
  },

  // ── Cert / Achievement / Language items ──
  certItem: {
    fontFamily: "Times-Roman",
    fontSize: 10,
    marginBottom: 2,
  },
  langText: {
    fontFamily: "Times-Roman",
    fontSize: 10,
    marginBottom: 2,
  },
});

// ─── Helper components ────────────────────────────────────────────────────────

const SectionHeader: React.FC<{ title: string }> = ({ title }) => (
  <Text style={S.sectionHeader}>{title}</Text>
);

const Bullet: React.FC<{ text: string }> = ({ text }) => (
  <View style={S.bulletRow}>
    <Text style={S.bulletDot}>•</Text>
    <Text style={S.bulletText}>{text}</Text>
  </View>
);

// ─── Main Resume PDF Document ─────────────────────────────────────────────────

interface ResumePDFFromJSONProps {
  data: ResumeJSON;
}

export const ResumePDFFromJSON: React.FC<ResumePDFFromJSONProps> = ({ data }) => {
  const h = data.header;

  // Build contact segments: plain text parts (email, phone, location)
  const contactPlain: string[] = [];
  if (h.email) contactPlain.push(h.email);
  if (h.phone) contactPlain.push(h.phone);
  if (h.location) contactPlain.push(h.location);

  // Link segments: linkedin, github, portfolio
  const contactLinks: { label: string; url: string }[] = [];
  if (h.linkedin) {
    const url = h.linkedin.startsWith("http") ? h.linkedin : `https://${h.linkedin}`;
    contactLinks.push({ label: "LinkedIn", url });
  }
  if (h.github) {
    const url = h.github.startsWith("http") ? h.github : `https://${h.github}`;
    contactLinks.push({ label: "GitHub", url });
  }
  if (h.portfolio) {
    const url = h.portfolio.startsWith("http") ? h.portfolio : `https://${h.portfolio}`;
    contactLinks.push({ label: "Portfolio", url });
  }

  return (
    <Document>
      <Page size="A4" style={S.page}>

        {/* ── NAME ── */}
        <Text style={S.name}>{h.name}</Text>

        {/* ── CONTACT LINE 1: email | phone | location ── */}
        {contactPlain.length > 0 && (
          <View style={S.contactRow}>
            {contactPlain.map((part, i) => (
              <React.Fragment key={i}>
                <Text style={S.contactText}>{part}</Text>
                {i < contactPlain.length - 1 && (
                  <Text style={S.contactSep}>|</Text>
                )}
              </React.Fragment>
            ))}
          </View>
        )}

        {/* ── CONTACT LINE 2: LinkedIn | GitHub | Portfolio ── */}
        {contactLinks.length > 0 && (
          <View style={S.contactRow}>
            {contactLinks.map((link, i) => (
              <React.Fragment key={i}>
                <Link src={link.url} style={S.contactLink}>
                  <Text style={S.contactLink}>{link.label}</Text>
                </Link>
                {i < contactLinks.length - 1 && (
                  <Text style={S.contactSep}>|</Text>
                )}
              </React.Fragment>
            ))}
          </View>
        )}

        <View style={S.headerSpacer} />

        {/* ── PROFESSIONAL SUMMARY ── */}
        {data.summary && (
          <>
            <SectionHeader title="Professional Summary" />
            <Text style={S.summaryText}>{data.summary}</Text>
          </>
        )}

        {/* ── SKILLS (Technical + Soft) ── */}
        {data.skills && data.skills.length > 0 && (
          <>
            <SectionHeader title="Skills" />
            {data.skills.map((skill, i) => (
              <View key={i} style={S.skillRow}>
                <Text style={S.skillLabel}>{skill.category}:</Text>
                <Text style={S.skillValue}>{skill.items.join(", ")}</Text>
              </View>
            ))}
          </>
        )}

        {/* ── PROFESSIONAL EXPERIENCE ── */}
        {data.experience && data.experience.length > 0 && (
          <>
            <SectionHeader title="Professional Experience" />
            {data.experience.map((exp, i) => (
              <View key={i} style={S.expBlock}>
                {/* Role — Duration */}
                <View style={S.expTitleRow}>
                  <Text style={S.expRole}>{exp.role}</Text>
                  <Text style={S.expDuration}>{exp.duration}</Text>
                </View>
                {/* Company — Location */}
                <View style={S.expCompanyRow}>
                  <Text style={S.expCompany}>{exp.company}</Text>
                  {exp.location && (
                    <Text style={S.expLocation}>{exp.location}</Text>
                  )}
                </View>
                {/* Bullets */}
                {exp.bullets.map((b, bi) => (
                  <Bullet key={bi} text={b} />
                ))}
              </View>
            ))}
          </>
        )}

        {/* ── PROJECTS ── */}
        {data.projects && data.projects.length > 0 && (
          <>
            <SectionHeader title="Projects" />
            {data.projects.map((proj, i) => (
              <View key={i} style={S.projBlock}>
                {/* Title — Stack */}
                <View style={S.projTitleRow}>
                  <View style={S.projTitleLeft}>
                    <Text style={S.projTitle}>{proj.title}</Text>
                    {proj.link && (
                      <Link src={proj.link.startsWith("http") ? proj.link : `https://${proj.link}`} style={S.projLink}>
                        <Text style={S.projLink}> | Link</Text>
                      </Link>
                    )}
                  </View>
                  {proj.stack && proj.stack.length > 0 && (
                    <Text style={S.projStack}>{proj.stack.join(", ")}</Text>
                  )}
                </View>
                {/* Bullets */}
                {proj.bullets.map((b, bi) => (
                  <Bullet key={bi} text={b} />
                ))}
              </View>
            ))}
          </>
        )}

        {/* ── EDUCATION ── */}
        {data.education && data.education.length > 0 && (
          <>
            <SectionHeader title="Education" />
            {data.education.map((edu, i) => (
              <View key={i} style={S.eduBlock}>
                {/* Degree — Year */}
                <View style={S.eduTopRow}>
                  <Text style={S.eduDegree}>{edu.degree}</Text>
                  <Text style={S.eduYear}>{edu.year}</Text>
                </View>
                {/* Institution — CGPA */}
                <View style={S.eduInstRow}>
                  <Text style={S.eduInstitution}>{edu.institution}</Text>
                  {edu.cgpa && <Text style={S.eduCGPA}>{edu.cgpa}</Text>}
                </View>
                {/* Affiliated University (if different from institution) */}
                {edu.university && edu.university !== edu.institution && (
                  <Text style={S.eduUniversity}>{edu.university}</Text>
                )}
              </View>
            ))}
          </>
        )}

        {/* ── CERTIFICATIONS ── */}
        {data.certifications && data.certifications.length > 0 && (
          <>
            <SectionHeader title="Certifications" />
            {data.certifications.map((c, i) => (
              <Bullet key={i} text={c} />
            ))}
          </>
        )}

        {/* ── ACHIEVEMENTS ── */}
        {data.achievements && data.achievements.length > 0 && (
          <>
            <SectionHeader title="Achievements" />
            {data.achievements.map((a, i) => (
              <Bullet key={i} text={a} />
            ))}
          </>
        )}

        {/* ── LANGUAGES ── */}
        {data.languages && data.languages.length > 0 && (
          <>
            <SectionHeader title="Languages" />
            <Text style={S.langText}>{data.languages.join("   |   ")}</Text>
          </>
        )}

      </Page>
    </Document>
  );
};

// ─── PDF Generator (called from export API) ──────────────────────────────────

export async function generatePDFFromJSON(data: ResumeJSON): Promise<Buffer> {
  logger.info("[render-resume] Generating Overleaf-quality PDF from structured ResumeJSON...");
  try {
    const element = React.createElement(ResumePDFFromJSON, { data });
    const buffer = await renderToBuffer(element as any);
    logger.info(`[render-resume] PDF generated successfully: ${buffer.length} bytes`);
    return buffer;
  } catch (err: any) {
    logger.error("[render-resume] PDF generation from JSON failed:", err.message);
    throw new Error("PDF generation failed: " + err.message);
  }
}
