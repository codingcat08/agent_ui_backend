1. Project highlights 
agent_ui_backend/
├── agent/          ← Agent core (TypeScript) — tool loop, Drive, vector store
├── backend/        ← API server — OAuth, SSE streaming, rate limiting
└── frontend/       ← React — polished research UI

Stack: Node.js / TypeScript · OpenAI (GPT-4o-mini + OpenAI's text-embedding-3-small) · Serper.dev (web search) · Google Drive API · React + Tailwind


2. Complete Folder Structure
AGENT_UI_BACKEND/                              ← root project folder
│
├── agent/                          ← Agent module (the brain)
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   │
│   ├── index.ts                    ← Public API — import from here only
│   │
│   ├── types/
│   │   └── index.ts                ← All shared TypeScript interfaces
│   │
│   ├── core/
│   │   ├── agentLoop.ts            ← Main agent loop orchestrator
│   │   ├── llmClient.ts            ← OpenAI API wrapper + message builders
│   │   ├── systemPrompt.ts         ← System prompt builder
│   │   └── driveTokenStore.ts      ← Google OAuth2 token manager
│   │
│   ├── tools/
│   │   ├── definitions.ts          ← Tool schemas sent to the LLM
│   │   ├── executor.ts             ← Dispatches tool calls to implementations
│   │   ├── webSearch.ts            ← Serper.dev web search
│   │   ├── webScrape.ts            ← HTML fetch + text extraction
│   │   ├── driveSearch.ts          ← Google Drive full-text search
│   │   └── vectorSearch.ts         ← Semantic search over ingested content
│   │
│   └── vector/
│       ├── vectorStore.ts          ← In-memory cosine similarity store + OpenAI embed()
│       └── ingestion.ts            ← Drive → chunk → embed → store pipeline
│
├── backend/                        ← Express API server
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   │
│   └── src/
│       ├── server.ts               ← Entry point (CORS, rate limit, routes)
│       │
│       ├── routes/
│       │   ├── auth.ts             ← GET /auth/drive, GET /auth/callback
│       │   ├── agent.ts            ← POST /api/agent/run  (SSE stream)
│       │   └── drive.ts            ← GET /api/drive/status, POST /api/drive/ingest/*
│       │
│       ├── services/
│       │   ├── singletons.ts       ← Shared tokenStore + vectorStore instances
│       │   └── sse.ts              ← SSE helpers (initSSE / sendSSEEvent / closeSSE)
│       │
│       └── middleware/
│           └── errorHandler.ts     ← 404 + 500 error handlers
│
└── frontend/                       ← React + Vite UI
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── index.html
    │
    └── src/
        ├── main.tsx                ← React entry point
        ├── App.tsx                 ← Root layout (sidebar + main area)
        ├── index.css               ← Tailwind base + custom scrollbar
        │
        ├── types/
        │   └── index.ts            ← Frontend types (mirrors agent types)
        │
        ├── lib/
        │   └── api.ts              ← Typed fetch wrappers + SSE stream helpers
        │
        ├── hooks/
        │   ├── useAgent.ts         ← Agent run state machine
        │   └── useDriveStatus.ts   ← Drive connection status + polling
        │
        └── components/
            ├── TaskInput.tsx        ← Query textarea + step-count selector
            ├── DrivePanel.tsx       ← Drive connect / stats / ingest buttons
            ├── StepTrace.tsx        ← Collapsible real-time step viewer
            ├── ResultPanel.tsx      ← Markdown answer + citation badges
            └── RunningIndicator.tsx ← Live "Searching..." status during run

3. how to run the project
Clone the repo
set up environment variables
npm install  (agent, backend and frontend)
npm run build  (agent only)
npm run dev  (backend + frontend)
Open http://localhost:5173 in your browser
Click Connect Drive in the sidebar → authorize with Google
Ingestion starts automatically in the background (watch Terminal 2 logs)
Type a task and press enter



4. How it works -> 

 Browser (localhost:5173)
  │
  │  POST /api/agent/run  { task, maxSteps }
  │  ← SSE stream: step events → result event
  │
Express Backend (localhost:3000)
  │
  │  imports and calls runAgent()
  │
Agent Module
  ├── LLMClient → OpenAI API (gpt-4o-mini)
  ├── webSearch → Serper.dev
  ├── webScrape → native fetch
  ├── driveSearch → Google Drive API v3
  └── vectorSearch → VectorStore (cosine sim over OpenAI embeddings)

Google OAuth flow:
  Browser → GET /auth/drive → Google consent → GET /auth/callback → backend stores tokens → redirect to frontend