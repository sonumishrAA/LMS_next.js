export const runtime = "edge";
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import StudentHeader from '@/components/Students/StudentHeader'
import StudentList from '@/components/Students/StudentList'
import { getActiveLibraryId } from '@/lib/getActiveLibrary'

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; q?: string }>
}) {
  const resolvedParams = await searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Robust library context
  const { data: staff } = await supabase
    .from('staff')
    .select('library_ids, role')
    .eq('user_id', user.id)
    .single()

  const libraryId = await getActiveLibraryId(user.id, staff?.library_ids || [])
  const role = staff?.role || 'staff'
  if (!libraryId) return <div className="p-8 text-center text-gray-500 italic">No library context found.</div>

  const currentFilter = resolvedParams.filter || 'all'
  const searchQuery = resolvedParams.q || ''

  const [
    { count: allCount },
    { count: paidCount },
    { count: pendingCount },
    { count: partialCount },
    { count: expiredCount }
  ] = await Promise.all([
    supabase.from('students').select('*', { count: 'exact', head: true }).eq('library_id', libraryId),
    supabase.from('students').select('*', { count: 'exact', head: true }).eq('library_id', libraryId).eq('payment_status', 'paid'),
    supabase.from('students').select('*', { count: 'exact', head: true }).eq('library_id', libraryId).eq('payment_status', 'pending'),
    supabase.from('students').select('*', { count: 'exact', head: true }).eq('library_id', libraryId).eq('payment_status', 'partial'),
    supabase.from('students').select('*', { count: 'exact', head: true }).eq('library_id', libraryId).lt('end_date', new Date().toISOString().split('T')[0]),
  ])

  let query = supabase
    .from('students')
    .select(`
      id,
      library_id,
      name,
      father_name,
      address,
      phone,
      gender,
      admission_date,
      end_date,
      plan_months,
      payment_status,
      total_fee,
      monthly_rate,
      amount_paid,
      discount_amount,
      seat_id,
      locker_id,
      selected_shifts,
      shift_display,
      seats (seat_number),
      lockers (locker_number)
    `)
    .eq('library_id', libraryId)
    .order('name')

  if (currentFilter === 'paid') query = query.eq('payment_status', 'paid')
  if (currentFilter === 'pending') query = query.eq('payment_status', 'pending')
  if (currentFilter === 'partial') query = query.eq('payment_status', 'partial')
  if (currentFilter === 'expired') query = query.lt('end_date', new Date().toISOString().split('T')[0])
  if (searchQuery) query = query.or(`name.ilike.%${searchQuery}%,seats.seat_number.ilike.%${searchQuery}%`)

  const { data: students } = await query

  const filters = [
    { label: 'All', value: 'all', count: allCount || 0, color: 'bg-gray-100 text-gray-600' },
    { label: 'Paid', value: 'paid', count: paidCount || 0, color: 'bg-green-100 text-green-700' },
    { label: 'Pending', value: 'pending', count: pendingCount || 0, color: 'bg-amber-100 text-amber-700' },
    { label: 'Partial', value: 'partial', count: partialCount || 0, color: 'bg-blue-100 text-blue-700' },
    { label: 'Expired', value: 'expired', count: expiredCount || 0, color: 'bg-red-100 text-red-700' },
  ]

  return (
    <div className="pb-24 max-w-7xl mx-auto w-full">
      <StudentHeader currentFilter={currentFilter} filters={filters} searchQuery={searchQuery} role={role} />

      {students && students.length > 0 ? (
        <StudentList students={students} role={role} />
      ) : (
        <div className="py-20 mt-28 text-center space-y-4">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto text-gray-300">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <p className="text-sm text-gray-400 italic font-medium">No students found matching your criteria.</p>
        </div>
      )}
    </div>
  )
}
