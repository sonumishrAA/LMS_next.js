'use client'

import React, { useEffect, useState } from 'react'
import { callEdgeFunction } from '@/lib/api'
import LibrariesTable from '@/components/admin/LibrariesTable'
import { Skeleton } from '@/components/ui/Skeleton'
import { Loader2 } from 'lucide-react'

export default function LibrariesPage() {
  const [enriched, setEnriched] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const data = await callEdgeFunction('admin-libraries', {
          method: 'GET',
          useAdminToken: true
        })
        setEnriched(data)
      } catch (err) {
        console.error('Failed to fetch libraries:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])


  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-serif text-brand-900 mb-1">Libraries</h1>
          <p className="text-gray-500 font-medium">Manage all registered study libraries</p>
        </div>
        <div className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-600 shadow-sm">
          Total: {enriched.length}
        </div>
      </header>

      {loading ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-8 space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-12 w-full" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <LibrariesTable initialData={enriched} />
      )}
    </div>
  )
}
