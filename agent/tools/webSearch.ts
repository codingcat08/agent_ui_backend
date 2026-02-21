import type { ToolResult, Citation } from "../types/index.js";

export interface WebSearchInput {
  query: string;
  num_results?: number;
}

export async function runWebSearch(
  toolCallId: string,
  input: WebSearchInput
): Promise<ToolResult> {
  const { query, num_results = 5 } = input;
  const apiKey = process.env.SERPER_API_KEY;

  if (!apiKey) {
    return {
      tool_call_id: toolCallId,
      tool_name: "web_search",
      success: false,
      output: null,
      error: "SERPER_API_KEY is not set. Get a free key at https://serper.dev",
    };
  }

  try {
    const response = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": apiKey,
      },
      body: JSON.stringify({ q: query, num: Math.min(num_results, 10), gl: "us", hl: "en" }),
    });

    if (!response.ok) {
      throw new Error(`Serper API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as {
      organic?: Array<{ title: string; link: string; snippet?: string }>;
      answerBox?: { answer?: string };
    };

    const items = (data.organic ?? []).map((r) => ({
      title: r.title,
      url: r.link,
      snippet: r.snippet ?? "",
    }));

    if (data.answerBox?.answer && items.length > 0) {
      items[0].snippet = `[Quick answer: ${data.answerBox.answer}] ${items[0].snippet}`;
    }

    const citation: Citation | undefined =
      items.length > 0
        ? { title: items[0].title, url: items[0].url, snippet: items[0].snippet, source_type: "web" }
        : undefined;

    return {
      tool_call_id: toolCallId,
      tool_name: "web_search",
      success: true,
      output: { query, results: items, result_count: items.length },
      citation,
    };
  } catch (err) {
    return {
      tool_call_id: toolCallId,
      tool_name: "web_search",
      success: false,
      output: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}