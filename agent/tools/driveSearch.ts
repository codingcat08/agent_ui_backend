import "dotenv/config";
import type { ToolResult, Citation } from "../types/index.js";
import type { DriveTokenStore } from "../core/driveTokenStore.js";

export interface DriveSearchInput {
  query: string;
  max_results?: number;
}

async function exportFileAsText(fileId: string, mimeType: string, accessToken: string): Promise<string> {
  const exportMap: Record<string, string> = {
    "application/vnd.google-apps.document": "text/plain",
    "application/vnd.google-apps.spreadsheet": "text/csv",
    "application/vnd.google-apps.presentation": "text/plain",
  };

  const exportMime = exportMap[mimeType];
  if (exportMime) {
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=${encodeURIComponent(exportMime)}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!res.ok) return "";
    return res.text();
  }

  if (mimeType === "application/pdf") {
    return "[PDF content – use vector_search for semantic retrieval of ingested PDFs]";
  }

  if (mimeType.startsWith("text/")) {
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!res.ok) return "";
    return res.text();
  }

  return "";
}

export async function runDriveSearch(
  toolCallId: string,
  input: DriveSearchInput,
  tokenStore: DriveTokenStore
): Promise<ToolResult> {
  const { query, max_results = 3 } = input;

  const accessToken = await tokenStore.getValidAccessToken();
  if (!accessToken) {
    return {
      tool_call_id: toolCallId,
      tool_name: "drive_search",
      success: false,
      output: null,
      error: "Google Drive is not connected. Please complete OAuth flow first.",
    };
  }

  try {
    // If DRIVE_FOLDER_ID is set in .env, scope search to that folder only.
    // Otherwise search the entire Drive.
    const folderFilter = process.env.DRIVE_FOLDER_ID
      ? `'${process.env.DRIVE_FOLDER_ID}' in parents and `
      : "";

    const driveQuery = `${folderFilter}fullText contains '${query.replace(/'/g, "\\'")}' and trashed = false`;

    const listUrl = new URL("https://www.googleapis.com/drive/v3/files");
    listUrl.searchParams.set("q", driveQuery);
    listUrl.searchParams.set("pageSize", String(Math.min(max_results, 10)));
    listUrl.searchParams.set("fields", "files(id,name,mimeType,webViewLink,modifiedTime)");
    listUrl.searchParams.set("orderBy", "modifiedTime desc");

    const listRes = await fetch(listUrl.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!listRes.ok) throw new Error(`Drive API error ${listRes.status}: ${await listRes.text()}`);

    const listData = (await listRes.json()) as {
      files?: Array<{ id: string; name: string; mimeType: string; webViewLink?: string; modifiedTime?: string }>;
    };

    const files = listData.files ?? [];

    if (files.length === 0) {
      return {
        tool_call_id: toolCallId,
        tool_name: "drive_search",
        success: true,
        output: { query, results: [], message: "No matching files found in Drive." },
      };
    }

    const results = await Promise.all(
      files.map(async (file) => {
        const content = await exportFileAsText(file.id, file.mimeType, accessToken);
        return {
          id: file.id,
          name: file.name,
          mimeType: file.mimeType,
          url: file.webViewLink ?? `https://drive.google.com/file/d/${file.id}`,
          modifiedTime: file.modifiedTime ?? "",
          excerpt: content.slice(0, 500) + (content.length > 500 ? "..." : ""),
        };
      })
    );

    const citation: Citation = {
      title: results[0].name,
      url: results[0].url,
      snippet: results[0].excerpt.slice(0, 200),
      source_type: "drive",
    };

    return {
      tool_call_id: toolCallId,
      tool_name: "drive_search",
      success: true,
      output: { query, results },
      citation,
    };
  } catch (err) {
    return {
      tool_call_id: toolCallId,
      tool_name: "drive_search",
      success: false,
      output: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}