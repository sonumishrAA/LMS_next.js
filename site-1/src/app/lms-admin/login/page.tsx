'use client'
// Force build trigger

import React, { useState } from 'react'
import { BookOpen, Lock, Eye, EyeOff, AlertCircle, Clock } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { callEdgeFunction } from '@/lib/api'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const isExpired = searchParams.get('expired') === '1'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const data = await callEdgeFunction('admin-login', {
        body: { email, password }
      })

      if (data.token) {
        localStorage.setItem('admin_token', data.token)
        // Redirect to /lms-admin which will now use the (dashboard) layout
        router.push('/lms-admin')
        router.refresh() // Force refresh to ensure layout switch
      } else {
        setError('Access denied.')
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0F1F5C] flex items-center justify-center font-sans p-4">
      <div className="max-w-sm w-full bg-white rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-brand-500 p-2 rounded-lg mb-4">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <h1 className="font-serif text-2xl font-bold text-brand-900 mb-1">LibraryOS</h1>
          <p className="text-[13px] text-gray-500 font-bold uppercase tracking-widest flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5" /> Admin Access
          </p>
        </div>

        {isExpired && (
          <div className="mb-4 p-4 bg-amber-50 border border-amber-100 rounded-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <Clock className="w-5 h-5 text-amber-500 shrink-0" />
            <p className="text-sm font-medium text-amber-700">Session expired. Please sign in again.</p>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
            <p className="text-sm font-medium text-red-600">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-gray-900 text-sm font-medium"
              placeholder="Manager@libraryos.in"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-gray-900 text-sm font-medium pr-12"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-brand-500 transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 bg-brand-500 hover:bg-brand-900 text-white font-bold rounded-xl shadow-lg shadow-brand-500/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none"
          >
            {isLoading ? 'Verifying...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
