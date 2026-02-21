import OpenAI from "openai";
import type { VectorChunk } from "../types/index.js";

export interface ScoredChunk {
  file_name: string;
  url?: string;
  text: string;
  score: number;
  chunk_index: number;
  file_id: string;
}

let _openaiClient: OpenAI | null = null;

function getClient(): OpenAI {
  if (!_openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is not set.");
    _openaiClient = new OpenAI({ apiKey });
  }
  return _openaiClient;
}

export async function embed(text: string): Promise<number[]> {
  const client = getClient();
  const response = await client.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
    encoding_format: "float",
  });
  return response.data[0].embedding;
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

export class VectorStore {
  private chunks: VectorChunk[] = [];

  addChunks(chunks: VectorChunk[]): void {
    for (const chunk of chunks) {
      const existing = this.chunks.findIndex((c) => c.id === chunk.id);
      if (existing !== -1) {
        this.chunks[existing] = chunk;
      } else {
        this.chunks.push(chunk);
      }
    }
  }

  removeFileChunks(fileId: string): void {
    this.chunks = this.chunks.filter((c) => c.file_id !== fileId);
  }

  get size(): number { return this.chunks.length; }

  get fileIds(): string[] {
    return [...new Set(this.chunks.map((c) => c.file_id))];
  }

  async similaritySearch(query: string, topK = 5): Promise<ScoredChunk[]> {
    if (this.chunks.length === 0) return [];
    const queryEmbedding = await embed(query);
    return this.chunks
      .map((chunk) => ({ ...chunk, score: cosineSimilarity(queryEmbedding, chunk.embedding) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map((c) => ({
        file_name: c.file_name,
        url: c.url,
        text: c.text,
        score: c.score,
        chunk_index: c.chunk_index,
        file_id: c.file_id,
      }));
  }

  serialize(): VectorChunk[] { return [...this.chunks]; }
  restore(chunks: VectorChunk[]): void { this.chunks = chunks; }
}