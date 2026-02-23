<img width="1328" height="861" alt="Screenshot 2026-02-21 at 9 11 11 PM" src="https://github.com/user-attachments/assets/cf63d1c0-ecab-46ed-8e6a-54341e14304a" />
link to demo https://drive.google.com/file/d/1lw6LXK4Ny50znY8RbZ-Kjds9JXju7kXO/view?usp=sharing

# Libra AI Agent

## Project Highlights

```
agent_ui_backend/
├── agent/      ← Agent core (TypeScript) — tool loop, Drive, Qdrant vector db
├── backend/    ← API server — OAuth, SSE streaming, rate limiting
└── frontend/   ← React — polished research UI
```

**Stack:**

- Node.js / TypeScript
- OpenAI (GPT-4o-mini + text-embedding-3-small)
- Qdrant (vector db)
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

Copy the example files and fill in your keys:
```bash
cp agent/.env.example agent/.env
cp backend/.env.example backend/.env
```

Both files need the same values:
```env
OPENAI_API_KEY=sk-...
SERPER_API_KEY=...
GOOGLE_CLIENT_ID=....apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
APP_BASE_URL=http://localhost:3000
FRONTEND_URL=http://localhost:5173
PORT=3000
SESSION_SECRET=any-long-random-string
QDRANT_URL=https://your-cluster-url.cloud.qdrant.io
QDRANT_API_KEY=your-qdrant-api-key
# ── Optional: restrict ingestion to a specific Google Drive folder ──
# If set, only files inside this folder will be ingested and searched.
# If left empty, the entire Drive will be used.
#
# To find your folder ID:
# 1. Open the folder in Google Drive
# 2. Copy the last part of the URL:
#    drive.google.com/drive/folders/THIS_PART_IS_THE_ID
#
DRIVE_FOLDER_ID=
```
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
└── vectorSearch → Qdrant vectordb
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
