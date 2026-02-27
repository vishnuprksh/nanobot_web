import { create } from 'zustand'
import type { ChatMessage, DashboardData } from '../types'

interface AppStore {
  // Auth
  isAuthenticated: boolean
  serverInfo: { host: string; port: number; username: string } | null
  setAuthenticated: (val: boolean) => void
  setServerInfo: (info: { host: string; port: number; username: string } | null) => void
  logout: () => void

  // Dashboard
  dashboard: DashboardData | null
  setDashboard: (d: DashboardData | null) => void

  // Chat
  chatMessages: ChatMessage[]
  addChatMessage: (msg: ChatMessage) => void
  clearChat: () => void

  // Sidebar
  sidebarOpen: boolean
  toggleSidebar: () => void
}

export const useStore = create<AppStore>((set) => ({
  isAuthenticated: !!localStorage.getItem('nanobot_token'),
  serverInfo: null,
  setAuthenticated: (val) => set({ isAuthenticated: val }),
  setServerInfo: (info) => set({ serverInfo: info }),
  logout: () => {
    localStorage.removeItem('nanobot_token')
    set({ isAuthenticated: false, serverInfo: null, dashboard: null, chatMessages: [] })
  },

  dashboard: null,
  setDashboard: (d) => set({ dashboard: d }),

  chatMessages: [],
  addChatMessage: (msg) => set((s) => ({ chatMessages: [...s.chatMessages, msg] })),
  clearChat: () => set({ chatMessages: [] }),

  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
}))
