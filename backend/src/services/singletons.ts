import { DriveTokenStore, VectorStore } from "../../../agent/index.js";

export const tokenStore = new DriveTokenStore();
export const vectorStore = new VectorStore();

export let lastIngestionTime: string | null = null;
export function setLastIngestionTime(t: string) {
  lastIngestionTime = t;
}