'use client'
export const runtime = "edge";

import { BarChart3, TrendingUp, Download, PieChart, Users, Wallet } from 'lucide-react'

export default function ReportsPage() {
  const stats = [
    { label: 'Revenue (Mar)', value: '₹42,500', growth: '+12%', color: 'text-green-600 bg-green-50' },
    { label: 'New Admissions', value: '14', growth: '+5%', color: 'text-blue-600 bg-blue-50' },
    { label: 'Total Occupancy', value: '82%', growth: '+2%', color: 'text-purple-600 bg-purple-50' },
  ]

  return (
    <div className="p-4 space-y-8 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-serif text-brand-900 leading-tight">Reports</h1>
        <button className="flex items-center gap-1.5 bg-brand-900 text-white px-4 py-2 rounded-full text-xs font-bold shadow-lg shadow-brand-900/20 active:scale-95 transition-transform">
          <Download className="w-4 h-4" />
          Export All
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{stat.label}</p>
              <p className="text-2xl font-bold text-gray-900 font-mono">{stat.value}</p>
            </div>
            <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold ${stat.color}`}>
              <TrendingUp className="w-3 h-3" />
              {stat.growth}
            </div>
          </div>
        ))}
      </div>

      {/* Chart Placeholders */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest px-2">Performance</h2>
        
        <div className="bg-brand-900 text-white p-8 rounded-[2.5rem] space-y-6 shadow-xl shadow-brand-900/20 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl" />
          
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <BarChart3 className="w-5 h-5 text-brand-100" />
            </div>
            <h3 className="font-bold">Monthly Revenue</h3>
          </div>

          <div className="h-32 flex items-end gap-2 px-2">
            {[40, 65, 45, 90, 55, 75, 85].map((h, i) => (
              <div key={i} className="flex-1 bg-brand-500/40 rounded-t-lg relative group">
                <div 
                  className="absolute bottom-0 left-0 right-0 bg-brand-100 rounded-t-lg transition-all duration-500 group-hover:bg-white" 
                  style={{ height: `${h}%` }}
                />
              </div>
            ))}
          </div>
          
          <div className="flex justify-between text-[10px] font-bold text-brand-100/50 uppercase tracking-widest px-2">
            <span>Sep</span>
            <span>Oct</span>
            <span>Nov</span>
            <span>Dec</span>
            <span>Jan</span>
            <span>Feb</span>
            <span>Mar</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
            <PieChart className="w-6 h-6 text-amber-500" />
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Shift Distribution</p>
              <p className="text-lg font-bold text-gray-800">M: 40% | A: 30%</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
            <Users className="w-6 h-6 text-purple-500" />
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Gender Ratio</p>
              <p className="text-lg font-bold text-gray-800">60% Male</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
