export interface DashboardData {
  status: {
    running: boolean
    pid: string | null
    uptime: string | null
    system: {
      os?: string
      memory?: { total: string; used: string; free: string }
      disk?: { total: string; used: string; usage: string }
      python?: string
    }
  }
  config_summary: {
    model: string
    provider: string
    max_tokens: number
    temperature: number
    workspace: string
  }
  channels: {
    enabled: string[]
    total: number
  }
  providers: {
    active: string[]
    total: number
  }
  tools: {
    mcp_servers: string[]
    restrict_to_workspace: boolean
  }
}

export interface Skill {
  name: string
  source: string
  path: string
  content: string
}

export interface MemoryFile {
  name: string
  path: string
  content: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
}

export type ChannelName =
  | 'whatsapp'
  | 'telegram'
  | 'discord'
  | 'feishu'
  | 'dingtalk'
  | 'email'
  | 'slack'
  | 'qq'
  | 'matrix'
  | 'mochat'

export interface ProviderInfo {
  apiKey?: string
  api_key?: string
  apiBase?: string
  api_base?: string
}
