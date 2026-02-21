
import { DriveTokenStore, VectorStore } from "../../../agent/index.js";

export const tokenStore = new DriveTokenStore();
export const vectorStore = new VectorStore();

// vectorStore.init().catch((err) => {
//   console.error("[VectorStore] Failed to initialize Qdrant:", err);
//   process.exit(1); 
// });
vectorStore.init().then(() => {
  console.log(`[VectorStore] Ready — ${vectorStore.size} chunks, ${vectorStore.fileIds.length} files`);
}).catch((err) => {
  console.error("[VectorStore] Failed to initialize Qdrant:", err);
  process.exit(1);
});

export let lastIngestionTime: string | null = null;
export function setLastIngestionTime(t: string) {
  lastIngestionTime = t;
}