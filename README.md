# Agent UI Backend

## Project Highlights

```
agent_ui_backend/
├── agent/      ← Agent core (TypeScript) — tool loop, Drive, vector store
├── backend/    ← API server — OAuth, SSE streaming, rate limiting
└── frontend/   ← React — polished research UI
```

**Stack:**

- Node.js / TypeScript
- OpenAI (GPT-4o-mini + text-embedding-3-small)
- Serper.dev (web search)
- Google Drive API
- React + Tailwind

---

## Complete Folder Structure

```
AGENT_UI_BACKEND/
│
├── agent/
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   │
│   ├── index.ts
│   │
│   ├── types/
│   │   └── index.ts
│   │
│   ├── core/
│   │   ├── agentLoop.ts
│   │   ├── llmClient.ts
│   │   ├── systemPrompt.ts
│   │   └── driveTokenStore.ts
│   │
│   ├── tools/
│   │   ├── definitions.ts
│   │   ├── executor.ts
│   │   ├── webSearch.ts
│   │   ├── webScrape.ts
│   │   ├── driveSearch.ts
│   │   └── vectorSearch.ts
│   │
│   └── vector/
│       ├── vectorStore.ts
│       └── ingestion.ts
│
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   │
│   └── src/
│       ├── server.ts
│       │
│       ├── routes/
│       │   ├── auth.ts
│       │   ├── agent.ts
│       │   └── drive.ts
│       │
│       ├── services/
│       │   ├── singletons.ts
│       │   └── sse.ts
│       │
│       └── middleware/
│           └── errorHandler.ts
│
└── frontend/
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── index.html
    │
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── index.css
        │
        ├── types/
        │   └── index.ts
        │
        ├── lib/
        │   └── api.ts
        │
        ├── hooks/
        │   ├── useAgent.ts
        │   └── useDriveStatus.ts
        │
        └── components/
            ├── TaskInput.tsx
            ├── DrivePanel.tsx
            ├── StepTrace.tsx
            ├── ResultPanel.tsx
            └── RunningIndicator.tsx
```

---

## How to Run the Project

### 1. Clone the repo

```
git clone <repo-url>
cd agent_ui_backend
```

### 2. Set up environment variables

Create `.env` files in:

- agent/
- backend/
- frontend/

---

### 3. Install dependencies

```
cd agent
npm install

cd ../backend
npm install

cd ../frontend
npm install
```

---

### 4. Build agent

```
cd agent
npm run build
```

---

### 5. Start backend and frontend

Terminal 1:
```
cd backend
npm run dev
```

Terminal 2:
```
cd frontend
npm run dev
```

---

### 6. Open in browser

```
http://localhost:5173
```

- Click **Connect Drive**
- Authorize Google
- Ingestion starts automatically
- Enter a task and press Enter

---

## How It Works

```
Browser (localhost:5173)
        │
        │ POST /api/agent/run
        │
        ▼
Express Backend (localhost:3000)
        │
        ▼
Agent Module
├── LLMClient → OpenAI API
├── webSearch → Serper.dev
├── webScrape → fetch
├── driveSearch → Google Drive API
└── vectorSearch → VectorStore
```

---

## Google OAuth Flow

```
Browser
   │
   ├── GET /auth/drive
   │
   ▼
Google Consent Screen
   │
   ▼
GET /auth/callback
   │
   ▼
Backend stores tokens
   │
   ▼
Redirect to frontend
```