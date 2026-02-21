import OpenAI from "openai";
import type { VectorChunk } from "../types/index.js";

const COLLECTION_NAME = "libra_ai";
const VECTOR_DIM = 1536; 

export interface ScoredChunk {
  file_name: string;
  url?: string;
  text: string;
  score: number;
  chunk_index: number;
  file_id: string;
}

let _openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!_openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is not set.");
    _openaiClient = new OpenAI({ apiKey });
  }
  return _openaiClient;
}

export async function embed(text: string): Promise<number[]> {
  const response = await getOpenAI().embeddings.create({
    model: "text-embedding-3-small",
    input: text,
    encoding_format: "float",
  });
  return response.data[0].embedding;
}

function getQdrantConfig(): { url: string; apiKey: string } {
  const url = process.env.QDRANT_URL;
  const apiKey = process.env.QDRANT_API_KEY;
  if (!url) throw new Error("QDRANT_URL is not set in environment variables.");
  if (!apiKey) throw new Error("QDRANT_API_KEY is not set in environment variables.");
  return { url: url.replace(/\/$/, ""), apiKey };
}

async function qdrantRequest(
  method: string,
  path: string,
  body?: unknown
): Promise<unknown> {
  const { url, apiKey } = getQdrantConfig();

  const res = await fetch(`${url}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "api-key": apiKey,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  const text = await res.text();

  if (!res.ok) {
    throw new Error(`Qdrant ${method} ${path} failed (${res.status}): ${text}`);
  }

  return text ? JSON.parse(text) : null;
}

export class VectorStore {
  private _size = 0;
  private _fileIds = new Set<string>();

  async init(): Promise<void> {
    try {
      await qdrantRequest("GET", `/collections/${COLLECTION_NAME}`);
      console.log(`[VectorStore] Collection "${COLLECTION_NAME}" already exists.`);

      await this.syncCounters();
    } catch {
      console.log(`[VectorStore] Creating collection "${COLLECTION_NAME}"...`);
      await qdrantRequest("PUT", `/collections/${COLLECTION_NAME}`, {
        vectors: {
          size: VECTOR_DIM,
          distance: "Cosine",
        },
      });

      await qdrantRequest(
        "PUT",
        `/collections/${COLLECTION_NAME}/index`,
        {
          field_name: "file_id",
          field_schema: "keyword",
        }
      );

      console.log(`[VectorStore] Collection created.`);
    }
  }


  async addChunks(chunks: VectorChunk[]): Promise<void> {
    if (chunks.length === 0) return;

    const points = chunks.map((chunk) => ({
      id: stringToUint(chunk.id),
      vector: chunk.embedding,
      payload: {
        chunk_id: chunk.id,
        file_id: chunk.file_id,
        file_name: chunk.file_name,
        chunk_index: chunk.chunk_index,
        text: chunk.text,
        url: chunk.url ?? null,
      },
    }));

    // Qdrant batches of 100
    const BATCH = 100;
    for (let i = 0; i < points.length; i += BATCH) {
      await qdrantRequest("PUT", `/collections/${COLLECTION_NAME}/points`, {
        points: points.slice(i, i + BATCH),
      });
    }

    this._size += chunks.length;
    for (const c of chunks) this._fileIds.add(c.file_id);
  }

  async removeFileChunks(fileId: string): Promise<void> {
    await qdrantRequest(
      "POST",
      `/collections/${COLLECTION_NAME}/points/delete`,
      {
        filter: {
          must: [{ key: "file_id", match: { value: fileId } }],
        },
      }
    );
    this._fileIds.delete(fileId);
    await this.syncCounters();
  }

  async similaritySearch(query: string, topK = 5): Promise<ScoredChunk[]> {
    const queryEmbedding = await embed(query);

    const result = (await qdrantRequest(
      "POST",
      `/collections/${COLLECTION_NAME}/points/search`,
      {
        vector: queryEmbedding,
        limit: topK,
        with_payload: true,
      }
    )) as {
      result: Array<{
        score: number;
        payload: {
          file_name: string;
          file_id: string;
          chunk_index: number;
          text: string;
          url?: string;
        };
      }>;
    };

    return (result.result ?? []).map((r) => ({
      file_name: r.payload.file_name,
      url: r.payload.url,
      text: r.payload.text,
      score: r.score,
      chunk_index: r.payload.chunk_index,
      file_id: r.payload.file_id,
    }));
  }

  get size(): number {
    return this._size;
  }

  get fileIds(): string[] {
    return [...this._fileIds];
  }

  private async syncCounters(): Promise<void> {
    try {
      const info = (await qdrantRequest(
        "GET",
        `/collections/${COLLECTION_NAME}`
      )) as { result?: { points_count?: number } };

      this._size = info.result?.points_count ?? 0;

      const scroll = (await qdrantRequest(
        "POST",
        `/collections/${COLLECTION_NAME}/points/scroll`,
        { limit: 10000, with_payload: ["file_id"], with_vector: false }
      )) as { result?: { points?: Array<{ payload: { file_id: string } }> } };

      const ids = (scroll.result?.points ?? []).map((p) => p.payload.file_id);
      this._fileIds = new Set(ids);
    } catch (err) {
      console.warn("[VectorStore] syncCounters failed:", err);
    }
  }
}

function stringToUint(s: string): number {
  let hash = 5381;
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) + hash) ^ s.charCodeAt(i);
  }
  return Math.abs(hash >>> 0);
}