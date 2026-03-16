import React from 'react'
import { supabaseService } from '@/lib/supabase/service'
import LibrariesTable from '@/components/admin/LibrariesTable'

export default async function LibrariesPage() {
  // Fetch all libraries directly via service role (no HTTP self-call)
  const { data: libraries } = await supabaseService
    .from('libraries')
    .select('*')
    .order('created_at', { ascending: false })

  // Fetch all staff
  const { data: allStaff } = await supabaseService
    .from('staff')
    .select('*')
    .order('created_at', { ascending: true })

  // Fetch student counts
  const { data: allStudents } = await supabaseService
    .from('students')
    .select('library_id, gender, id, is_deleted')

  // Fetch all Supabase Auth users
  const { data: authData } = await supabaseService.auth.admin.listUsers({ perPage: 1000 })
  const authUsers = authData?.users || []

  const authMap: Record<string, { name?: string; email?: string }> = {}
  for (const u of authUsers) {
    authMap[u.id] = {
      name: u.user_metadata?.name || u.email?.split('@')[0],
      email: u.email,
    }
  }

  const enriched = (libraries || []).map((lib) => {
    const staff = (allStaff || [])
      .filter((s) => (s.library_ids || []).includes(lib.id))
      .map((s) => ({
        ...s,
        auth_email: authMap[s.user_id]?.email || s.email,
        auth_name: authMap[s.user_id]?.name || s.name,
      }))

    const ownerAuth = lib.owner_id ? authMap[lib.owner_id] : null

    const libStudents = (allStudents || []).filter(
      (st) => st.library_id === lib.id && !st.is_deleted
    )
    const student_stats = {
      total: libStudents.length,
      male: libStudents.filter((s) => s.gender === 'male').length,
      female: libStudents.filter((s) => s.gender === 'female').length,
      neutral: libStudents.filter((s) => s.gender === 'neutral').length,
    }

    return {
      ...lib,
      staff,
      owner_email: ownerAuth?.email || null,
      owner_name: ownerAuth?.name || null,
      student_stats,
    }
  })

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

      <LibrariesTable initialData={enriched} />
    </div>
  )
}
