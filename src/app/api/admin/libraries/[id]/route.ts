import { NextRequest, NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase/service'
import { getAdminFromRequest } from '@/lib/admin-auth'

// PATCH /api/admin/libraries/[id] — update subscription info
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await getAdminFromRequest(req)
    const { id } = await params
    const body = await req.json()

    const allowed = [
      'subscription_status',
      'subscription_plan',
      'subscription_start',
      'subscription_end',
      'name',
      'phone',
      'address',
      'delete_date',
    ]
    const updates: Record<string, unknown> = {}
    for (const key of allowed) {
      if (key in body) updates[key] = body[key]
    }
    updates.updated_at = new Date().toISOString()

    const { error } = await supabaseService
      .from('libraries')
      .update(updates)
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}

// DELETE /api/admin/libraries/[id] — delete library + cleanup auth users
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await getAdminFromRequest(req)
    const { id: libId } = await params

    // 1. Get owner_id and staff user_ids before deleting
    const { data: lib } = await supabaseService
      .from('libraries')
      .select('owner_id')
      .eq('id', libId)
      .single()

    const { data: staffRows } = await supabaseService
      .from('staff')
      .select('user_id')
      .contains('library_ids', [libId])

    // 2. Delete library (cascades to students, seats, shifts, etc via DB constraints)
    const { error: libError } = await supabaseService
      .from('libraries')
      .delete()
      .eq('id', libId)

    if (libError) throw libError

    // 3. Delete staff auth users
    if (staffRows && staffRows.length > 0) {
      for (const s of staffRows) {
        if (s.user_id) {
          await supabaseService.auth.admin.deleteUser(s.user_id)
        }
      }
    }

    // 4. Delete owner auth user if they have no other libraries
    if (lib?.owner_id) {
      // Check if owner owns any other libraries before deleting
      const { data: otherLibs } = await supabaseService
        .from('libraries')
        .select('id')
        .eq('owner_id', lib.owner_id)

      if (!otherLibs || otherLibs.length === 0) {
        await supabaseService.auth.admin.deleteUser(lib.owner_id)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete library error:', error)
    return NextResponse.json({ error: 'Failed to delete library' }, { status: 500 })
  }
}
