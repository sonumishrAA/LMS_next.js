import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { supabaseAdmin } from '../_shared/supabase.ts'
import { jwtVerify } from 'https://deno.land/x/jose@v4.14.4/index.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Verify Admin Token
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('No authorization header')
    
    const token = authHeader.replace('Bearer ', '')
    const jwtSecret = Deno.env.get('JWT_SECRET')?.trim()
    if (!jwtSecret) throw new Error('JWT secret not configured')
    
    const secret = new TextEncoder().encode(jwtSecret)
    const { payload } = await jwtVerify(token, secret)
    
    if (payload.role !== 'superadmin') throw new Error('Unauthorized')

    // 2. Fetch all libraries (Allows GET or POST)
    if (req.method !== 'GET' && req.method !== 'POST') {
      throw new Error('Method not allowed')
    }

    const { data: libraries, error: libError } = await supabaseAdmin
      .from('libraries')
      .select('*')
      .order('created_at', { ascending: false })

    if (libError) throw libError

    // 3. Fetch all staff
    const { data: allStaff } = await supabaseAdmin
      .from('staff')
      .select('*')
      .order('created_at', { ascending: true })

    // 4. Fetch student counts
    const { data: allStudents } = await supabaseAdmin
      .from('students')
      .select('library_id, gender, id, is_deleted')

    // 5. Fetch Auth users
    const { data: authData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
    const authUsers = authData?.users || []

    const authMap: Record<string, { name?: string; email?: string; user_id?: string }> = {}
    for (const u of authUsers) {
      authMap[u.id] = {
        name: u.user_metadata?.name || u.email?.split('@')[0],
        email: u.email,
        user_id: u.id,
      }
    }

    // 6. Enrich
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
      const studentStats = {
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
        student_stats: studentStats,
      }
    })

    return new Response(
      JSON.stringify(enriched),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Admin libraries error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
    )
  }
})
