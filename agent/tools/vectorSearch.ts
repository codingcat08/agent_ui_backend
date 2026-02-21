import type { ToolResult, Citation } from "../types/index.js";
import type { VectorStore } from "../vector/vectorStore.ts";

export interface VectorSearchInput {
  query: string;
  top_k?: number;
}

export async function runVectorSearch(
  toolCallId: string,
  input: VectorSearchInput,
  vectorStore: VectorStore
): Promise<ToolResult> {
  const { query, top_k = 5 } = input;

  try {
    const results = await vectorStore.similaritySearch(query, top_k);

    if (results.length === 0) {
      return {
        tool_call_id: toolCallId,
        tool_name: "vector_search",
        success: true,
        output: {
          query,
          results: [],
          message: "No relevant content found in the vector store. Make sure Drive files have been ingested first.",
        },
      };
    }

    const citation: Citation = {
      title: results[0].file_name,
      url: results[0].url,
      snippet: results[0].text.slice(0, 200),
      source_type: "vector",
    };

    return {
      tool_call_id: toolCallId,
      tool_name: "vector_search",
      success: true,
      output: {
        query,
        results: results.map((r) => ({
          file_name: r.file_name,
          url: r.url,
          score: r.score,
          text: r.text,
          chunk_index: r.chunk_index,
        })),
      },
      citation,
    };
  } catch (err) {
    return {
      tool_call_id: toolCallId,
      tool_name: "vector_search",
      success: false,
      output: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}