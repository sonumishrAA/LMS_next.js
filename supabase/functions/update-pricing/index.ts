import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { supabaseAdmin } from '../_shared/supabase.ts'
import { jwtVerify } from 'https://deno.land/x/jose@v4.14.4/index.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Handle GET or POST (List pricing - PUBLIC)
    if (req.method === 'GET' || req.method === 'POST') {
      const { data, error } = await supabaseAdmin
        .from('pricing_config')
        .select('*')
        .order('plan', { ascending: true })

      if (error) throw error
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // 2. Handle PATCH (Update pricing - RESTRICTED)
    if (req.method === 'PATCH') {
      // Verify Admin Token
      const authHeader = req.headers.get('Authorization')
      if (!authHeader) throw new Error('No authorization header')
      
      const token = authHeader.replace('Bearer ', '')
      const jwtSecret = Deno.env.get('JWT_SECRET')?.trim()
      if (!jwtSecret) throw new Error('JWT secret not configured')
      
      const secret = new TextEncoder().encode(jwtSecret)
      const { payload } = await jwtVerify(token, secret)
      if (payload.role !== 'superadmin') throw new Error('Unauthorized')
      const { plan, amount, duration_minutes } = await req.json()
      if (!plan) throw new Error('Plan is required')

      const updateData: any = { updated_at: new Date().toISOString() }
      if (amount !== undefined) updateData.amount = amount
      if (duration_minutes !== undefined) updateData.duration_minutes = duration_minutes

      const { data, error } = await supabaseAdmin
        .from('pricing_config')
        .update(updateData)
        .eq('plan', plan)
        .select()
        .single()

      if (error) throw error
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    throw new Error('Method not allowed')
  } catch (error: any) {
    console.error(`Pricing error (${req.method}):`, error)
    
    // Choose appropriate status code
    let status = 400
    if (error.message?.includes('No authorization') || error.message?.includes('Unauthorized')) {
      status = 401
    } else if (error.code || error.message?.includes('Database')) {
      status = 500
    }

    return new Response(JSON.stringify({ 
      error: error.message,
      method: req.method 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: status,
    })
  }
})
