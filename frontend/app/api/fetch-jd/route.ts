/**
 * POST /api/fetch-jd
 *
 * Server-side job description URL fetcher.
 * Bypasses CORS restrictions that prevent client-side fetching of LinkedIn/Indeed/Naukri pages.
 * Strips HTML and returns clean job description text.
 */
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 15;

// Multiple proxy fallbacks for reliability
const PROXIES = [
  (url: string) => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
];

import * as cheerio from "cheerio";

function extractJobDescription(html: string): string {
  if (!html) return "";
  
  const $ = cheerio.load(html);

  // 1. Remove elements that are definitively NOT part of the job description
  $('script, style, noscript, nav, header, footer, aside, iframe, svg, button, form, input, meta, link').remove();
  
  // Remove layout elements based on typical class/id names
  $('[class*="nav"], [class*="menu"], [class*="header"], [class*="footer"], [class*="sidebar"], [class*="cookie"], [class*="popup"], [class*="banner"], [id*="nav"], [id*="menu"], [id*="header"], [id*="footer"], [id*="sidebar"]').remove();

  // 2. Try to find the specific job description container using common classes/IDs
  let content = "";
  const selectors = [
    '#job-description',
    '.job-description',
    '.show-more-less-html__markup', // LinkedIn
    '.jobsearch-JobComponent-description', // Indeed
    '#jobDetailsSection',
    '.job-details',
    '[data-automation="jobDescription"]',
    '.description',
    'article',
    'main',
  ];

  for (const selector of selectors) {
    const el = $(selector);
    if (el.length > 0) {
      // If multiple elements match, get the one with the most text
      let maxText = "";
      el.each((_, e) => {
        const text = $(e).text().trim();
        if (text.length > maxText.length) maxText = text;
      });
      content = maxText;
      if (content.length > 200) break;
    }
  }

  // 3. Fallback: Density Heuristic
  // If specific containers aren't found, find the deepest node with the most dense text (paragraphs/list items)
  if (content.length < 200) {
    let bestNode = null;
    let maxScore = 0;
    
    $('div, section').each((_, el) => {
      const $el = $(el);
      const textLength = $el.text().length;
      if (textLength < 200) return;
      
      const pCount = $el.find('p, li, br').length;
      const score = textLength * Math.log(pCount + 2); // Density score
      const depth = $el.parents().length; // Depth multiplier (prefer deeper specific nodes over root wrapper)
      const finalScore = score * depth;

      if (finalScore > maxScore) {
        maxScore = finalScore;
        bestNode = el;
      }
    });

    if (bestNode) {
      content = $(bestNode).text();
    } else {
      content = $('body').text() || $.text();
    }
  }

  // 4. Aggressive whitespace and newline trimming (prevent spaces)
  return content
    // Decode common HTML entities (cheerio does most of this, but just in case)
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&bull;/g, "•")
    .replace(/&#\d+;/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    // Replace multiple newlines/tabs with a single newline
    .replace(/[\r\n\t]+/g, "\n")
    // Replace multiple spaces with a single space
    .replace(/[ ]{2,}/g, " ")
    // Remove space at the beginning of a line
    .replace(/^\s+/gm, "")
    // Remove blank lines completely
    .replace(/\n{2,}/g, "\n\n")
    .trim();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const url = (body.url || "").trim();

    if (!url || !url.startsWith("http")) {
      return NextResponse.json({ error: "Invalid URL provided." }, { status: 400 });
    }

    logger.info(`[fetch-jd] Fetching JD from: ${url}`);

    // Strategy 1: Direct server-side fetch (works for many public job boards)
    try {
      const directRes = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5",
        },
        signal: AbortSignal.timeout(8000),
      });

      if (directRes.ok) {
        const contentType = directRes.headers.get("content-type") || "";
        if (contentType.includes("text/html") || contentType.includes("text/plain")) {
          const html = await directRes.text();
          const text = extractJobDescription(html).slice(0, 8000);
          if (text.length >= 100) {
            logger.info(`[fetch-jd] Direct fetch succeeded: ${text.length} chars`);
            return NextResponse.json({ text, source: "direct" });
          }
        }
      }
    } catch (directErr: any) {
      logger.warn("[fetch-jd] Direct fetch failed:", directErr?.message);
    }

    // Strategy 2: Try proxy fallbacks
    for (const buildProxy of PROXIES) {
      try {
        const proxyUrl = buildProxy(url);
        const proxyRes = await fetch(proxyUrl, {
          signal: AbortSignal.timeout(8000),
        });

        if (proxyRes.ok) {
          const json = await proxyRes.json().catch(() => null);
          const html: string = json?.contents || json?.data || "";

          if (html && html.length > 200) {
            const text = extractJobDescription(html).slice(0, 8000);
            if (text.length >= 100) {
              logger.info(`[fetch-jd] Proxy fetch succeeded: ${text.length} chars`);
              return NextResponse.json({ text, source: "proxy" });
            }
          }
        }
      } catch (_e) {
        // Try next proxy
      }
    }

    // All strategies failed
    return NextResponse.json(
      { error: "Could not extract text from this URL. LinkedIn/Naukri require login — please copy and paste the job description text directly." },
      { status: 422 }
    );

  } catch (error: any) {
    logger.error("[fetch-jd] Unhandled error:", error?.message);
    return NextResponse.json(
      { error: "Failed to fetch job description. Please paste it manually." },
      { status: 500 }
    );
  }
}
