'use client'

import React, { useState, useEffect } from 'react'
import { 
  Phone, 
  MessageSquare, 
  Clock, 
  CheckCircle, 
  Circle,
  ExternalLink,
  RefreshCw,
  Mail,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { callEdgeFunction } from '@/lib/api'
import { Skeleton } from '@/components/ui/Skeleton'

interface Message {
  id: string
  name: string
  phone: string
  message: string
  is_read: boolean
  created_at: string
}

export default function MessagesInbox() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState<string | null>(null)

  const fetchMessages = async (silent = false) => {
    if (!silent) setIsLoading(true)
    try {
      const data = await callEdgeFunction('admin-messages', { method: 'GET', useAdminToken: true })
      if (data) setMessages(data)
    } catch (err) {
      console.error('Failed to fetch messages:', err)
    } finally {
      if (!silent) setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchMessages()
    const interval = setInterval(() => fetchMessages(true), 60000) // Poll every 60s
    return () => clearInterval(interval)
  }, [])

  const markReadStatus = async (id: string, is_read: boolean) => {
    setIsUpdating(id)
    try {
      await callEdgeFunction('admin-messages', {
        method: 'PATCH',
        body: { id, is_read },
        useAdminToken: true
      })
      setMessages(prev => prev.map(m => m.id === id ? { ...m, is_read } : m))
    } catch (err) {
      console.error('Failed to update message status:', err)
    } finally {
      setIsUpdating(null)
    }
  }

  const filteredMessages = messages.filter(m => {
    if (filter === 'unread') return !m.is_read
    if (filter === 'read') return m.is_read
    return true
  })

  const unreadCount = messages.filter(m => !m.is_read).length

  return (
    <div className="space-y-8 max-w-3xl">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-serif text-brand-900 mb-1 flex items-center gap-4">
            Help Messages
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-[11px] font-black px-2.5 py-1 rounded-full animate-pulse shadow-lg shadow-red-500/20">
                {unreadCount} NEW
              </span>
            )}
          </h1>
          <p className="text-gray-500 font-medium">Contact form submissions from the help page</p>
        </div>
        <button 
          onClick={() => fetchMessages()}
          disabled={isLoading}
          className="p-2 text-brand-500 hover:bg-brand-50 rounded-lg transition-all active:scale-95"
          title="Refresh messages"
        >
          <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </header>

      <div className="flex gap-2 p-1 bg-gray-100 rounded-xl w-fit">
        <FilterTab active={filter === 'all'} onClick={() => setFilter('all')} label="All" count={messages.length} />
        <FilterTab active={filter === 'unread'} onClick={() => setFilter('unread')} label="Unread" count={unreadCount} />
        <FilterTab active={filter === 'read'} onClick={() => setFilter('read')} label="Read" count={messages.length - unreadCount} />
      </div>

      <div className="space-y-4">
        {isLoading && messages.length === 0 ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
              <div className="flex justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-5 w-5 rounded-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </div>
          ))
        ) : filteredMessages.length > 0 ? (
          filteredMessages.map((msg) => (
            <div 
              key={msg.id}
              onClick={() => setExpandedId(expandedId === msg.id ? null : msg.id)}
              className={`
                bg-white rounded-2xl border transition-all cursor-pointer relative overflow-hidden group
                ${msg.is_read ? 'border-gray-100 shadow-sm' : 'border-amber-200 shadow-md bg-amber-50/20'}
                ${expandedId === msg.id ? 'ring-2 ring-brand-500/20' : ''}
              `}
            >
              {!msg.is_read && (
                <div className="absolute top-4 right-4 w-2.5 h-2.5 bg-red-500 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
              )}
              
              <div className="p-6 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className={`text-base ${msg.is_read ? 'text-gray-900 font-bold' : 'text-brand-900 font-black'}`}>
                      {msg.name}
                    </h3>
                    <div className="flex items-center gap-3 mt-1 text-xs font-medium text-gray-500">
                      <a 
                        href={`tel:${msg.phone}`} 
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1.5 hover:text-brand-500 transition-colors"
                      >
                        <Phone className="w-3.5 h-3.5" /> {msg.phone}
                      </a>
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" /> {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                  {expandedId === msg.id ? <ChevronUp className="w-5 h-5 text-gray-600" /> : <ChevronDown className="w-5 h-5 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" />}
                </div>

                <p className={`text-sm leading-relaxed ${expandedId === msg.id ? 'text-gray-700' : 'text-gray-500 truncate line-clamp-2 font-medium'}`}>
                  {msg.message}
                </p>

                {expandedId === msg.id && (
                  <div className="pt-6 mt-6 border-t border-gray-100 flex flex-wrap gap-4 items-center justify-between animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">
                      Received {format(new Date(msg.created_at), 'd MMM yyyy · h:mm a')}
                    </div>
                    <div className="flex gap-3">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation()
                          markReadStatus(msg.id, !msg.is_read)
                        }}
                        disabled={isUpdating === msg.id}
                        className={`
                          inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all
                          ${msg.is_read ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-brand-500 text-white hover:bg-brand-900'}
                        `}
                      >
                        {isUpdating === msg.id ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : msg.is_read ? (
                          <Circle className="w-3.5 h-3.5" />
                        ) : (
                          <CheckCircle className="w-3.5 h-3.5" />
                        )}
                        {msg.is_read ? 'Mark Unread' : 'Mark Read'}
                      </button>
                      
                      <a 
                        href={`https://wa.me/91${msg.phone.replace(/\D/g, '')}?text=Hi%20${encodeURIComponent(msg.name)}%2C%20this%20is%20LibraryOS%20Admin...`}
                        target="_blank"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg text-xs font-bold hover:bg-green-600 transition-all"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        WhatsApp
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white border-2 border-dashed border-gray-100 rounded-3xl py-20 flex flex-col items-center justify-center text-center space-y-4">
            <div className="bg-gray-50 p-4 rounded-full">
              <MessageSquare className="w-8 h-8 text-gray-300" />
            </div>
            <div className="space-y-1">
              <p className="text-gray-900 font-bold">No messages found</p>
              <p className="text-sm text-gray-600 font-medium">New contact form submissions will appear here.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function FilterTab({ active, onClick, label, count }: { active: boolean, onClick: () => void, label: string, count: number }) {
  return (
    <button 
      onClick={onClick}
      className={`
        px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2
        ${active ? 'bg-white text-brand-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}
      `}
    >
      {label}
      {count > 0 && (
        <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${active ? 'bg-brand-50 text-brand-600' : 'bg-gray-200 text-gray-500'}`}>
          {count}
        </span>
      )}
    </button>
  )
}
