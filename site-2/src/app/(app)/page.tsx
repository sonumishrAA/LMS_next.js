export const runtime = "edge";
import ExpiredStudentsCard from '@/components/Dashboard/ExpiredStudentsCard'
import ShiftOccupancyCard from '@/components/Dashboard/ShiftOccupancyCard'
import { Users, Grid, CreditCard, Clock, Bell, TrendingUp, AlertTriangle, UserPlus, IndianRupee, Calendar } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { daysUntil } from '@/lib/utils'
import Link from 'next/link'
import { getActiveLibraryId } from '@/lib/getActiveLibrary'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: staff } = await supabase
    .from('staff')
    .select('library_ids, name')
    .eq('user_id', user.id)
    .single()

  const libraryId = await getActiveLibraryId(user.id, staff?.library_ids || [])
  if (!libraryId) return <div>No library assigned.</div>

  // Current month boundaries
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
  const today = new Date().toISOString().split('T')[0]

  // Parallel data fetching
  const [
    { count: totalStudents },
    { data: activeSeatsData },
    { data: expiredStudents, count: expiredCount },
    { data: notifications },
    { count: newAdmissionsThisMonth },
    { data: shifts },
    { data: shiftOccupancy },
    { count: totalSeats },
    { data: feCollected },
    { data: feRefunded },
    { data: fePending },
  ] = await Promise.all([
    // Total students
    supabase.from('students').select('*', { count: 'exact', head: true }).eq('library_id', libraryId),
    // Active seats (non-expired students)
    supabase.from('students').select('seat_id', { count: 'exact', head: false }).eq('library_id', libraryId).gte('end_date', today),
    // Expired students
    supabase.from('students').select('id, name, end_date, seat_id').eq('library_id', libraryId).lt('end_date', today),
    // Recent notifications
    supabase.from('notifications').select('*').eq('library_id', libraryId).eq('is_read', false).order('created_at', { ascending: false }).limit(5),
    // New admissions this month
    supabase.from('students').select('*', { count: 'exact', head: true }).eq('library_id', libraryId).gte('admission_date', monthStart).lte('admission_date', monthEnd),
    // Library shifts config
    supabase.from('shifts').select('code, name').eq('library_id', libraryId),
    // Active shift occupancy (count per shift with gender)
    supabase.from('students').select('selected_shifts, gender').eq('library_id', libraryId).gte('end_date', today),
    // Total seats
    supabase.from('seats').select('*', { count: 'exact', head: true }).eq('library_id', libraryId).eq('is_active', true),
    // Financial: Collected this month (positive amounts)
    supabase.from('financial_events').select('amount').eq('library_id', libraryId).gt('amount', 0).gte('created_at', monthStart).lte('created_at', monthEnd + 'T23:59:59'),
    // Financial: Refunded this month (negative amounts)
    supabase.from('financial_events').select('amount').eq('library_id', libraryId).lt('amount', 0).gte('created_at', monthStart).lte('created_at', monthEnd + 'T23:59:59'),
    // Financial: All pending (latest pending_amount per student where pending > 0)
    supabase.from('financial_events').select('student_id, pending_amount, created_at').eq('library_id', libraryId).gt('pending_amount', 0).order('created_at', { ascending: false }),
  ])

  // Generate expiry notifications for newly expired students
  if (expiredStudents && expiredStudents.length > 0) {
    for (const es of expiredStudents) {
      // Check if we already notified about this student's expiry
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('library_id', libraryId)
        .eq('type', 'expiry_warning')
        .ilike('message', `%${es.name}%expired%`)
      
      if (!count || count === 0) {
        const daysPast = Math.abs(Math.floor((new Date().getTime() - new Date(es.end_date).getTime()) / (1000 * 60 * 60 * 24)))
        await supabase.from('notifications').insert({
          library_id: libraryId,
          type: 'expiry_warning',
          title: 'Plan Expired',
          message: `${es.name}'s plan expired ${daysPast} day(s) ago. Renew or remove to free their seat.`,
          is_read: false
        })
      }
    }
  }

  // Financial calculations from financial_events
  const collectedThisMonth = feCollected?.reduce((acc, e) => acc + Number(e.amount || 0), 0) || 0
  const refundedThisMonth = Math.abs(feRefunded?.reduce((acc, e) => acc + Number(e.amount || 0), 0) || 0)
  const netRevenue = collectedThisMonth - refundedThisMonth

  // Pending: get latest pending per student (deduplicate by student_id)
  const pendingByStudent = new Map<string, number>()
  fePending?.forEach((e: any) => {
    if (!pendingByStudent.has(e.student_id)) {
      pendingByStudent.set(e.student_id, Number(e.pending_amount || 0))
    }
  })
  const totalPending = Array.from(pendingByStudent.values()).reduce((acc, v) => acc + v, 0)
  const pendingStudentCount = pendingByStudent.size

  // Count unique active seats
  const uniqueActiveSeatIds = new Set(activeSeatsData?.map((s: any) => s.seat_id).filter(Boolean))
  const activeSeatNum = uniqueActiveSeatIds.size

  // Build shift occupancy stats from students' selected_shifts
  const shiftCodes = shifts?.map(s => s.code) || ['M', 'A', 'E', 'N']
  const shiftNames: Record<string, string> = { M: 'Morning', A: 'Afternoon', E: 'Evening', N: 'Night' }
  const shiftStats = shiftCodes.map(code => {
    const studentsInShift = shiftOccupancy?.filter((s: any) => s.selected_shifts?.includes(code)) || []
    const maleCount = studentsInShift.filter((s: any) => s.gender === 'male').length
    const femaleCount = studentsInShift.filter((s: any) => s.gender === 'female').length
    
    return {
      code,
      name: shifts?.find(s => s.code === code)?.name || shiftNames[code] || code,
      active: studentsInShift.length,
      male: maleCount,
      female: femaleCount,
      total: totalSeats || 0,
    }
  })

  const monthName = now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })

  return (
    <div className="p-4 space-y-5 pb-24">
      {/* Expired Students Warning */}
      {expiredCount && expiredCount > 0 ? (
        <ExpiredStudentsCard 
          count={expiredCount} 
          students={expiredStudents?.map(s => ({
            id: s.id,
            name: s.name,
            daysPast: Math.abs(daysUntil(s.end_date))
          })) || []} 
        />
      ) : null}

      {/* Monthly Overview Header */}
      <div className="bg-gradient-to-br from-brand-900 to-brand-800 rounded-2xl p-5 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white opacity-5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/60 mb-1">{monthName}</p>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-3xl font-black font-mono leading-none">₹{collectedThisMonth.toLocaleString('en-IN')}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/50 mt-1">Fee Collected</p>
          </div>
          <div className="text-right space-y-1">
            {refundedThisMonth > 0 && (
              <div>
                <p className="text-sm font-black font-mono leading-none text-red-300">-₹{refundedThisMonth.toLocaleString('en-IN')}</p>
                <p className="text-[9px] font-bold uppercase tracking-widest text-white/40">Refunded</p>
              </div>
            )}
            <div>
              <p className="text-lg font-black font-mono leading-none text-amber-300">₹{totalPending.toLocaleString('en-IN')}</p>
              <p className="text-[9px] font-bold uppercase tracking-widest text-white/40">Pending ({pendingStudentCount})</p>
            </div>
          </div>
        </div>
        {/* Net Revenue Bar */}
        <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between">
          <p className="text-[9px] font-bold uppercase tracking-widest text-white/40">Net Revenue</p>
          <p className="text-sm font-black font-mono text-green-300">₹{netRevenue.toLocaleString('en-IN')}</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-3">
            <Users className="w-5 h-5" />
          </div>
          <p className="text-2xl font-black text-gray-950 font-mono leading-none">{totalStudents || 0}</p>
          <p className="text-[9px] uppercase font-bold text-gray-400 mt-1.5 tracking-wider">Total Students</p>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <div className="w-9 h-9 rounded-xl bg-green-100 text-green-600 flex items-center justify-center mb-3">
            <Grid className="w-5 h-5" />
          </div>
          <p className="text-2xl font-black text-gray-950 font-mono leading-none">{activeSeatNum}<span className="text-sm text-gray-400 font-bold">/{totalSeats || 0}</span></p>
          <p className="text-[9px] uppercase font-bold text-gray-400 mt-1.5 tracking-wider">Active Seats</p>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center mb-3">
            <UserPlus className="w-5 h-5" />
          </div>
          <p className="text-2xl font-black text-gray-950 font-mono leading-none">{newAdmissionsThisMonth || 0}</p>
          <p className="text-[9px] uppercase font-bold text-gray-400 mt-1.5 tracking-wider">New This Month</p>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <div className="w-9 h-9 rounded-xl bg-red-100 text-red-600 flex items-center justify-center mb-3">
            <Clock className="w-5 h-5" />
          </div>
          <p className="text-2xl font-black text-gray-950 font-mono leading-none">{expiredCount || 0}</p>
          <p className="text-[9px] uppercase font-bold text-gray-400 mt-1.5 tracking-wider">Expired</p>
        </div>
      </div>

      {/* Shift Occupancy */}
      <ShiftOccupancyCard shifts={shiftStats} />

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-2">
        <Link href="/students" className="bg-brand-500 text-white p-3 rounded-2xl flex flex-col items-center justify-center gap-2 shadow-lg shadow-brand-500/20 active:scale-95 transition-transform">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
            <UserPlus className="w-4 h-4" />
          </div>
          <span className="text-[9px] font-bold uppercase tracking-widest text-center">New<br/>Admission</span>
        </Link>
        <Link href="/seat-map" className="bg-white border border-gray-200 p-3 rounded-2xl flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform">
          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-600">
            <Grid className="w-4 h-4" />
          </div>
          <span className="text-[9px] font-bold uppercase tracking-widest text-gray-600 text-center">Seat<br/>Map</span>
        </Link>
        <Link href="/financial-calendar" className="bg-green-500 text-white p-3 rounded-2xl flex flex-col items-center justify-center gap-2 shadow-lg shadow-green-500/20 active:scale-95 transition-transform">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
            <Calendar className="w-4 h-4" />
          </div>
          <span className="text-[9px] font-bold uppercase tracking-widest text-center">Financial<br/>Calendar</span>
        </Link>
      </div>

      {/* Recent Notifications */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center">
          <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wider">Recent Alerts</h3>
          <Link href="/notifications">
            <Bell className="w-4 h-4 text-gray-400 hover:text-brand-500 transition-colors" />
          </Link>
        </div>
        <div className="divide-y divide-gray-50">
          {notifications && notifications.length > 0 ? (
            notifications.map((notif: any) => (
              <div key={notif.id} className="p-4 flex gap-3">
                <div className="w-2 h-2 rounded-full bg-brand-500 mt-1.5 shrink-0" />
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-gray-950">{notif.title}</p>
                  <p className="text-[10px] text-gray-500 leading-normal">{notif.message}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-gray-400 text-xs italic">
              No new alerts. You're all caught up!
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
