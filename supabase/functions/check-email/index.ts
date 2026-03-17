import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { supabaseAdmin } from '../_shared/supabase.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email } = await req.json()
    if (!email) throw new Error('Email required')

    const { data: staff } = await supabaseAdmin
      .from('staff')
      .select('name, role')
      .eq('email', email)
      .eq('role', 'owner')
      .maybeSingle()

    if (staff) {
      return new Response(JSON.stringify({ exists: true, owner_name: staff.name }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    return new Response(JSON.stringify({ exists: false }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    console.error(`check-email error (${req.method}):`, error)
    
    // Choose appropriate status code
    let status = 400
    if (error.code || error.message?.includes('Database')) {
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
