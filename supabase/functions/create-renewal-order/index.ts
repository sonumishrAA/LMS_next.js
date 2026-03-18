import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { supabaseAdmin } from '../_shared/supabase.ts'
import { jwtVerify } from 'https://deno.land/x/jose@v4.14.4/index.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { token, library_id, plan_months } = await req.json()

    if (!token || !library_id || !plan_months) {
      throw new Error('Missing fields')
    }

    const planKey = `${plan_months}m`

    // 1. Verify token
    const jwtSecret = Deno.env.get('JWT_SECRET')
    if (!jwtSecret) throw new Error('JWT secret not configured')
    const secret = new TextEncoder().encode(jwtSecret)
    
    let payload
    try {
      const { payload: verifiedPayload } = await jwtVerify(token, secret)
      payload = verifiedPayload
    } catch (err) {
      throw new Error('Invalid or expired token')
    }

    if (payload.purpose !== 'renew' || payload.library_id !== library_id) {
      throw new Error('Invalid token purpose or library')
    }

    // 2. Fetch price from DB
    const { data: pricing, error: pError } = await supabaseAdmin
      .from('pricing_config')
      .select('amount')
      .eq('plan', planKey)
      .single()

    if (pError || !pricing) throw new Error(`Price not found for plan ${planKey}`)
    const amount = Number(pricing.amount)

    // 3. Double check ownership
    const { data: staff } = await supabaseAdmin
      .from('staff')
      .select('id')
      .eq('user_id', payload.owner_id)
      .eq('role', 'owner')
      .contains('library_ids', [library_id])
      .single()

    if (!staff) throw new Error('Forbidden: Not the owner')

    // 4. Create Razorpay order
    const rzpKeyId = Deno.env.get('RAZORPAY_KEY_ID')
    const rzpSecret = Deno.env.get('RAZORPAY_KEY_SECRET')

    const auth = btoa(`${rzpKeyId}:${rzpSecret}`)
    const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amount * 100,
        currency: 'INR',
        receipt: `rnw_${library_id.slice(0, 8)}_${Date.now().toString().slice(-8)}`,
        notes: {
          library_id,
          plan: planKey,
          type: 'subscription_renewal',
        },
      }),
    })

    const order = await rzpRes.json()
    if (!rzpRes.ok) throw new Error(order.error?.description || 'Razorpay order creation failed')

    return new Response(JSON.stringify({
      order_id: order.id,
      amount: order.amount,
      key: rzpKeyId,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    console.error('Create renewal order error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
