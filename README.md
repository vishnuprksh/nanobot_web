# nanobot Web Management Console 🐈

A modern web-based management interface for [nanobot](https://github.com/HKUDS/nanobot) — the ultra-lightweight personal AI assistant.

Live Demo: [https://nanobot-web.onrender.com](https://nanobot-web.onrender.com)

## Features

- **🚀 Dashboard** — Server status, system resources, and config overview at a glance.
- **💬 Chat** — Talk to nanobot directly to add features, create skills, and manage configurations.
- **🤖 Agents** — Configure agent defaults and edit sub-agent definitions.
- **🔌 Channels** — Enable/disable and configure WhatsApp, Telegram, Discord, Slack, Email, and more.
- **🔑 Providers** — Manage LLM provider API keys (Anthropic, OpenAI, DeepSeek, Google, etc.).
- **🛠️ Skills** — View, edit, and create SKILL.md files.
- **🏗️ Tools** — Configure MCP servers, shell tools, and web search.
- **🧠 Memory** — View and edit persistent memory files (MEMORY.md, HISTORY.md).
- **📋 Logs** — View nanobot service logs in real-time.
- **⚙️ Config** — Full JSON config editor with direct server write.

## Setup Guide: Connecting to nanobot

To use this management tool, you need a running instance of [nanobot](https://github.com/HKUDS/nanobot) on a server (or your local machine) that you can access via SSH.

1.  **Install nanobot on your server**:
    ```bash
    pip install nanobot-ai
    nanobot init
    ```
2.  **Ensure SSH access**:
    - Your server must have SSH enabled and be reachable from where you host this console.
    - You need the Host, Port (default 22), Username, and Password.
3.  **Login through the Web UI**:
    - Enter your SSH details on the login page.
    - The tool will automatically locate your nanobot configuration (defaults to `~/.nanobot/config.json`).

## Architecture

```text
.
├── backend/          # FastAPI Python backend
│   ├── main.py       # API routes and WebSocket endpoints
│   ├── auth.py       # JWT authentication
│   ├── ssh_manager.py # SSH connection logic
│   ├── chat.py       # WebSocket chat handler
│   └── config.py     # App settings
├── frontend/         # React + Vite + Tailwind frontend
│   ├── src/
│   │   ├── api/      # API client
│   │   ├── components/ # Shared UI components
│   │   ├── pages/    # Page components
│   │   ├── store/    # Zustand state management
│   │   └── types/    # TypeScript types
│   └── ...
├── docker-compose.yml
└── start-dev.sh      # Quick dev startup script
```

## How It Works

1.  **Authentication**: Enter your server's SSH credentials. These are securely stored in an encrypted JWT token.
2.  **SSH Connection**: The backend establishes an SSH tunnel to read/write nanobot's `config.json` and workspace files.
3.  **Live Updates**: All config changes are written directly to the remote server.
4.  **CLI Integration**: The **Chat** interface pipes messages to the remote nanobot's CLI and streams responses back via WebSockets.

## Quick Start

### Development

```bash
chmod +x start-dev.sh
./start-dev.sh
```

Then open [http://localhost:5173](http://localhost:5173).

### Docker

```bash
docker compose up --build
```

Then open [http://localhost:3000](http://localhost:3000).

### Manual Setup

**Backend:**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8899 --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `NANOBOT_WEB_SECRET_KEY` | (random) | JWT signing secret |
| `NANOBOT_WEB_ACCESS_TOKEN_EXPIRE_MINUTES` | 1440 | Token expiry (24h) |
| `NANOBOT_WEB_DEFAULT_SSH_HOST` | — | Pre-fill login host |
| `NANOBOT_WEB_DEFAULT_SSH_PORT` | 22 | Pre-fill login port |
| `NANOBOT_WEB_NANOBOT_CONFIG_PATH` | `~/.nanobot/config.json` | Config file path on server |
| `NANOBOT_WEB_NANOBOT_WORKSPACE_PATH` | `~/.nanobot/workspace` | Workspace path on server |

## Security Notes

- SSH credentials are stored in encrypted JWT tokens and are **never** persisted on the console's disk.
- All sensitive fields (API keys, passwords) are masked in the UI.
- Ensure you change `NANOBOT_WEB_SECRET_KEY` in production!
- For Render deployment, use the provided `render.yaml`.
