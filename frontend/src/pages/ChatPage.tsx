import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store'
import { api } from '../api/client'
import { Send, Trash2, Bot, User } from 'lucide-react'
import type { ChatMessage } from '../types'

export default function ChatPage() {
  const { chatMessages, addChatMessage, clearChat } = useStore()
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const [wsConnected, setWsConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    connectWs()
    return () => {
      wsRef.current?.close()
    }
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  const connectWs = () => {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const ws = new WebSocket(`${protocol}://${window.location.host}/ws/chat`)

    ws.onopen = () => {
      // Authenticate
      const token = api.getToken()
      ws.send(JSON.stringify({ token }))
    }

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.type === 'connected') {
        setWsConnected(true)
        addChatMessage({
          id: crypto.randomUUID(),
          role: 'system',
          content: 'Connected to nanobot. You can chat to add features, manage configuration, and more.',
          timestamp: Date.now(),
        })
      } else if (data.type === 'thinking') {
        setThinking(true)
      } else if (data.type === 'response') {
        setThinking(false)
        addChatMessage({
          id: crypto.randomUUID(),
          role: 'assistant',
          content: data.message,
          timestamp: Date.now(),
        })
      } else if (data.type === 'error') {
        setThinking(false)
        addChatMessage({
          id: crypto.randomUUID(),
          role: 'system',
          content: `Error: ${data.message}`,
          timestamp: Date.now(),
        })
      }
    }

    ws.onclose = () => {
      setWsConnected(false)
    }

    ws.onerror = () => {
      setWsConnected(false)
    }

    wsRef.current = ws
  }

  const sendMessage = () => {
    const text = input.trim()
    if (!text || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return

    addChatMessage({
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
    })

    wsRef.current.send(JSON.stringify({ message: text }))
    setInput('')
    setThinking(true)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-dark-50">Chat with nanobot</h2>
          <p className="text-dark-400 text-sm mt-1">
            Ask nanobot to add features, create sub-agents, manage skills, and more
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`badge ${wsConnected ? 'badge-success' : 'badge-warning'}`}
          >
            {wsConnected ? 'Connected' : 'Disconnected'}
          </span>
          <button onClick={clearChat} className="btn-secondary flex items-center gap-2 text-sm">
            <Trash2 className="w-3.5 h-3.5" />
            Clear
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto card p-4 mb-4 space-y-4">
        {chatMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-dark-500">
            <Bot className="w-12 h-12 mb-3 opacity-30" />
            <p>Start a conversation with nanobot</p>
            <p className="text-xs mt-1">
              Try: "Create a new weather skill" or "Add a Telegram channel"
            </p>
          </div>
        )}

        {chatMessages.map((msg: ChatMessage) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role !== 'user' && (
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  msg.role === 'assistant'
                    ? 'bg-nano-600/20 text-nano-400'
                    : 'bg-dark-700 text-dark-400'
                }`}
              >
                {msg.role === 'assistant' ? '🐈' : <Bot className="w-4 h-4" />}
              </div>
            )}

            <div
              className={`max-w-[75%] rounded-xl px-4 py-3 text-sm whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-nano-600 text-white'
                  : msg.role === 'assistant'
                  ? 'bg-dark-800 text-dark-100 border border-dark-700'
                  : 'bg-dark-800/50 text-dark-400 italic border border-dark-700/50'
              }`}
            >
              {msg.content}
            </div>

            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-lg bg-dark-700 flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-dark-300" />
              </div>
            )}
          </div>
        ))}

        {thinking && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-nano-600/20 flex items-center justify-center flex-shrink-0">
              🐈
            </div>
            <div className="bg-dark-800 rounded-xl px-4 py-3 border border-dark-700">
              <div className="flex gap-1.5">
                <span className="w-2 h-2 bg-nano-400 rounded-full animate-bounce" />
                <span className="w-2 h-2 bg-nano-400 rounded-full animate-bounce [animation-delay:.15s]" />
                <span className="w-2 h-2 bg-nano-400 rounded-full animate-bounce [animation-delay:.3s]" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="card p-3">
        <div className="flex items-end gap-3">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message nanobot... (Shift+Enter for new line)"
            rows={1}
            className="input flex-1 resize-none min-h-[44px] max-h-36"
            style={{ height: 'auto', overflow: 'hidden' }}
            onInput={(e) => {
              const t = e.currentTarget
              t.style.height = 'auto'
              t.style.height = Math.min(t.scrollHeight, 144) + 'px'
            }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || !wsConnected}
            className="btn-primary p-3 rounded-lg"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
