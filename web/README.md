# nanobot Web Management Console 🐈

A modern web-based management interface for [nanobot](https://github.com/HKUDS/nanobot) — the efficient and small OpenClaw alternative.

## Features

- **Dashboard** — Server status, system resources, config overview at a glance
- **Chat** — Talk to nanobot directly to add features, create skills, manage config
- **Agents** — Configure agent defaults, edit AGENTS.md for sub-agent definitions
- **Channels** — Enable/disable and configure WhatsApp, Telegram, Discord, Slack, Email, Matrix, and more
- **Providers** — Manage LLM provider API keys (Anthropic, OpenAI, DeepSeek, Groq, etc.)
- **Skills** — View, edit, and create SKILL.md files
- **Tools** — Configure MCP servers, shell tools, and web search
- **Memory** — View and edit persistent memory files (MEMORY.md, HISTORY.md)
- **Logs** — View nanobot service logs in real-time
- **Config** — Full JSON config editor with direct server write

## Architecture

```
web/
├── backend/          # FastAPI Python backend
│   ├── main.py       # API routes and WebSocket endpoints
│   ├── auth.py       # JWT authentication
│   ├── ssh_manager.py # SSH connection to nanobot server
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
└── start-dev.sh      # Quick dev startup
```

## How It Works

1. **Login**: Enter your server's SSH credentials (host, port, user, password)
2. The backend establishes an SSH connection to read/write nanobot's `config.json` and workspace files
3. All config changes are written directly to the remote server
4. The **Chat** interface pipes messages to nanobot's CLI and streams responses back
5. Changes made via chat (e.g., "create a new weather skill") are reflected in the corresponding pages

## Quick Start

### Development

```bash
cd web
chmod +x start-dev.sh
./start-dev.sh
```

Then open http://localhost:5173

### Docker

```bash
cd web
docker compose up --build
```

Then open http://localhost:3000

### Manual Setup

**Backend:**
```bash
cd web/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8899 --reload
```

**Frontend:**
```bash
cd web/frontend
npm install
npm run dev
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `NANOBOT_WEB_SECRET_KEY` | (random) | JWT signing secret |
| `NANOBOT_WEB_ACCESS_TOKEN_EXPIRE_MINUTES` | 720 | Token expiry (12h) |
| `NANOBOT_WEB_DEFAULT_SSH_HOST` | — | Pre-fill login host |
| `NANOBOT_WEB_DEFAULT_SSH_PORT` | 22 | Pre-fill login port |
| `NANOBOT_WEB_NANOBOT_CONFIG_PATH` | `~/.nanobot/config.json` | Config file path on server |
| `NANOBOT_WEB_NANOBOT_WORKSPACE_PATH` | `~/.nanobot/workspace` | Workspace path on server |

## Security Notes

- SSH credentials are stored in encrypted JWT tokens (not persisted on disk)
- Tokens expire after 12 hours by default
- All sensitive fields (API keys, passwords) are masked in the UI
- Change `NANOBOT_WEB_SECRET_KEY` in production!
