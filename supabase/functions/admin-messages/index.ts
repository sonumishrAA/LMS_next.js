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

    // 2. Handle GET or POST (List messages fallback)
    if (req.method === 'GET' || req.method === 'POST') {
      const { data, error } = await supabaseAdmin
        .from('contact_messages')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 3. Handle PATCH
    if (req.method === 'PATCH') {
      const { id, is_read } = await req.json()
      if (!id || is_read === undefined) throw new Error('ID and is_read are required')

      const { data, error } = await supabaseAdmin
        .from('contact_messages')
        .update({ is_read })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    throw new Error('Method not allowed')

  } catch (error: any) {
    console.error('Admin messages error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
    )
  }
})
