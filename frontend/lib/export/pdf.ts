import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import { logger } from "../logger";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatInline(text: string): string {
  let escaped = escapeHtml(text);
  // Replace **bold**
  escaped = escaped.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  // Replace *italic*
  escaped = escaped.replace(/\*(.*?)\*/g, "<em>$1</em>");
  return escaped;
}

export async function generatePDF(resumeText: string): Promise<Buffer> {
  let browser = null;
  try {
    logger.info("Initializing Puppeteer PDF generation with custom parsing...");
    
    // Parse lines to build the structured HTML
    const lines = resumeText.split(/\r?\n/).map(line => line.trim());
    let htmlBody = "";
    let inList = false;
    let name = "";
    let headerEnded = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line) {
        if (inList) {
          htmlBody += "</ul>\n";
          inList = false;
        }
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

      if (!headerEnded) {
        if (!name) {
          name = line.replace(/^[#\s\-\*\_]+|[\#\s\-\*\_]+$/g, "").trim();
          htmlBody += `<h1>${escapeHtml(name)}</h1>\n`;
        } else {
          // Replace pipe symbols with em-dashes
          let contactLine = line.replace(/ \| /g, " — ");
          htmlBody += `<div class="contact">${escapeHtml(contactLine)}</div>\n`;
        }
        continue;
      }

      // 3. Detect column alignment lines with 3 or more spaces
      const columns = line.split(/\s{3,}/);
      if (columns.length > 1) {
        if (inList) {
          htmlBody += "</ul>\n";
          inList = false;
        }
        htmlBody += `<div class="line-row"><span class="left">${formatInline(columns[0])}</span><span class="right">${formatInline(columns[1])}</span></div>\n`;
        continue;
      }

      // 4. Detect Bullet points: lines starting with •, -, * or standard Unicode bullet characters
      if (/^[•\-*\u2022]/.test(line)) {
        if (!inList) {
          htmlBody += "<ul>\n";
          inList = true;
        }
        // Strip the bullet symbol from the text
        const cleanBulletText = line.replace(/^[•\-*\u2022]\s*/, "");
        htmlBody += `<li>${formatInline(cleanBulletText)}</li>\n`;
        continue;
      } else {
        if (inList) {
          htmlBody += "</ul>\n";
          inList = false;
        }
      }

      // 5. Detect Section headers
      if (isHeader) {
        let cleanHeader = line;
        if (isMarkdownHeader) {
          cleanHeader = line.substring(3).trim();
        } else if (line.endsWith(":")) {
          cleanHeader = line.slice(0, -1);
        }
        htmlBody += `<h2>${escapeHtml(cleanHeader)}</h2>\n`;
        if (isSetextHeader) {
          i++; // Skip the next underline divider line
        }
      } else {
        // 6. Normal line (regular text paragraph)
        htmlBody += `<p>${formatInline(line)}</p>\n`;
      }
    }

    if (inList) {
      htmlBody += "</ul>\n";
    }

    // Embed parsed HTML body inside structured, styling template
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            body {
              font-family: 'Times New Roman', Times, serif;
              font-size: 11pt;
              line-height: 1.35;
              color: #000000;
              margin: 0;
              padding: 0;
            }
            h1 {
              font-family: 'Times New Roman', Times, serif;
              font-size: 18pt;
              margin: 0 0 4px 0;
              text-align: center;
              font-weight: bold;
            }
            .contact {
              font-family: 'Times New Roman', Times, serif;
              font-size: 10pt;
              color: #222222;
              text-align: center;
              margin-bottom: 4px;
            }
            h2 {
              font-family: 'Times New Roman', Times, serif;
              font-size: 11pt;
              text-transform: none;
              letter-spacing: 0.5px;
              border-bottom: 1px solid #000000;
              margin: 12px 0 6px 0;
              padding-bottom: 2px;
              font-weight: bold;
            }
            p {
              font-family: 'Times New Roman', Times, serif;
              margin: 0 0 4px 0;
              font-size: 11pt;
              text-align: justify;
            }
            ul {
              margin: 0 0 6px 0;
              padding-left: 18px;
            }
            li {
              font-family: 'Times New Roman', Times, serif;
              margin-bottom: 2px;
              font-size: 11pt;
              text-align: justify;
            }
            .line-row {
              display: flex;
              justify-content: space-between;
              font-family: 'Times New Roman', Times, serif;
              font-size: 11pt;
              margin-bottom: 3px;
            }
            .line-row .left {
              /* bold is decided by markdown formatting */
            }
            .line-row .right {
              text-align: right;
              /* italicized or bold is decided by markdown formatting */
            }
          </style>
        </head>
        <body>
          ${htmlBody}
        </body>
      </html>
    `;

    let executablePath = "";
    let args = [];
    let headless: any = "shell";

    const isProd = process.env.NODE_ENV === "production" || !!process.env.VERCEL;

    if (isProd) {
      executablePath = await chromium.executablePath();
      args = chromium.args;
      headless = (chromium as any).headless === "true" || (chromium as any).headless === true ? true : "shell";
    } else {
      const fs = require("fs");
      const localPaths = [
        "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
        "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "/usr/bin/google-chrome"
      ];
      for (const p of localPaths) {
        if (fs.existsSync(p)) {
          executablePath = p;
          break;
        }
      }
      args = ["--no-sandbox", "--disable-setuid-sandbox"];
      headless = true;
    }

    if (executablePath) {
      browser = await puppeteer.launch({
        args: args,
        executablePath: executablePath,
        headless: headless,
      });
    } else {
      browser = await puppeteer.launch({
        headless: true,
      });
    }
    
    const page = await browser.newPage();
    await page.setContent(htmlContent);
    
    const pdf = await page.pdf({
      format: "A4",
      margin: {
        top: "20mm",
        bottom: "20mm",
        left: "15mm",
        right: "15mm"
      }
    });
    
    logger.info("PDF generation completed successfully.");
    return Buffer.from(pdf);
  } catch (error) {
    logger.error("Puppeteer PDF generation failed. Using text fallback.", error);
    // Simple basic PDF-structured fallback buffer
    const fallbackText = `%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources << >> /MediaBox [0 0 595 842] /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length ${resumeText.length} >>\nstream\n${resumeText}\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f\n0000000009 00000 n\n0000000056 00000 n\n0000000111 00000 n\n0000000212 00000 n\ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n320\n%%EOF`;
    return Buffer.from(fallbackText);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
