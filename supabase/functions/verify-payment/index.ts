import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { supabaseAdmin } from '../_shared/supabase.ts'

const HMAC_SHA256 = async (key: string, data: string) => {
  const encoder = new TextEncoder()
  const keyBuffer = encoder.encode(key)
  const dataBuffer = encoder.encode(data)
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, dataBuffer)
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json()

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      throw new Error('Missing parameters')
    }

    // 1. Signature Verification
    const secret = Deno.env.get('RAZORPAY_KEY_SECRET')
    if (!secret) throw new Error('Razorpay secret not configured')

    const expected = await HMAC_SHA256(secret, `${razorpay_order_id}|${razorpay_payment_id}`)
    
    if (expected !== razorpay_signature) {
      throw new Error('Invalid signature')
    }

    // 2. Idempotency check
    const { data: existing } = await supabaseAdmin
      .from('subscription_payments')
      .select('processed, library_id')
      .eq('razorpay_order_id', razorpay_order_id)
      .single()
      
    if (existing?.processed) {
      return new Response(
        JSON.stringify({ success: true, library_id: existing.library_id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Fetch form_data from temp_registrations
    const { data: tempReg, error: tempError } = await supabaseAdmin
      .from('temp_registrations')
      .select('form_data')
      .eq('razorpay_order_id', razorpay_order_id)
      .single()
      
    if (tempError || !tempReg) {
      // It's possible the webhook just processed this and deleted tempReg. Check one more time.
      const { data: recheck } = await supabaseAdmin
        .from('subscription_payments')
        .select('processed, library_id')
        .eq('razorpay_order_id', razorpay_order_id)
        .single()
        
      if (recheck?.processed) {
        return new Response(
          JSON.stringify({ success: true, library_id: recheck.library_id }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      throw new Error('Registration data expired or not found')
    }

    const f = tempReg.form_data
    let owner_uid = ''

    // 4. Handle Owner Account
    if (f.owner.isExisting) {
      const { data: staffData, error: staffError } = await supabaseAdmin
        .from('staff')
        .select('user_id')
        .eq('email', f.owner.email)
        .eq('role', 'owner')
        .single()
        
      if (staffError || !staffData?.user_id) {
        throw new Error('Existing owner user not found')
      }
      owner_uid = staffData.user_id
    } else {
      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
        email: f.owner.email,
        password: f.owner.password,
        email_confirm: true,
        user_metadata: { name: f.owner.name, role: 'owner' }
      })

      if (userError) throw userError
      owner_uid = userData.user.id
    }

    // 5. Handle Staff Accounts
    const staff_list_processed = []
    if (f.staff_list && f.staff_list.length > 0) {
      for (const staff of f.staff_list) {
        const { data: sData, error: sError } = await supabaseAdmin.auth.admin.createUser({
          email: staff.email,
          password: staff.password,
          email_confirm: true,
          user_metadata: { name: staff.name, role: staff.role || 'staff' }
        })
        if (!sError) {
          staff_list_processed.push({
            user_id: sData.user.id,
            name: staff.name,
            email: staff.email,
            staff_type: staff.staff_type
          })
        }
      }
    }

    // 6. Complete Registration via RPC
    const { data: result, error: rpcError } = await supabaseAdmin.rpc(
      'complete_library_registration',
      {
        p_order_id:      razorpay_order_id,
        p_owner_uid:     owner_uid,
        p_library_data:  f.library,
        p_seat_config:   f.seats,
        p_locker_config: f.lockers,
        p_shifts:        f.shifts,
        p_combo_plans:   f.combos,
        p_locker_policy: f.locker_policy,
        p_owner_data:    f.owner,
        p_staff_list:    staff_list_processed,
        p_plan:          f.plan || '1m',
        p_amount:        f.amount || 0,
        p_razorpay_pid:  razorpay_payment_id,
        p_razorpay_sig:  razorpay_signature,
      }
    )

    if (rpcError) throw rpcError

    return new Response(
      JSON.stringify({ success: true, library_id: result.library_id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error(`verify-payment error (${req.method}):`, error)
    
    let status = 400
    if (error.message?.includes('Database') || error.code) {
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
