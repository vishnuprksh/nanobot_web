"""Chat WebSocket handler — sends user messages to nanobot on the remote server."""

from __future__ import annotations

import asyncio
import json
import uuid

from fastapi import WebSocket, WebSocketDisconnect
from loguru import logger

from auth import UserSession, decode_token
from ssh_manager import SSHManager


class ChatManager:
    """Manages WebSocket chat sessions with nanobot."""

    def __init__(self):
        self._connections: dict[str, WebSocket] = {}

    async def handle(self, ws: WebSocket) -> None:
        """Handle an incoming WebSocket connection for chat."""
        await ws.accept()
        conn_id = str(uuid.uuid4())[:8]

        try:
            # First message must be the JWT token
            auth_msg = await ws.receive_text()
            auth_data = json.loads(auth_msg)
            token = auth_data.get("token", "")
            payload = decode_token(token)
            session = UserSession(
                host=payload["host"],
                port=payload["port"],
                username=payload["username"],
                password=payload["password"],
            )
        except Exception as e:
            await ws.send_json({"type": "error", "message": "Authentication failed"})
            await ws.close()
            return

        self._connections[conn_id] = ws
        ssh = SSHManager(session)

        try:
            await ws.send_json({"type": "connected", "message": "Connected to nanobot chat"})

            while True:
                raw = await ws.receive_text()
                data = json.loads(raw)
                user_msg = data.get("message", "").strip()
                if not user_msg:
                    continue

                await ws.send_json({"type": "thinking", "message": "Processing..."})

                # Execute the message via nanobot CLI on the remote server
                response = await asyncio.get_event_loop().run_in_executor(
                    None, self._send_to_nanobot, ssh, user_msg
                )

                await ws.send_json({"type": "response", "message": response})

        except WebSocketDisconnect:
            logger.info("Chat WebSocket disconnected: {}", conn_id)
        except Exception as e:
            logger.error("Chat error: {}", e)
            try:
                await ws.send_json({"type": "error", "message": str(e)})
            except Exception:
                pass
        finally:
            self._connections.pop(conn_id, None)
            ssh.close()

    @staticmethod
    def _send_to_nanobot(ssh: SSHManager, message: str) -> str:
        """Send a message to nanobot via the CLI and capture the response."""
        # Escape the message for shell
        escaped = message.replace("'", "'\\''")

        # Determine the correct command to use.
        # Since SSHManager.exec_command now includes standard PATHs, we try standard commands.
        full_cmd = (
            f"timeout 120 nanobot agent --message '{escaped}' 2>/dev/null || "
            f"timeout 120 python3 -m nanobot agent --message '{escaped}' 2>/dev/null"
        )

        stdout, stderr, code = ssh.exec_command(full_cmd, timeout=130)
        
        response = stdout.strip()
        if not response:
            if code != 0:
                if "No API key configured" in stderr:
                    return "Error: No API key configured. Please go to Settings/Config to add your provider API keys."
                return f"Error ({code}): {stderr.strip() or 'Unknown error'}"
            else:
                response = stderr.strip() if stderr.strip() else "No response from nanobot."
        return response


chat_manager = ChatManager()
