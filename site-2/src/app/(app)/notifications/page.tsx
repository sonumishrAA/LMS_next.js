export const runtime = "edge";
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import NotificationsClient from './NotificationsClient'
import { getActiveLibraryId } from '@/lib/getActiveLibrary'

export default async function NotificationsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: staff } = await supabase
    .from('staff')
    .select('library_ids')
    .eq('user_id', user.id)
    .single()

  const libraryId = await getActiveLibraryId(user.id, staff?.library_ids || [])
  if (!libraryId) return <div className="p-8 text-center text-gray-500 italic">No library assigned.</div>

  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('library_id', libraryId)
    .order('created_at', { ascending: false })
    .limit(50)

  return <NotificationsClient notifications={notifications || []} libraryId={libraryId} />
}
