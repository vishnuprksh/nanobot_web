"""Nanobot Web Management API."""

from __future__ import annotations

import json
from contextlib import asynccontextmanager
from typing import Any

from fastapi import Depends, FastAPI, HTTPException, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger
from pydantic import BaseModel

from auth import (
    LoginRequest,
    Token,
    UserSession,
    create_access_token,
    get_current_session,
)
from chat import chat_manager
from config import settings
from ssh_manager import SSHManager


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Nanobot Web Management API starting...")
    yield
    logger.info("Nanobot Web Management API shutting down")


app = FastAPI(
    title="Nanobot Web Management",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Helpers ──────────────────────────────────────────────────────────────────


def get_ssh(session: UserSession = Depends(get_current_session)) -> SSHManager:
    return SSHManager(session)


# ── Auth ─────────────────────────────────────────────────────────────────────


@app.post("/api/auth/login", response_model=Token)
def login(req: LoginRequest):
    """Authenticate by verifying SSH connectivity to the target server."""
    ssh = SSHManager(
        UserSession(host=req.host, port=req.port, username=req.username, password=req.password)
    )
    try:
        ssh.connect()
        ssh.close()
    except Exception as e:
        error_msg = str(e)
        
        # Provide helpful suggestions
        suggestions = []
        if "Cannot connect" in error_msg and ("timeout" in error_msg.lower() or "connection refused" in error_msg.lower()):
            suggestions.append("• Check if the server is running and accessible")
            suggestions.append("• Verify the IP address is correct")
            suggestions.append("• Try different SSH ports (22, 2222, 22022, etc.)")
            suggestions.append("• Check if SSH service is running on the server")
            suggestions.append("• Verify firewall rules allow SSH connections")
        elif "Authentication failed" in error_msg:
            suggestions.append("• Verify username and password are correct")
            suggestions.append("• Check if SSH key authentication is required instead")
        elif "No route to host" in error_msg:
            suggestions.append("• Check network connectivity")
            suggestions.append("• Verify the IP address is reachable from this network")
        
        full_error = error_msg
        if suggestions:
            full_error += "\n\nSuggestions:\n" + "\n".join(suggestions)
        
        raise HTTPException(status_code=401, detail=full_error)

    token = create_access_token(
        {"host": req.host, "port": req.port, "username": req.username, "password": req.password}
    )
    return Token(access_token=token)


@app.get("/api/auth/me")
def get_me(session: UserSession = Depends(get_current_session)):
    """Return the current session info (no password)."""
    return {"host": session.host, "port": session.port, "username": session.username}


# ── Dashboard ────────────────────────────────────────────────────────────────


@app.get("/api/dashboard")
def get_dashboard(ssh: SSHManager = Depends(get_ssh)):
    """Get dashboard overview: status, config summary, channels, skills count."""
    try:
        status_info = ssh.get_nanobot_status()
        config = ssh.get_nanobot_config() or {}

        channels_cfg = config.get("channels", {})
        enabled_channels = [
            ch for ch in channels_cfg
            if isinstance(channels_cfg[ch], dict) and channels_cfg[ch].get("enabled")
        ]

        agents_cfg = config.get("agents", {})
        defaults = agents_cfg.get("defaults", {})

        providers_cfg = config.get("providers", {})
        active_providers = [
            p for p in providers_cfg
            if isinstance(providers_cfg[p], dict) and providers_cfg[p].get("apiKey", providers_cfg[p].get("api_key", ""))
        ]

        tools_cfg = config.get("tools", {})
        mcp_servers = list(tools_cfg.get("mcpServers", tools_cfg.get("mcp_servers", {})).keys())

        return {
            "status": status_info,
            "config_summary": {
                "model": defaults.get("model", "anthropic/claude-opus-4-5"),
                "provider": defaults.get("provider", "auto"),
                "max_tokens": defaults.get("maxTokens", defaults.get("max_tokens", 8192)),
                "temperature": defaults.get("temperature", 0.1),
                "workspace": defaults.get("workspace", "~/.nanobot/workspace"),
            },
            "channels": {
                "enabled": enabled_channels,
                "total": len([ch for ch in channels_cfg if isinstance(channels_cfg[ch], dict)]),
            },
            "providers": {
                "active": active_providers,
                "total": len([p for p in providers_cfg if isinstance(providers_cfg[p], dict)]),
            },
            "tools": {
                "mcp_servers": mcp_servers,
                "restrict_to_workspace": tools_cfg.get("restrictToWorkspace", tools_cfg.get("restrict_to_workspace", False)),
            },
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        ssh.close()


# ── Config ───────────────────────────────────────────────────────────────────


@app.get("/api/config")
def get_config(ssh: SSHManager = Depends(get_ssh)):
    """Get the full nanobot config."""
    try:
        config = ssh.get_nanobot_config()
        if config is None:
            raise HTTPException(status_code=404, detail="Config file not found on server")
        return config
    finally:
        ssh.close()


class ConfigUpdate(BaseModel):
    config: dict[str, Any]


@app.put("/api/config")
def update_config(body: ConfigUpdate, ssh: SSHManager = Depends(get_ssh)):
    """Update the full nanobot config."""
    try:
        if not ssh.save_nanobot_config(body.config):
            raise HTTPException(status_code=500, detail="Failed to save config")
        return {"status": "ok"}
    finally:
        ssh.close()


@app.get("/api/config/{section}")
def get_config_section(section: str, ssh: SSHManager = Depends(get_ssh)):
    """Get a specific config section."""
    try:
        config = ssh.get_nanobot_config()
        if config is None:
            raise HTTPException(status_code=404, detail="Config not found")
        if section not in config:
            raise HTTPException(status_code=404, detail=f"Section '{section}' not found")
        return config[section]
    finally:
        ssh.close()


class SectionUpdate(BaseModel):
    data: dict[str, Any]


@app.put("/api/config/{section}")
def update_config_section(section: str, body: SectionUpdate, ssh: SSHManager = Depends(get_ssh)):
    """Update a specific config section."""
    try:
        config = ssh.get_nanobot_config()
        if config is None:
            config = {}
        config[section] = body.data
        if not ssh.save_nanobot_config(config):
            raise HTTPException(status_code=500, detail="Failed to save config")
        return {"status": "ok"}
    finally:
        ssh.close()


# ── Channels ─────────────────────────────────────────────────────────────────


@app.get("/api/channels")
def get_channels(ssh: SSHManager = Depends(get_ssh)):
    """Get all channel configurations."""
    try:
        config = ssh.get_nanobot_config() or {}
        return config.get("channels", {})
    finally:
        ssh.close()


@app.put("/api/channels/{channel}")
def update_channel(channel: str, body: SectionUpdate, ssh: SSHManager = Depends(get_ssh)):
    """Update a specific channel configuration."""
    try:
        config = ssh.get_nanobot_config() or {}
        channels = config.setdefault("channels", {})
        channels[channel] = body.data
        if not ssh.save_nanobot_config(config):
            raise HTTPException(status_code=500, detail="Failed to save config")
        return {"status": "ok"}
    finally:
        ssh.close()


# ── Agents ───────────────────────────────────────────────────────────────────


@app.get("/api/agents")
def get_agents(ssh: SSHManager = Depends(get_ssh)):
    """Get agents configuration and AGENTS.md content."""
    try:
        config = ssh.get_nanobot_config() or {}
        agents_md = ssh.list_agents_md()
        return {
            "config": config.get("agents", {}),
            "agents_md": agents_md,
        }
    finally:
        ssh.close()


class AgentsMdUpdate(BaseModel):
    content: str


@app.put("/api/agents/md")
def update_agents_md(body: AgentsMdUpdate, ssh: SSHManager = Depends(get_ssh)):
    """Update the AGENTS.md file."""
    try:
        if not ssh.save_agents_md(body.content):
            raise HTTPException(status_code=500, detail="Failed to save AGENTS.md")
        return {"status": "ok"}
    finally:
        ssh.close()


@app.put("/api/agents/config")
def update_agents_config(body: SectionUpdate, ssh: SSHManager = Depends(get_ssh)):
    """Update agents config section."""
    try:
        config = ssh.get_nanobot_config() or {}
        config["agents"] = body.data
        if not ssh.save_nanobot_config(config):
            raise HTTPException(status_code=500, detail="Failed to save config")
        return {"status": "ok"}
    finally:
        ssh.close()


# ── Skills ───────────────────────────────────────────────────────────────────


@app.get("/api/skills")
def get_skills(ssh: SSHManager = Depends(get_ssh)):
    """List all skills."""
    try:
        return {"skills": ssh.list_skills()}
    finally:
        ssh.close()


@app.get("/api/skills/{name}")
def get_skill(name: str, ssh: SSHManager = Depends(get_ssh)):
    """Get a specific skill's content."""
    try:
        skills = ssh.list_skills()
        for s in skills:
            if s["name"] == name:
                return s
        raise HTTPException(status_code=404, detail=f"Skill '{name}' not found")
    finally:
        ssh.close()


class SkillUpdate(BaseModel):
    content: str


@app.put("/api/skills/{name}")
def update_skill(name: str, body: SkillUpdate, ssh: SSHManager = Depends(get_ssh)):
    """Update a skill's SKILL.md content."""
    try:
        ws = settings.nanobot_workspace_path
        path = f"{ws}/skills/{name}/SKILL.md"
        if not ssh.write_file(path, body.content):
            raise HTTPException(status_code=500, detail="Failed to save skill")
        return {"status": "ok"}
    finally:
        ssh.close()


class SkillCreate(BaseModel):
    name: str
    content: str


@app.post("/api/skills")
def create_skill(body: SkillCreate, ssh: SSHManager = Depends(get_ssh)):
    """Create a new skill."""
    try:
        ws = settings.nanobot_workspace_path
        path = f"{ws}/skills/{body.name}/SKILL.md"
        # Check if already exists
        existing = ssh.read_file(path)
        if existing is not None:
            raise HTTPException(status_code=409, detail=f"Skill '{body.name}' already exists")
        if not ssh.write_file(path, body.content):
            raise HTTPException(status_code=500, detail="Failed to create skill")
        return {"status": "ok", "name": body.name}
    finally:
        ssh.close()


# ── Providers ────────────────────────────────────────────────────────────────


@app.get("/api/providers")
def get_providers(ssh: SSHManager = Depends(get_ssh)):
    """Get all provider configurations."""
    try:
        config = ssh.get_nanobot_config() or {}
        return config.get("providers", {})
    finally:
        ssh.close()


@app.put("/api/providers/{provider}")
def update_provider(provider: str, body: SectionUpdate, ssh: SSHManager = Depends(get_ssh)):
    """Update a specific provider configuration."""
    try:
        config = ssh.get_nanobot_config() or {}
        providers = config.setdefault("providers", {})
        providers[provider] = body.data
        if not ssh.save_nanobot_config(config):
            raise HTTPException(status_code=500, detail="Failed to save config")
        return {"status": "ok"}
    finally:
        ssh.close()


# ── Tools / MCP ──────────────────────────────────────────────────────────────


@app.get("/api/tools")
def get_tools(ssh: SSHManager = Depends(get_ssh)):
    """Get tools configuration."""
    try:
        config = ssh.get_nanobot_config() or {}
        return config.get("tools", {})
    finally:
        ssh.close()


@app.put("/api/tools")
def update_tools(body: SectionUpdate, ssh: SSHManager = Depends(get_ssh)):
    """Update tools configuration."""
    try:
        config = ssh.get_nanobot_config() or {}
        config["tools"] = body.data
        if not ssh.save_nanobot_config(config):
            raise HTTPException(status_code=500, detail="Failed to save config")
        return {"status": "ok"}
    finally:
        ssh.close()


# ── Memory ───────────────────────────────────────────────────────────────────


@app.get("/api/memory")
def get_memory(ssh: SSHManager = Depends(get_ssh)):
    """Get memory files."""
    try:
        return {"files": ssh.list_memory_files()}
    finally:
        ssh.close()


class MemoryUpdate(BaseModel):
    path: str
    content: str


@app.put("/api/memory")
def update_memory(body: MemoryUpdate, ssh: SSHManager = Depends(get_ssh)):
    """Update a memory file."""
    try:
        if not ssh.write_file(body.path, body.content):
            raise HTTPException(status_code=500, detail="Failed to save memory file")
        return {"status": "ok"}
    finally:
        ssh.close()


# ── Logs ─────────────────────────────────────────────────────────────────────


@app.get("/api/logs")
def get_logs(lines: int = 100, ssh: SSHManager = Depends(get_ssh)):
    """Get recent nanobot logs."""
    try:
        return {"logs": ssh.get_logs(lines)}
    finally:
        ssh.close()


# ── Cron ─────────────────────────────────────────────────────────────────────


class CronAddRequest(BaseModel):
    name: str
    message: str
    schedule_type: str  # every, cron, at
    schedule_value: Any
    tz: str | None = None
    deliver: bool = False
    to: str | None = None
    channel: str | None = None


class CronToggleRequest(BaseModel):
    enabled: bool


@app.get("/api/cron")
def get_cron_jobs(ssh: SSHManager = Depends(get_ssh)):
    """List all scheduled jobs."""
    try:
        return ssh.get_cron_jobs()
    finally:
        ssh.close()


@app.post("/api/cron")
def add_cron_job(body: CronAddRequest, ssh: SSHManager = Depends(get_ssh)):
    """Add a new scheduled job."""
    try:
        ok, msg = ssh.add_cron_job(
            name=body.name,
            message=body.message,
            schedule_type=body.schedule_type,
            schedule_value=body.schedule_value,
            tz=body.tz,
            deliver=body.deliver,
            to=body.to,
            channel=body.channel,
        )
        if not ok:
            raise HTTPException(status_code=500, detail=msg)
        return {"status": "ok", "message": msg}
    finally:
        ssh.close()


@app.delete("/api/cron/{job_id}")
def remove_cron_job(job_id: str, ssh: SSHManager = Depends(get_ssh)):
    """Remove a scheduled job."""
    try:
        ok, msg = ssh.remove_cron_job(job_id)
        if not ok:
            raise HTTPException(status_code=500, detail=msg)
        return {"status": "ok", "message": msg}
    finally:
        ssh.close()


@app.put("/api/cron/{job_id}/toggle")
def toggle_cron_job(job_id: str, body: CronToggleRequest, ssh: SSHManager = Depends(get_ssh)):
    """Enable or disable a scheduled job."""
    try:
        ok, msg = ssh.toggle_cron_job(job_id, body.enabled)
        if not ok:
            raise HTTPException(status_code=500, detail=msg)
        return {"status": "ok", "message": msg}
    finally:
        ssh.close()


@app.post("/api/cron/{job_id}/run")
def run_cron_job(job_id: str, ssh: SSHManager = Depends(get_ssh)):
    """Manually run a scheduled job."""
    try:
        ok, msg = ssh.run_cron_job(job_id)
        if not ok:
            raise HTTPException(status_code=500, detail=msg)
        return {"status": "ok", "message": msg}
    finally:
        ssh.close()


# ── Service Control ──────────────────────────────────────────────────────────


@app.post("/api/service/restart")
def restart_service(ssh: SSHManager = Depends(get_ssh)):
    """Restart the nanobot service on the remote server."""
    try:
        ok, msg = ssh.restart_nanobot()
        if not ok:
            raise HTTPException(status_code=500, detail=msg)
        return {"status": "ok", "message": msg}
    finally:
        ssh.close()


# ── Connectivity Testing ─────────────────────────────────────────────────────


@app.post("/api/test-connectivity")
def test_connectivity(req: dict):
    """Test SSH connectivity to a host on different ports."""
    host = req.get("host", "").strip()
    if not host:
        raise HTTPException(status_code=400, detail="Host is required")
    
    ports_to_try = [22, 2222, 222, 22022, 8022, 1022, 22222, 21098, 2288]
    results = {}
    
    for port in ports_to_try:
        try:
            # Test basic TCP connectivity
            import socket
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(5)
            result = sock.connect_ex((host, port))
            sock.close()
            results[str(port)] = result == 0
        except Exception:
            results[str(port)] = False
    
    open_ports = [int(p) for p, open in results.items() if open]
    
    return {
        "host": host,
        "results": results,
        "open_ports": open_ports,
        "suggestion": f"Try ports: {', '.join(map(str, open_ports))}" if open_ports else "No open SSH ports found. Server may be down or firewalled."
    }


# ── Chat WebSocket ───────────────────────────────────────────────────────────


@app.websocket("/ws/chat")
async def chat_websocket(ws: WebSocket):
    """WebSocket endpoint for chatting with nanobot."""
    await chat_manager.handle(ws)


# ── Health ───────────────────────────────────────────────────────────────────


@app.get("/api/health")
def health():
    return {"status": "ok", "version": "1.0.0"}
