import type { DriveFile, VectorChunk } from "../types/index.js";
import type { DriveTokenStore } from "../core/driveTokenStore.js";
import { VectorStore, embed } from "./vectorStore.js";

const CHUNK_SIZE = 800;
const CHUNK_OVERLAP = 150;

const SUPPORTED_MIME_TYPES = [
  "application/vnd.google-apps.document",
  "application/vnd.google-apps.presentation",
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/pdf",
];

function chunkText(text: string): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    chunks.push(text.slice(start, Math.min(start + CHUNK_SIZE, text.length)));
    start += CHUNK_SIZE - CHUNK_OVERLAP;
  }
  return chunks.filter((c) => c.trim().length > 20);
}

async function listDriveFiles(
  accessToken: string,
  pageToken?: string
): Promise<{ files: DriveFile[]; nextPageToken?: string }> {
  const mimeFilter = SUPPORTED_MIME_TYPES.map((m) => `mimeType='${m}'`).join(" or ");
  const url = new URL("https://www.googleapis.com/drive/v3/files");
  url.searchParams.set("q", `(${mimeFilter}) and trashed = false`);
  url.searchParams.set("pageSize", "100");
  url.searchParams.set("fields", "nextPageToken,files(id,name,mimeType,modifiedTime)");
  if (pageToken) url.searchParams.set("pageToken", pageToken);

  const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(`Drive list error: ${await res.text()}`);

  const data = (await res.json()) as {
    files: Array<{ id: string; name: string; mimeType: string; modifiedTime: string }>;
    nextPageToken?: string;
  };

  return {
    files: data.files.map((f) => ({ ...f, content: "" })),
    nextPageToken: data.nextPageToken,
  };
}

async function exportFile(file: DriveFile, accessToken: string): Promise<string> {
  const exportMap: Record<string, string> = {
    "application/vnd.google-apps.document": "text/plain",
    "application/vnd.google-apps.presentation": "text/plain",
  };

  const exportMime = exportMap[file.mimeType];
  if (exportMime) {
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${file.id}/export?mimeType=${encodeURIComponent(exportMime)}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!res.ok) return "";
    return res.text();
  }

  if (file.mimeType.startsWith("text/")) {
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!res.ok) return "";
    return res.text();
  }

  if (file.mimeType === "application/pdf") {
    console.warn(`[Ingestion] PDF extraction skipped for: ${file.name}`);
    return "";
  }

  return "";
}

export interface IngestionProgress {
  total: number;
  processed: number;
  skipped: number;
  errors: number;
  currentFile?: string;
}

type ProgressCallback = (progress: IngestionProgress) => void;

export async function ingestAllDriveFiles(
  tokenStore: DriveTokenStore,
  vectorStore: VectorStore,
  onProgress?: ProgressCallback
): Promise<IngestionProgress> {
  const accessToken = await tokenStore.getValidAccessToken();
  if (!accessToken) throw new Error("Drive not connected.");

  const allFiles: DriveFile[] = [];
  let pageToken: string | undefined;
  do {
    const { files, nextPageToken } = await listDriveFiles(accessToken, pageToken);
    allFiles.push(...files);
    pageToken = nextPageToken;
  } while (pageToken);

  const progress: IngestionProgress = { total: allFiles.length, processed: 0, skipped: 0, errors: 0 };

  for (const file of allFiles) {
    progress.currentFile = file.name;
    onProgress?.(progress);
    try {
      const content = await exportFile(file, accessToken);
      if (!content.trim()) { progress.skipped++; continue; }

      const chunks = chunkText(content);
      const vectorChunks: VectorChunk[] = [];
      for (let i = 0; i < chunks.length; i++) {
        const embedding = await embed(chunks[i]);
        vectorChunks.push({
          id: `${file.id}::${i}`,
          file_id: file.id,
          file_name: file.name,
          chunk_index: i,
          text: chunks[i],
          embedding,
          url: `https://drive.google.com/file/d/${file.id}`,
        });
      }
      vectorStore.addChunks(vectorChunks);
      progress.processed++;
    } catch (err) {
      console.error(`[Ingestion] Error processing ${file.name}:`, err);
      progress.errors++;
    }
  }

  progress.currentFile = undefined;
  onProgress?.(progress);
  return progress;
}

export async function ingestIncrementalDriveFiles(
  tokenStore: DriveTokenStore,
  vectorStore: VectorStore,
  lastRunTimestamp: string,
  onProgress?: ProgressCallback
): Promise<IngestionProgress> {
  const accessToken = await tokenStore.getValidAccessToken();
  if (!accessToken) throw new Error("Drive not connected.");

  const mimeFilter = SUPPORTED_MIME_TYPES.map((m) => `mimeType='${m}'`).join(" or ");
  const query = `(${mimeFilter}) and trashed = false and modifiedTime > '${lastRunTimestamp}'`;
  const url = new URL("https://www.googleapis.com/drive/v3/files");
  url.searchParams.set("q", query);
  url.searchParams.set("pageSize", "100");
  url.searchParams.set("fields", "files(id,name,mimeType,modifiedTime)");

  const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(`Drive incremental list error: ${await res.text()}`);

  const data = (await res.json()) as {
    files: Array<{ id: string; name: string; mimeType: string; modifiedTime: string }>;
  };

  const changedFiles: DriveFile[] = data.files.map((f) => ({ ...f, content: "" }));
  const progress: IngestionProgress = { total: changedFiles.length, processed: 0, skipped: 0, errors: 0 };

  for (const file of changedFiles) {
    progress.currentFile = file.name;
    onProgress?.(progress);
    try {
      vectorStore.removeFileChunks(file.id);
      const content = await exportFile(file, accessToken);
      if (!content.trim()) { progress.skipped++; continue; }

      const chunks = chunkText(content);
      const vectorChunks: VectorChunk[] = [];
      for (let i = 0; i < chunks.length; i++) {
        const embedding = await embed(chunks[i]);
        vectorChunks.push({
          id: `${file.id}::${i}`,
          file_id: file.id,
          file_name: file.name,
          chunk_index: i,
          text: chunks[i],
          embedding,
          url: `https://drive.google.com/file/d/${file.id}`,
        });
      }
      vectorStore.addChunks(vectorChunks);
      progress.processed++;
    } catch (err) {
      console.error(`[Ingestion] Error processing ${file.name}:`, err);
      progress.errors++;
    }
  }

  progress.currentFile = undefined;
  onProgress?.(progress);
  return progress;
}