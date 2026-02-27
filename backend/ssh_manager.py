from __future__ import annotations

import json
import paramiko
from loguru import logger

from auth import UserSession
from config import settings


class SSHManager:
    """Manages SSH connections to nanobot servers."""

    def __init__(self, session: UserSession):
        self.session = session
        self._client: paramiko.SSHClient | None = None

    def connect(self) -> paramiko.SSHClient:
        """Establish SSH connection."""
        if self._client is not None:
            try:
                self._client.exec_command("echo ok", timeout=5)
                return self._client
            except Exception:
                self._client = None

        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        
        # Try to connect with better error handling
        try:
            client.connect(
                hostname=self.session.host,
                port=self.session.port,
                username=self.session.username,
                password=self.session.password,
                timeout=30,  # Increased timeout
                look_for_keys=False,
                allow_agent=False,
                banner_timeout=30,
                auth_timeout=30,
            )
        except paramiko.AuthenticationException:
            raise Exception("Authentication failed. Check username/password.")
        except paramiko.SSHException as e:
            raise Exception(f"SSH protocol error: {e}")
        except paramiko.BadHostKeyException:
            raise Exception("Host key verification failed.")
        except Exception as e:
            error_msg = str(e).lower()
            if "timeout" in error_msg or "connection refused" in error_msg:
                raise Exception(f"Cannot connect to {self.session.host}:{self.session.port}. Server may be down, port may be blocked, or SSH service not running.")
            elif "no route to host" in error_msg:
                raise Exception(f"No route to host {self.session.host}. Check the IP address and network connectivity.")
            elif "network is unreachable" in error_msg:
                raise Exception(f"Network unreachable. Check your internet connection.")
            else:
                raise Exception(f"Connection failed: {e}")
        
        self._client = client
        return client

    @staticmethod
    def test_connectivity(host: str, port: int = 22, timeout: int = 10) -> bool:
        """Test basic TCP connectivity to a host:port."""
        import socket
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(timeout)
            result = sock.connect_ex((host, port))
            sock.close()
            return result == 0
        except Exception:
            return False

    @staticmethod
    def find_ssh_port(host: str, ports: list[int] = None) -> int | None:
        """Try to find an open SSH port on the host."""
        if ports is None:
            ports = [22, 2222, 222, 22022, 8022, 1022]  # Common SSH ports
        
        for port in ports:
            if SSHManager.test_connectivity(host, port, timeout=5):
                return port
        return None

    def close(self) -> None:
        if self._client:
            self._client.close()
            self._client = None

    def exec_command(self, cmd: str, timeout: int = 30) -> tuple[str, str, int]:
        """Execute a command and return (stdout, stderr, exit_code)."""
        client = self.connect()
        # Ensure common local bin paths are in PATH for non-interactive sessions
        path_prefix = "export PATH=$PATH:$HOME/.local/bin:/usr/local/bin && "
        _, stdout, stderr = client.exec_command(f"{path_prefix}{cmd}", timeout=timeout)
        exit_code = stdout.channel.recv_exit_status()
        return stdout.read().decode(), stderr.read().decode(), exit_code

    def read_file(self, path: str) -> str | None:
        """Read a file from the remote server."""
        stdout, stderr, code = self.exec_command(f"cat {path}")
        if code != 0:
            return None
        return stdout

    def write_file(self, path: str, content: str) -> bool:
        """Write content to a file on the remote server."""
        # Escape single quotes in content
        escaped = content.replace("'", "'\\''")
        _, stderr, code = self.exec_command(
            f"mkdir -p $(dirname {path}) && cat > {path} << 'NANOBOT_EOF'\n{escaped}\nNANOBOT_EOF"
        )
        return code == 0

    def get_nanobot_config(self) -> dict[str, Any] | None:
        """Read and parse the nanobot config.json."""
        raw = self.read_file(settings.nanobot_config_path)
        if not raw:
            return None
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            return None

    def save_nanobot_config(self, config: dict[str, Any]) -> bool:
        """Save the nanobot config.json."""
        content = json.dumps(config, indent=2, ensure_ascii=False)
        return self.write_file(settings.nanobot_config_path, content)

    def get_nanobot_status(self) -> dict[str, Any]:
        """Get nanobot process status and system info."""
        info: dict[str, Any] = {"running": False, "pid": None, "uptime": None, "system": {}}

        # Check if nanobot is running
        stdout, _, _ = self.exec_command("pgrep -f 'python.*nanobot' || true")
        pids = [p.strip() for p in stdout.strip().split("\n") if p.strip()]
        if pids:
            info["running"] = True
            info["pid"] = pids[0]

        # Get uptime
        stdout, _, _ = self.exec_command("uptime -p 2>/dev/null || uptime")
        info["uptime"] = stdout.strip()

        # Get system info
        stdout, _, _ = self.exec_command("uname -srm")
        info["system"]["os"] = stdout.strip()

        stdout, _, _ = self.exec_command("free -h 2>/dev/null | grep Mem | awk '{print $2, $3, $4}'")
        if stdout.strip():
            parts = stdout.strip().split()
            info["system"]["memory"] = {"total": parts[0] if parts else "?", "used": parts[1] if len(parts) > 1 else "?", "free": parts[2] if len(parts) > 2 else "?"}

        stdout, _, _ = self.exec_command("df -h / | tail -1 | awk '{print $2, $3, $5}'")
        if stdout.strip():
            parts = stdout.strip().split()
            info["system"]["disk"] = {"total": parts[0] if parts else "?", "used": parts[1] if len(parts) > 1 else "?", "usage": parts[2] if len(parts) > 2 else "?"}

        stdout, _, _ = self.exec_command("python3 --version 2>/dev/null || python --version 2>/dev/null")
        info["system"]["python"] = stdout.strip()

        return info

    def list_skills(self) -> list[dict[str, str]]:
        """List skills from the workspace."""
        skills = []
        ws = settings.nanobot_workspace_path

        # Workspace skills
        stdout, _, code = self.exec_command(
            f"find {ws}/skills -maxdepth 2 -name 'SKILL.md' 2>/dev/null || true"
        )
        for line in stdout.strip().split("\n"):
            line = line.strip()
            if line:
                name = line.rsplit("/SKILL.md", 1)[0].rsplit("/", 1)[-1]
                content, _, _ = self.exec_command(f"cat '{line}'")
                skills.append({"name": name, "source": "workspace", "path": line, "content": content.strip()})

        # Builtin skills (check common install locations)
        for base in ["/usr/local/lib/python*/dist-packages/nanobot/skills", "/root/.local/lib/python*/dist-packages/nanobot/skills", "$(pip show nanobot 2>/dev/null | grep Location | cut -d' ' -f2)/nanobot/skills"]:
            stdout, _, code = self.exec_command(
                f"find {base} -maxdepth 2 -name 'SKILL.md' 2>/dev/null || true"
            )
            for line in stdout.strip().split("\n"):
                line = line.strip()
                if line and not any(s["name"] == line.rsplit("/SKILL.md", 1)[0].rsplit("/", 1)[-1] for s in skills):
                    name = line.rsplit("/SKILL.md", 1)[0].rsplit("/", 1)[-1]
                    content, _, _ = self.exec_command(f"cat '{line}'")
                    skills.append({"name": name, "source": "builtin", "path": line, "content": content.strip()})

        return skills

    def list_memory_files(self) -> list[dict[str, str]]:
        """List memory files in the workspace."""
        ws = settings.nanobot_workspace_path
        files = []
        stdout, _, _ = self.exec_command(f"find {ws}/memory -type f 2>/dev/null || true")
        for line in stdout.strip().split("\n"):
            line = line.strip()
            if line:
                content, _, _ = self.exec_command(f"cat '{line}'")
                files.append({
                    "name": line.rsplit("/", 1)[-1],
                    "path": line,
                    "content": content.strip(),
                })
        return files

    def restart_nanobot(self) -> tuple[bool, str]:
        """Restart the nanobot service."""
        # Try systemctl first, then direct kill+start
        _, _, code = self.exec_command("systemctl restart nanobot 2>/dev/null")
        if code == 0:
            return True, "Restarted via systemctl"

        # Kill existing
        self.exec_command("pkill -f 'nanobot' 2>/dev/null || true")
        self.exec_command("pkill -f 'python.*nanobot' 2>/dev/null || true")
        
        # Determine command
        _, _, code = self.exec_command("command -v nanobot")
        if code == 0:
            cmd = "nanobot gateway"
        else:
            cmd = "python3 -m nanobot gateway"

        stdout, stderr, code = self.exec_command(
            f"nohup {cmd} > /tmp/nanobot.log 2>&1 & echo $!"
        )
        if code == 0 and stdout.strip():
            return True, f"Started with PID {stdout.strip()}"
        return False, stderr or "Failed to start nanobot"

    def get_logs(self, lines: int = 100) -> str:
        """Get recent nanobot logs."""
        stdout, _, _ = self.exec_command(
            f"journalctl -u nanobot --no-pager -n {lines} 2>/dev/null || tail -n {lines} /tmp/nanobot.log 2>/dev/null || echo 'No logs found'"
        )
        return stdout

    def list_agents_md(self) -> str | None:
        """Read the AGENTS.md file from workspace."""
        ws = settings.nanobot_workspace_path
        content = self.read_file(f"{ws}/AGENTS.md")
        return content

    def save_agents_md(self, content: str) -> bool:
        """Save the AGENTS.md file to workspace."""
        ws = settings.nanobot_workspace_path
        return self.write_file(f"{ws}/AGENTS.md", content)

    # ── Cron ─────────────────────────────────────────────────────────────────

    def get_cron_jobs(self) -> list[dict[str, Any]]:
        """Read and parse the cron jobs.json."""
        raw = self.read_file("~/.nanobot/cron/jobs.json")
        if not raw:
            return []
        try:
            data = json.loads(raw)
            return data.get("jobs", [])
        except json.JSONDecodeError:
            return []

    def add_cron_job(
        self,
        name: str,
        message: str,
        schedule_type: str,
        schedule_value: str | int,
        tz: str | None = None,
        deliver: bool = False,
        to: str | None = None,
        channel: str | None = None,
    ) -> tuple[bool, str]:
        """Add a scheduled job via CLI."""
        cmd = f"nanobot cron add --name '{name}' --message '{message}'"
        if schedule_type == "every":
            cmd += f" --every {schedule_value}"
        elif schedule_type == "cron":
            cmd += f" --cron '{schedule_value}'"
            if tz:
                cmd += f" --tz '{tz}'"
        elif schedule_type == "at":
            cmd += f" --at '{schedule_value}'"
        
        if deliver:
            cmd += " --deliver"
            if to:
                cmd += f" --to '{to}'"
            if channel:
                cmd += f" --channel '{channel}'"
        
        stdout, stderr, code = self.exec_command(cmd)
        if code == 0:
            return True, stdout.strip()
        return False, stderr or stdout.strip()

    def remove_cron_job(self, job_id: str) -> tuple[bool, str]:
        """Remove a scheduled job via CLI."""
        stdout, stderr, code = self.exec_command(f"nanobot cron remove {job_id}")
        if code == 0:
            return True, stdout.strip()
        return False, stderr or stdout.strip()

    def toggle_cron_job(self, job_id: str, enabled: bool) -> tuple[bool, str]:
        """Enable or disable a scheduled job via CLI."""
        cmd = f"nanobot cron enable {job_id}"
        if not enabled:
            cmd += " --disable"
        
        stdout, stderr, code = self.exec_command(cmd)
        if code == 0:
            return True, stdout.strip()
        return False, stderr or stdout.strip()

    def run_cron_job(self, job_id: str) -> tuple[bool, str]:
        """Manually run a scheduled job via CLI."""
        # Use --force to run even if disabled, and we run it in background so it doesn't block the UI
        # But we want to see the output maybe? The CLI run command is synchronous.
        # For now, let's run it synchronously with a timeout.
        stdout, stderr, code = self.exec_command(f"nanobot cron run {job_id} --force", timeout=60)
        if code == 0:
            return True, stdout.strip()
        return False, stderr or stdout.strip()
