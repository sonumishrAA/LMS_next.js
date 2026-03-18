export const runtime = "edge";
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getActiveLibraryId } from '@/lib/getActiveLibrary'
import FinancialCalendarClient from './FinancialCalendarClient'

export default async function FinancialCalendarPage({
  searchParams
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const resolvedParams = await searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: staff } = await supabase
    .from('staff')
    .select('library_ids, role')
    .eq('user_id', user.id)
    .single()

  const libraryId = await getActiveLibraryId(user.id, staff?.library_ids || [])
  if (!libraryId) return <div className="p-8 text-center text-gray-500 italic font-medium">No library assigned.</div>

  const startOfMonthStr = resolvedParams.month 
    ? new Date(resolvedParams.month).toISOString().split('T')[0]
    : new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]

  const mYear = parseInt(startOfMonthStr.split('-')[0])
  const mMonth = parseInt(startOfMonthStr.split('-')[1]) - 1

  // Ensure we compare the exact string boundaries like in page.tsx
  const monthStartDisplay = new Date(mYear, mMonth, 1).toISOString().split('T')[0]
  const monthEndDisplay = new Date(mYear, mMonth + 1, 0).toISOString().split('T')[0]

  // Fetch financial events
  const { data: events } = await supabase
    .from('financial_events')
    .select('*')
    .eq('library_id', libraryId)
    .gte('created_at', monthStartDisplay)
    .lte('created_at', monthEndDisplay + 'T23:59:59')
    .order('created_at', { ascending: false })

  return <FinancialCalendarClient events={events || []} currentMonth={monthStartDisplay} />
}
