import type { ToolResult, Citation } from "../types/index.js";

export interface WebScrapeInput {
  url: string;
  extract_focus?: string;
}

const MAX_CHARS = 8_000;

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<\/(p|div|li|h[1-6]|br|tr|section|article)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? match[1].trim() : "Untitled Page";
}

export async function runWebScrape(
  toolCallId: string,
  input: WebScrapeInput
): Promise<ToolResult> {
  const { url, extract_focus } = input;

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; AIAgent/1.0)",
        Accept: "text/html,application/xhtml+xml,*/*",
      },
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("text/plain")) {
      throw new Error(`Unsupported content type: ${contentType}`);
    }

    const html = await response.text();
    const title = extractTitle(html);
    let text = htmlToText(html);

    if (text.length > MAX_CHARS) {
      if (extract_focus) {
        const focusIdx = text.toLowerCase().indexOf(extract_focus.toLowerCase());
        if (focusIdx !== -1) {
          const start = Math.max(0, focusIdx - 200);
          text = text.slice(start, start + MAX_CHARS);
        } else {
          text = text.slice(0, MAX_CHARS);
        }
      } else {
        text = text.slice(0, MAX_CHARS);
      }
      text += "\n\n[... content truncated ...]";
    }

    const citation: Citation = { title, url, snippet: text.slice(0, 200), source_type: "web" };

    return {
      tool_call_id: toolCallId,
      tool_name: "web_scrape",
      success: true,
      output: { url, title, content: text, char_count: text.length },
      citation,
    };
  } catch (err) {
    return {
      tool_call_id: toolCallId,
      tool_name: "web_scrape",
      success: false,
      output: null,
      error: `Failed to scrape ${url}: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}