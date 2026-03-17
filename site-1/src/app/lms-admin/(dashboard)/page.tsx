'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { callEdgeFunction } from '@/lib/api'
import { format } from 'date-fns'
import { 
  Users, 
  Library as LibraryIcon, 
  AlertTriangle, 
  TrendingUp,
  MapPin,
  Calendar,
  ChevronRight
} from 'lucide-react'
import { Skeleton } from '@/components/ui/Skeleton'
import ChartsWrapper from '@/components/admin/ChartsWrapper'

export default function AdminOverview() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const stats = await callEdgeFunction('get-dashboard-stats', {
          method: 'GET',
          queryParams: { scope: 'admin' },
          useAdminToken: true
        })
        setData(stats)
      } catch (err) {
        console.error('Failed to fetch stats:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])


  if (!loading && !data) return <div className="p-10 text-center text-red-500 font-bold bg-red-50 rounded-2xl">Error loading dashboard. Please refresh.</div>

  const { 
    total_libraries, 
    active_libraries, 
    grace_libraries, 
    monthly_revenue, 
    chart_data, 
    recent_libraries, 
    expiring_libraries 
  } = data || {}

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-3xl font-serif text-brand-900 mb-1">Overview</h1>
        <p className="text-gray-500 font-medium">
          {format(new Date(), 'EEEE, d MMMM yyyy')}
        </p>
      </header>

      {/* Stats Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Libraries" 
          value={total_libraries} 
          loading={loading}
          icon={<LibraryIcon className="w-5 h-5 text-brand-500" />} 
          color="bg-white" 
        />
        <StatCard 
          title="Active Now" 
          value={active_libraries} 
          loading={loading}
          icon={<Users className="w-5 h-5 text-green-500" />} 
          color="bg-white" 
        />
        <StatCard 
          title="In Grace Period" 
          value={grace_libraries} 
          loading={loading}
          icon={<AlertTriangle className="w-5 h-5 text-amber-500" />} 
          color="bg-white" 
        />
        <StatCard 
          title="Revenue (Month)" 
          value={monthly_revenue !== undefined ? `₹${(monthly_revenue || 0).toLocaleString()}` : null} 
          loading={loading}
          icon={<TrendingUp className="w-5 h-5 text-blue-500" />} 
          color="bg-white" 
        />
      </section>

      {/* Charts Row */}
      <section className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 h-[400px]">
        {loading ? (
          <div className="h-full flex flex-col gap-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="flex-1 w-full" />
          </div>
        ) : (
          <ChartsWrapper data={chart_data} />
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Recent Registrations */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex justify-between items-end">
            <h3 className="text-lg font-bold text-brand-900">Latest Registrations</h3>
            <Link href="/lms-admin/libraries" className="text-xs font-bold text-brand-500 uppercase tracking-widest hover:underline">View All</Link>
          </div>
          
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Library</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Location</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Plan</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Date</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loading ? (
                    [...Array(5)].map((_, i) => (
                      <tr key={i}>
                        <td className="px-6 py-4"><Skeleton className="h-4 w-32 mb-1" /><Skeleton className="h-2 w-20" /></td>
                        <td className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
                        <td className="px-6 py-4"><Skeleton className="h-4 w-12" /></td>
                        <td className="px-6 py-4"><Skeleton className="h-4 w-16" /></td>
                        <td className="px-6 py-4"><Skeleton className="h-6 w-20 rounded-full" /></td>
                      </tr>
                    ))
                  ) : recent_libraries?.length ? recent_libraries.map((lib: any) => (
                    <tr key={lib.id} className="hover:bg-gray-50/50 transition-colors cursor-pointer">
                      <td className="px-6 py-4">
                        <p className="font-bold text-brand-900 text-sm">{lib.name}</p>
                        <p className="text-[10px] text-gray-600 font-medium truncate w-32">{lib.email}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-xs text-gray-600 font-medium">
                          <MapPin className="w-3.5 h-3.5 text-gray-600" />
                          {lib.city}, {lib.state}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-brand-500">
                        {lib.subscription_plan || '1m'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                          <Calendar className="w-3.5 h-3.5" />
                          {format(new Date(lib.created_at), 'd MMM')}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={lib.subscription_status} />
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center text-gray-600 text-sm italic">No registrations yet</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Side Panel: Expirations */}
        <div className="lg:col-span-4 space-y-6">
          {loading ? (
             <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 space-y-4">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
             </div>
          ) : expiring_libraries && expiring_libraries.length > 0 ? (
            <div className="bg-amber-50 border-l-[3px] border-amber-500 p-6 rounded-r-2xl space-y-4">
              <h3 className="text-amber-800 font-bold flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                {expiring_libraries.length} libraries expiring soon
              </h3>
              <div className="space-y-4">
                {expiring_libraries.map((lib: any, i: number) => (
                  <div key={i} className="bg-white/50 p-3 rounded-lg border border-amber-200/50">
                    <p className="text-sm font-bold text-brand-900">{lib.name}</p>
                    <p className="text-xs text-amber-700 font-medium mt-0.5">Expires {format(new Date(lib.expires_at!), 'd MMM')}</p>
                    <a href={`mailto:${lib.email}`} className="text-[10px] text-brand-500 font-bold hover:underline mt-2 block uppercase tracking-wider">Email Owner</a>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
            <h3 className="text-brand-900 font-bold">Quick Actions</h3>
            <div className="space-y-2">
              <QuickActionLink href="/lms-admin/libraries" label="Manage Libraries" />
              <QuickActionLink href="/lms-admin/pricing" label="Update Pricing" />
              <QuickActionLink href="/lms-admin/messages" label="Check Messages" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ title, value, icon, color, loading }: { title: string, value: any, icon: React.ReactNode, color: string, loading: boolean }) {
  return (
    <div className={`${color} p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4`}>
      <div className="flex justify-between items-start">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{title}</p>
        <div className="p-2 bg-gray-50 rounded-lg">{icon}</div>
      </div>
      {loading ? (
        <Skeleton className="h-8 w-24" />
      ) : (
        <p className="text-2xl font-bold text-brand-900 font-mono tracking-tight">{value}</p>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    expired: 'bg-red-100 text-red-700',
    grace: 'bg-amber-100 text-amber-700',
    deleted: 'bg-gray-100 text-gray-500',
  }
  return (
    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${styles[status] || styles.deleted}`}>
      ● {status}
    </span>
  )
}

function QuickActionLink({ href, label }: { href: string, label: string }) {
  return (
    <Link href={href} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-brand-50 group transition-all">
      <span className="text-sm font-bold text-gray-600 group-hover:text-brand-900 transition-colors">{label}</span>
      <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-brand-500 transition-all group-hover:translate-x-0.5" />
    </Link>
  )
}
