# 🤖 AI-Powered Pull Request Review Agent

An advanced, full-stack, multi-agent code analysis pipeline that automates security audits, code quality evaluations, and dependency vulnerability scans for GitHub Pull Requests. Features a real-time web-based admin dashboard to manage, approve, or dismiss automated findings.

---

## 🌟 Key Features

*   **⚡ Automated PR Scanning**: Ingests GitHub pull request webhooks and automatically fetches and parses code changes.
*   **🧠 Parallel Multi-Agent Audits**: Executes three specialized LLM-based agents concurrently using `gemini-2.5-flash`:
    *   **🔒 Security Agent**: Scans for OWASP Top 10 vulnerabilities (SQL injection, XSS, CSRF, hardcoded secrets, weak encryption).
    *   **🎨 Code Quality Agent**: Flags logic bugs, code smells, complexity issues, and poor error handling.
    *   **📦 Dependency Agent**: Inspects manifest files (`package.json`, `requirements.txt`) for CVE licenses (e.g. GPL only) or vulnerable packages.
*   **💬 Automated GitHub PR Comments**: Posts a consolidated, formatted markdown review comment directly onto the PR.
*   **💻 Admin Dashboard (React)**: 
    *   Lists pull request history and agent execution statuses.
    *   Enables line-by-line review of findings.
    *   Provides triage options to **Approve** or **Dismiss** individual warnings.
*   **🔒 Secure GitHub Integration**: Verifies GitHub webhook payload authenticity using `x-hub-signature-256` HMAC validation.

---

## 📂 Repository Structure

```text
pr-agent-anti/
├── backend/
│   ├── src/
│   │   ├── agents/          # AI Agent definitions (Security, Quality, Dependency, Orchestrator)
│   │   ├── controllers/     # API routes (webhook ingestion, dashboard queries)
│   │   ├── github/          # Octokit integration client
│   │   ├── models/          # MongoDB/Mongoose schemas
│   │   └── utils/           # Helper scripts (diff parser, retry helper)
│   ├── package.json
│   └── tsconfig.json
└── frontend/
    ├── src/
    │   ├── assets/          # Static elements
    │   ├── App.tsx          # Main React Dashboard UI
    │   └── main.tsx         # Client Entrypoint
    ├── tailwind.config.js   # Styling configuration
    └── package.json
```

---

## 🛠️ Tech Stack

### Backend
*   **Runtime**: Node.js, TypeScript
*   **Framework**: Express.js
*   **Database**: MongoDB & Mongoose ORM
*   **AI SDK**: `@google/generative-ai` (Gemini 2.5 Flash)
*   **GitHub Integration**: `@octokit/rest` & `@octokit/webhooks-methods`

### Frontend
*   **Framework**: React 19, TypeScript, Vite
*   **Styling**: Tailwind CSS
*   **Icons**: Lucide React

---

## 🚀 Getting Started

### Prerequisites
*   Node.js (v18+)
*   MongoDB running locally or a MongoDB Atlas URI
*   A Gemini API Key (get one from [Google AI Studio](https://aistudio.google.com/))
*   A GitHub Personal Access Token (with `repo` permissions to read/write PR comments)

---

### Backend Setup

1. Navigate to the backend directory:
    ```bash
    cd backend
    ```

2. Install dependencies:
    ```bash
    npm install
    ```

3. Create a `.env` file in the `backend/` directory:
    ```env
    PORT=5000
    MONGODB_URI=mongodb://localhost:27017/pr_review_agent
    GEMINI_API_KEY=your_gemini_api_key
    GITHUB_APP_TOKEN=your_github_personal_access_token
    WEBHOOK_SECRET=your_github_webhook_secret_key
    ```

4. Start the backend development server:
    ```bash
    npm run dev
    ```
    *The server runs on [http://localhost:5000](http://localhost:5000)*

---

### Frontend Setup

1. Navigate to the frontend directory:
    ```bash
    cd ../frontend
    ```

2. Install dependencies:
    ```bash
    npm install
    ```

3. Start the Vite development server:
    ```bash
    npm run dev
    ```
    *The dashboard will be active on [http://localhost:5173](http://localhost:5173)*

---

## 🔧 Setting up the GitHub Integration

To wire the agent to a live repository:

1.  **Expose your Local Server**: Use a tool like `ngrok` to tunnel your backend port:
    ```bash
    ngrok http 5000
    ```
    Copy the forwarding HTTPS URL (e.g. `https://your-tunnel-id.ngrok-free.app`).

2.  **Add a GitHub Webhook**:
    *   Go to your GitHub repository -> **Settings** -> **Webhooks** -> **Add webhook**.
    *   Set the **Payload URL** to: `https://your-tunnel-id.ngrok-free.app/api/webhooks/github`
    *   Set the **Content type** to `application/json`.
    *   Define a **Secret** (must match `WEBHOOK_SECRET` in your backend `.env`).
    *   Select **Let me select individual events** and check **Pull requests**.
    *   Click **Add webhook**.

Now, whenever you open or synchronize a PR on that repository, the automated agent pipeline will review your changes and post feedback!

---

## 🤖 How the Agents Work

Each agent utilizes **structured JSON schema outputs** enforced at the LLM level. This guarantees that model outputs match the program structure directly:

```typescript
// Example from securityAgent.ts system configuration:
const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
  systemInstruction: "You are an expert security auditor...",
  generationConfig: {
    responseMimeType: "application/json",
    responseSchema: {
      type: SchemaType.OBJECT,
      properties: {
        findings: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              line: { type: SchemaType.INTEGER },
              comment: { type: SchemaType.STRING },
              severity: { type: SchemaType.STRING, enum: ["high", "critical"] }
            },
            required: ["line", "comment", "severity"]
          }
        }
      },
      required: ["findings"]
    }
  }
});
```

---

## 📊 Database Schema Summary

The database uses three collections:
1.  **`Repository`**: Stores repository metadata (`owner`, `repo`, `isActive`).
2.  **`PullRequest`**: Tracks scanned pull requests, authorship, and active counts.
3.  **`ScanResult`**: Maps agent outputs (`quality`, `security`, `dependency`) containing individual findings, severity, target line, file path, and user-moderated status (`pending_review`, `approved`, `dismissed`).
