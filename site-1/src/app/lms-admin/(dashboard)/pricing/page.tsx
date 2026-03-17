'use client'

import React, { useState, useEffect } from 'react'
import { 
  Save, 
  Trash2, 
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  Timer
} from 'lucide-react'
import { format } from 'date-fns'
import { callEdgeFunction } from '@/lib/api'
import { Skeleton } from '@/components/ui/Skeleton'

interface PricingPlan {
  id: number
  plan: string
  amount: number
  duration_minutes: number
  updated_at?: string
}

export default function PricingControl() {
  const [plans, setPlans] = useState<PricingPlan[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState<string | null>(null)
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null)

  const fetchPlans = async () => {
    setIsLoading(true)
    try {
      const data = await callEdgeFunction('update-pricing', { method: 'GET', useAdminToken: true })
      if (data) setPlans(data)
    } catch (err) {
      console.error('Failed to fetch pricing:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchPlans()
  }, [])

  const handlePriceChange = (plan: string, value: string) => {
    setPlans(prev => prev.map(p => p.plan === plan ? { ...p, amount: parseInt(value) || 0 } : p))
  }

  const handleDurationChange = (plan: string, value: string) => {
    setPlans(prev => prev.map(p => p.plan === plan ? { ...p, duration_minutes: parseInt(value) || 0 } : p))
  }

  const savePlan = async (plan: string, amount: number, duration_minutes: number) => {
    setIsSaving(plan)
    try {
      await callEdgeFunction('update-pricing', {
        method: 'PATCH',
        body: { plan, amount, duration_minutes },
        useAdminToken: true
      })
      
      setNotification({ type: 'success', message: `${plan.toUpperCase()} plan updated successfully` })
      fetchPlans()
    } catch (err) {
      setNotification({ type: 'error', message: 'Failed to update pricing' })
    } finally {
      setIsSaving(null)
      setTimeout(() => setNotification(null), 3000)
    }
  }


  return (
    <div className="space-y-10 max-w-5xl">
      <header>
        <h1 className="text-3xl font-serif text-brand-900 mb-1">Pricing Control</h1>
        <p className="text-gray-500 font-medium">Configure plan prices and exact durations for testing and production.</p>
      </header>

      {notification && (
        <div className={`p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300 ${notification.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
          {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
          <p className="text-sm font-bold">{notification.message}</p>
        </div>
      )}


      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-8 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Plan Key</th>
                <th className="px-8 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest text-center">Current Price</th>
                <th className="px-8 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Price (₹)</th>
                <th className="px-8 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Duration (Minutes)</th>
                <th className="px-8 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                [...Array(4)].map((_, i) => (
                  <tr key={i}>
                    <td className="px-8 py-6"><Skeleton className="h-4 w-20" /></td>
                    <td className="px-8 py-6"><Skeleton className="h-4 w-16 mx-auto" /></td>
                    <td className="px-8 py-6"><Skeleton className="h-10 w-28" /></td>
                    <td className="px-8 py-6"><Skeleton className="h-10 w-32" /></td>
                    <td className="px-8 py-6 text-right"><Skeleton className="h-10 w-24 ml-auto" /></td>
                  </tr>
                ))
              ) : (
                plans.map((plan) => (
                  <tr key={plan.id} className="hover:bg-gray-50/30 transition-colors">
                    <td className="px-8 py-6">
                      <span className="text-sm font-black text-brand-900 uppercase tracking-widest">{plan.plan}</span>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <span className="text-sm font-mono font-bold text-gray-600">₹{plan.amount}</span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="relative w-28">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">₹</span>
                        <input 
                          type="number"
                          min="0"
                          value={plan.amount}
                          onChange={(e) => handlePriceChange(plan.plan, e.target.value)}
                          className="w-full pl-6 pr-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all"
                        />
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="relative w-32">
                        <Timer className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                        <input 
                          type="number"
                          min="1"
                          value={plan.duration_minutes}
                          onChange={(e) => handleDurationChange(plan.plan, e.target.value)}
                          className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all"
                        />
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button 
                        onClick={() => savePlan(plan.plan, plan.amount, plan.duration_minutes)}
                        disabled={isSaving !== null}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-500 text-white rounded-xl text-xs font-bold hover:bg-brand-900 transition-all shadow-sm active:scale-95 disabled:opacity-50"
                      >
                        {isSaving === plan.plan ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        Save
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
