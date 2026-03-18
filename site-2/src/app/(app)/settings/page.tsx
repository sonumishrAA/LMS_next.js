export const runtime = "edge";
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SettingsClient from '@/components/Settings/SettingsClient'
import { getActiveLibraryId } from '@/lib/getActiveLibrary'

export default async function SettingsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 1. Get library context
  const { data: ownedLibraries } = await supabase
    .from('libraries')
    .select('*')
    .eq('owner_id', user.id)

  const { data: profile } = await supabase
    .from('staff')
    .select('*')
    .eq('user_id', user.id)
    .single()

  const libraryId = await getActiveLibraryId(user.id, profile?.library_ids || [])

  if (!libraryId) return <div className="p-8 text-center text-gray-500 italic font-medium">No library assigned to this account.</div>

  // 2. Fetch ALL detailed data in parallel
  const [
    { data: library },
    { data: shifts },
    { data: comboPlans },
    { data: lockerPolicy },
    { count: seatsCount },
    { count: lockersCount },
    { count: studentsCount },
    { data: staffMembers }
  ] = await Promise.all([
    supabase.from('libraries').select('*').eq('id', libraryId).single(),
    supabase.from('shifts').select('*').eq('library_id', libraryId),
    supabase.from('combo_plans').select('*').eq('library_id', libraryId).order('months'),
    supabase.from('locker_policies').select('*').eq('library_id', libraryId).single(),
    supabase.from('seats').select('id', { count: 'exact', head: true }).eq('library_id', libraryId),
    supabase.from('lockers').select('id', { count: 'exact', head: true }).eq('library_id', libraryId),
    supabase.from('students').select('id', { count: 'exact', head: true }).eq('library_id', libraryId),
    supabase.from('staff').select('*').contains('library_ids', [libraryId])
  ])

  // Get total unread notifications
  const { count: unreadNotifs } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('library_id', libraryId)
    .eq('is_read', false)

  return (
    <SettingsClient 
      user={user}
      profile={profile}
      library={library}
      shifts={shifts || []}
      comboPlans={comboPlans || []}
      lockerPolicy={lockerPolicy}
      stats={{
        seats: seatsCount || 0,
        lockers: lockersCount || 0,
        students: studentsCount || 0,
        unreadNotifs: unreadNotifs || 0
      }}
      staffMembers={staffMembers || []}
      allOwnedLibraries={ownedLibraries || []}
    />
  )
}
