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

export async function generatePDF(resumeText: string): Promise<Buffer> {
  let browser = null;
  try {
    logger.info("Initializing Puppeteer PDF generation with custom parsing...");
    
    // Parse lines to build the structured HTML
    const lines = resumeText.split(/\r?\n/).map(line => line.trim());
    let htmlBody = "";
    let inList = false;
    let name = "";
    let contact = "";

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line) {
        if (inList) {
          htmlBody += "</ul>\n";
          inList = false;
        }
        continue;
      }

      // 1. Detect Name: first non-empty line
      if (!name) {
        name = line;
        htmlBody += `<h1>${escapeHtml(line)}</h1>\n`;
        continue;
      }

      // 2. Detect Contact Info: lines containing @ or matching a simple phone pattern
      if (!contact && (line.includes("@") || /\b\d{10}\b|\+\d{2}/.test(line))) {
        contact = line;
        htmlBody += `<div class="contact">${escapeHtml(line)}</div>\n`;
        continue;
      }

      // 3. Detect column alignment lines with 3 or more spaces
      const columns = line.split(/\s{3,}/);
      if (columns.length > 1) {
        if (inList) {
          htmlBody += "</ul>\n";
          inList = false;
        }
        htmlBody += `<div class="line-row"><span class="left">${escapeHtml(columns[0])}</span><span class="right">${escapeHtml(columns[1])}</span></div>\n`;
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
        htmlBody += `<li>${escapeHtml(cleanBulletText)}</li>\n`;
        continue;
      } else {
        if (inList) {
          htmlBody += "</ul>\n";
          inList = false;
        }
      }

      // 5. Detect Section headers: ALL CAPS lines (length > 3) or lines ending with ":"
      const isHeader = (line.toUpperCase() === line && line.length > 3) || line.endsWith(":");
      if (isHeader) {
        const cleanHeader = line.endsWith(":") ? line.slice(0, -1) : line;
        htmlBody += `<h2>${escapeHtml(cleanHeader)}</h2>\n`;
      } else {
        // 6. Normal line (regular text paragraph)
        htmlBody += `<p>${escapeHtml(line)}</p>\n`;
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
              text-transform: uppercase;
            }
            .contact {
              font-family: 'Times New Roman', Times, serif;
              font-size: 10pt;
              color: #222222;
              text-align: center;
              margin-bottom: 12px;
            }
            h2 {
              font-family: 'Times New Roman', Times, serif;
              font-size: 11pt;
              text-transform: uppercase;
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
              font-weight: bold;
            }
            .line-row .right {
              font-weight: bold;
              text-align: right;
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
