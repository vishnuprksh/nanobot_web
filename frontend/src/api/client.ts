const API_BASE = '/api'

class ApiClient {
  private token: string | null = null

  setToken(token: string | null) {
    this.token = token
    if (token) localStorage.setItem('nanobot_token', token)
    else localStorage.removeItem('nanobot_token')
  }

  getToken(): string | null {
    if (!this.token) this.token = localStorage.getItem('nanobot_token')
    return this.token
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    }
    const token = this.getToken()
    if (token) headers['Authorization'] = `Bearer ${token}`

    const res = await fetch(`${API_BASE}${path}`, { ...options, headers })
    if (res.status === 401) {
      this.setToken(null)
      window.location.href = '/login'
      throw new Error('Unauthorized')
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({ detail: res.statusText }))
      throw new Error(body.detail || res.statusText)
    }
    return res.json()
  }

  // Auth
  async login(host: string, port: number, username: string, password: string) {
    const data = await this.request<{ access_token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ host, port, username, password }),
    })
    this.setToken(data.access_token)
    return data
  }

  async getMe() {
    return this.request<{ host: string; port: number; username: string }>('/auth/me')
  }

  // Dashboard
  async getDashboard() {
    return this.request<any>('/dashboard')
  }

  // Config
  async getConfig() {
    return this.request<any>('/config')
  }

  async updateConfig(config: any) {
    return this.request<any>('/config', {
      method: 'PUT',
      body: JSON.stringify({ config }),
    })
  }

  async getConfigSection(section: string) {
    return this.request<any>(`/config/${section}`)
  }

  async updateConfigSection(section: string, data: any) {
    return this.request<any>(`/config/${section}`, {
      method: 'PUT',
      body: JSON.stringify({ data }),
    })
  }

  // Channels
  async getChannels() {
    return this.request<any>('/channels')
  }

  async updateChannel(channel: string, data: any) {
    return this.request<any>(`/channels/${channel}`, {
      method: 'PUT',
      body: JSON.stringify({ data }),
    })
  }

  // Agents
  async getAgents() {
    return this.request<any>('/agents')
  }

  async updateAgentsMd(content: string) {
    return this.request<any>('/agents/md', {
      method: 'PUT',
      body: JSON.stringify({ content }),
    })
  }

  async updateAgentsConfig(data: any) {
    return this.request<any>('/agents/config', {
      method: 'PUT',
      body: JSON.stringify({ data }),
    })
  }

  // Skills
  async getSkills() {
    return this.request<{ skills: any[] }>('/skills')
  }

  async getSkill(name: string) {
    return this.request<any>(`/skills/${name}`)
  }

  async updateSkill(name: string, content: string) {
    return this.request<any>(`/skills/${name}`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    })
  }

  async createSkill(name: string, content: string) {
    return this.request<any>('/skills', {
      method: 'POST',
      body: JSON.stringify({ name, content }),
    })
  }

  // Providers
  async getProviders() {
    return this.request<any>('/providers')
  }

  async updateProvider(provider: string, data: any) {
    return this.request<any>(`/providers/${provider}`, {
      method: 'PUT',
      body: JSON.stringify({ data }),
    })
  }

  // Tools
  async getTools() {
    return this.request<any>('/tools')
  }

  async updateTools(data: any) {
    return this.request<any>('/tools', {
      method: 'PUT',
      body: JSON.stringify({ data }),
    })
  }

  // Memory
  async getMemory() {
    return this.request<{ files: any[] }>('/memory')
  }

  async updateMemory(path: string, content: string) {
    return this.request<any>('/memory', {
      method: 'PUT',
      body: JSON.stringify({ path, content }),
    })
  }

  // Cron
  async getCronJobs() {
    return this.request<any[]>('/cron')
  }

  async addCronJob(data: any) {
    return this.request<any>('/cron', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async removeCronJob(jobId: string) {
    return this.request<any>(`/cron/${jobId}`, {
      method: 'DELETE',
    })
  }

  async toggleCronJob(jobId: string, enabled: boolean) {
    return this.request<any>(`/cron/${jobId}/toggle`, {
      method: 'PUT',
      body: JSON.stringify({ enabled }),
    })
  }

  async runCronJob(jobId: string) {
    return this.request<any>(`/cron/${jobId}/run`, {
      method: 'POST',
    })
  }

  // Logs
  async getLogs(lines = 100) {
    return this.request<{ logs: string }>(`/logs?lines=${lines}`)
  }

  // Service
  async restartService() {
    return this.request<any>('/service/restart', { method: 'POST' })
  }

  // Health
  async health() {
    return this.request<any>('/health')
  }

  // Connectivity testing
  async testConnectivity(host: string) {
    return this.request<any>('/test-connectivity', {
      method: 'POST',
      body: JSON.stringify({ host }),
    })
  }
}

export const api = new ApiClient()
