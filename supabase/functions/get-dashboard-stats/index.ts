import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { createSupabaseClient, supabaseAdmin } from '../_shared/supabase.ts'
import { jwtVerify } from 'https://deno.land/x/jose@v4.14.4/index.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const scope = url.searchParams.get('scope') // 'admin' or 'library'
    const library_id = url.searchParams.get('library_id')

    // 1. Admin Stats Logic (Allows GET or POST fallback)
    if (scope === 'admin' && (req.method === 'GET' || req.method === 'POST')) {
      console.log('--- Admin Stats Auth Debug ---')
      const authHeader = req.headers.get('Authorization')
      console.log('Auth header present:', !!authHeader)
      
      if (!authHeader) throw new Error('No authorization header')
      const token = authHeader.replace('Bearer ', '')
      console.log('Token length:', token.length)

      const jwtSecret = Deno.env.get('JWT_SECRET')?.trim()
      if (!jwtSecret) throw new Error('JWT secret not configured')
      
      try {
        const secret = new TextEncoder().encode(jwtSecret)
        const { payload } = await jwtVerify(token, secret)
        console.log('JWT verified successfully, role:', payload.role)
        if (payload.role !== 'superadmin') throw new Error('Unauthorized role')
      } catch (jwtErr: any) {
        console.error('JWT Verification failed:', jwtErr.message)
        return new Response(
          JSON.stringify({ error: 'Invalid or expired token', detail: jwtErr.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
        )
      }

      const today = new Date().toISOString()
      const firstOfThisMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

      const [{ count: totalLibraries }, { count: activeLibraries }, { count: graceLibraries }, { data: revenueData }, { data: regData }, { data: revData }, { data: expiringSoon }] = await Promise.all([
        supabaseAdmin.from('libraries').select('*', { count: 'exact', head: true }),
        supabaseAdmin.from('libraries').select('*', { count: 'exact', head: true }).eq('subscription_status', 'active'),
        supabaseAdmin.from('libraries').select('*', { count: 'exact', head: true }).eq('subscription_status', 'expired').gt('delete_date', today),
        supabaseAdmin.from('subscription_payments').select('amount').eq('status', 'success').gte('created_at', firstOfThisMonth),
        supabaseAdmin.from('libraries').select('created_at').gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1).toISOString()),
        supabaseAdmin.from('subscription_payments').select('amount, created_at').eq('status', 'success').gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1).toISOString()),
        supabaseAdmin.from('libraries').select('name, subscription_end, email').eq('subscription_status', 'active').lte('subscription_end', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()).gt('subscription_end', today)
      ])

      const monthlyRevenue = (revenueData || []).reduce((sum, p) => sum + Number(p.amount), 0)

      // Chart Data (Last 6 Months)
      const months = [...Array(6)].map((_, i) => {
        const d = new Date()
        d.setMonth(d.getMonth() - (5 - i))
        return {
          name: d.toLocaleString('default', { month: 'short' }),
          yearMonth: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        }
      })

      const chart_data = months.map(m => {
        const registrations = (regData || []).filter(r => r.created_at.startsWith(m.yearMonth)).length
        const revenue = (revData || []).filter(r => r.created_at.startsWith(m.yearMonth)).reduce((sum, p) => sum + Number(p.amount), 0)
        return { name: m.name, registrations, revenue }
      })

      // Recent Labs
      const { data: recentLibraries } = await supabaseAdmin
        .from('libraries')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)

      return new Response(
        JSON.stringify({
          total_libraries: totalLibraries,
          active_libraries: activeLibraries,
          grace_libraries: graceLibraries,
          monthly_revenue: monthlyRevenue,
          chart_data,
          recent_libraries: recentLibraries,
          expiring_libraries: expiringSoon
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Library Stats Logic (Site-2)
    if (scope === 'library') {
      if (!library_id) throw new Error('Library ID required')
      const supabase = createSupabaseClient(req)
      const today = new Date().toISOString().split('T')[0]

      const [{ data: students }, { data: seats }, { data: shifts }, { data: sss }] = await Promise.all([
        supabase.from('students').select('*').eq('library_id', library_id).eq('is_deleted', false),
        supabase.from('seats').select('*').eq('library_id', library_id).eq('is_active', true),
        supabase.from('shifts').select('*').eq('library_id', library_id),
        supabase.from('student_seat_shifts').select('*').in('shift_code', ['M','A','E','N']).gte('end_date', today) // Simplified SSS fetch
      ])

      // Reuse original aggregation logic
      const totalStudents = students?.length || 0
      const activeSeatsCount = seats?.length || 0
      
      const sssFiltered = sss?.filter(s => (seats || []).some(seat => seat.id === s.seat_id))
      const occupiedSeatsCount = new Set(sssFiltered?.map(s => s.seat_id)).size

      const next7Days = new Date()
      next7Days.setDate(next7Days.getDate() + 7)
      const next7DaysStr = next7Days.toISOString().split('T')[0]
      
      const expiringSoon = (students || []).filter(s => s.end_date >= today && s.end_date <= next7DaysStr)

      return new Response(
        JSON.stringify({
          total_students: totalStudents,
          active_seats: activeSeatsCount,
          occupied_seats: occupiedSeatsCount,
          expiring_soon_count: expiringSoon.length,
          expiring_students: expiringSoon
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    throw new Error('Invalid scope')

  } catch (error: any) {
    console.error('Stats error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
