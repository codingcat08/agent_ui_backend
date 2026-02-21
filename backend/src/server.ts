import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import authRouter from "./routes/auth.js";
import agentRouter from "./routes/agent.js";
import driveRouter from "./routes/drive.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";

const app = express();
const PORT = Number(process.env.PORT ?? 3000);
const FRONTEND_URL = process.env.FRONTEND_URL ?? "http://localhost:5173";

app.use(helmet({ crossOriginEmbedderPolicy: false }));
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true,
  methods: ["GET", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

const agentLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: "Too many requests, please wait a moment." },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/auth", authRouter);
app.use("/api/agent", agentLimiter, agentRouter);
app.use("/api/drive", driveRouter);

app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`\n🚀 Agent backend running at http://localhost:${PORT}`);
  console.log(`   Frontend allowed: ${FRONTEND_URL}`);
  console.log(`   Drive OAuth redirect: ${process.env.APP_BASE_URL}/auth/callback\n`);
});