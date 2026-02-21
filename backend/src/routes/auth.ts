import { Router } from "express";
import { tokenStore, vectorStore, setLastIngestionTime } from "../services/singletons.js";
import { ingestAllDriveFiles } from "../../../agent/index.js";

const router = Router();
const REDIRECT_URI = () => `${process.env.APP_BASE_URL ?? "http://localhost:3000"}/auth/callback`;

router.get("/drive", (_req, res) => {
  const url = tokenStore.getAuthUrl(REDIRECT_URI());
  res.redirect(url);
});

router.get("/callback", async (req, res) => {
  const { code, error } = req.query;
  const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:5173";

  if (error || !code || typeof code !== "string") {
    return res.redirect(`${frontendUrl}/?auth=error&reason=${String(error ?? "no_code")}`);
  }

  try {
    await tokenStore.exchangeCode(code, REDIRECT_URI());

    ingestAllDriveFiles(tokenStore, vectorStore, (progress) => {
      console.log(`[Ingestion] ${progress.processed}/${progress.total} – ${progress.currentFile ?? "done"}`);
    })
      .then(() => { setLastIngestionTime(new Date().toISOString()); console.log("[Ingestion] Complete."); })
      .catch((err) => console.error("[Ingestion] Error:", err));

    return res.redirect(`${frontendUrl}/?auth=success`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Auth] Callback error:", msg);
    return res.redirect(`${frontendUrl}/?auth=error&reason=${encodeURIComponent(msg)}`);
  }
});

router.delete("/drive", (_req, res) => {
  tokenStore.disconnect();
  res.json({ ok: true });
});

export default router;