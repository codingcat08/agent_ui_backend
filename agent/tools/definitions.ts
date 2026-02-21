import type { ToolDefinition } from "../types/index.js";

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: "web_search",
    description:
      "Search the web for current information. Returns a list of relevant results with titles, URLs, and snippets. " +
      "it may be helpful if you need news ",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "The search query. Be specific and concise." },
        num_results: { type: "number", description: "How many results to return (1-10). Default 5." },
      },
      required: ["query"],
    },
  },
  {
    name: "web_scrape",
    description:
      "Fetch and extract the full readable text content from a specific URL. " +
      "Use this after web_search when you need the complete content of a page rather than just the snippet.",
    input_schema: {
      type: "object",
      properties: {
        url: { type: "string", description: "The full URL to scrape." },
        extract_focus: {
          type: "string",
          description: "Optional hint about what part of the page matters. Helps trim irrelevant content.",
        },
      },
      required: ["url"],
    },
  },
  {
    name: "drive_search",
    description:
      "Search for files in the user's connected Google Drive. Returns file metadata and a content excerpt. " +
      "Use this when the task involves personal documents, internal reports, or uploaded files.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Full-text search query against Drive file names and content." },
        max_results: { type: "number", description: "Maximum files to return (1-10). Default 3." },
      },
      required: ["query"],
    },
  },
  {
    name: "vector_search",
    description:
      "Always use this to query PDF content. " +
      "Use this to  understand or information from documents, " +
      "especially PDFs. Finds relevant passages even when exact keywords differ.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Natural-language description of what you are looking for." },
        top_k: { type: "number", description: "Number of top chunks to return (1-20). Default 5." },
      },
      required: ["query"],
    },
  },
  {
    name: "finish",
    description:
      "Call this tool when you have gathered enough information to fully answer the task. " +
      "Provide a comprehensive, well-structured answer and list the sources you used.",
    input_schema: {
      type: "object",
      properties: {
        answer: {
          type: "string",
          description: "The final, complete answer to the user's task. Use markdown formatting.",
        },
        sources_used: {
          type: "array",
          description: "List of sources that informed your answer.",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              url: { type: "string" },
              snippet: { type: "string" },
              source_type: { type: "string", enum: ["web", "drive", "vector"] },
            },
            required: ["title", "source_type"],
          },
        },
      },
      required: ["answer", "sources_used"],
    },
  },
];