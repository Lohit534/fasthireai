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

  // Remove elements that are definitively NOT part of the job description
  $('script, style, noscript, nav, header, footer, aside, iframe, svg, button, form, input, meta, link').remove();
  
  // Try to find the specific job description container using common classes/IDs
  let content = "";
  const selectors = [
    '#job-description',
    '.job-description',
    '.show-more-less-html__markup', // LinkedIn
    '.jobsearch-JobComponent-description', // Indeed
    '#jobDetailsSection',
    '.job-details',
    'article',
    'main',
    '.description',
    '[data-automation="jobDescription"]'
  ];

  for (const selector of selectors) {
    const el = $(selector);
    if (el.length > 0) {
      content = el.text();
      // If we got a decent chunk of text, stop looking
      if (content.length > 200) break;
    }
  }

  // Fallback: If no specific container was found, just take the body text
  if (content.length < 200) {
    content = $('body').text() || $.text();
  }

  // Aggressive whitespace and newline trimming (prevent spaces)
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
