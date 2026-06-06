import { createClient } from '@supabase/supabase-js'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// GET /api/group-invites?user_id=X
// Returns pending group invite challenges + accepted challenge IDs
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')
    if (!userId) return Response.json({ pending: [], activeIds: [] })

    const admin = adminClient()

    const [{ data: pendingParts }, { data: acceptedParts }] = await Promise.all([
      admin.from('challenge_participants').select('challenge_id').eq('user_id', userId).eq('status', 'pending'),
      admin.from('challenge_participants').select('challenge_id').eq('user_id', userId).eq('status', 'accepted'),
    ])

    let pending = []
    if (pendingParts && pendingParts.length > 0) {
      const { data } = await admin
        .from('habit_challenges').select('*')
        .in('id', pendingParts.map(p => p.challenge_id))
        .neq('status', 'declined')
      pending = (data ?? []).map(c => ({ ...c, isGroupParticipant: true }))
    }

    let active = []
    if (acceptedParts && acceptedParts.length > 0) {
      const { data } = await admin
        .from('habit_challenges').select('*')
        .in('id', acceptedParts.map(p => p.challenge_id))
        .eq('status', 'active')
      active = (data ?? []).map(c => ({ ...c, isGroupParticipant: true }))
    }

    return Response.json({ pending, active })
  } catch (err) {
    console.error('group-invites GET error:', err)
    return Response.json({ pending: [], activeIds: [] })
  }
}

// POST /api/group-invites — insert challenge_participants rows
export async function POST(request) {
  try {
    const { challenge_id, user_ids } = await request.json()
    if (!challenge_id || !user_ids || user_ids.length === 0) {
      return Response.json({ ok: true })
    }

    const admin = adminClient()
    const { error } = await admin.from('challenge_participants').insert(
      user_ids.map(uid => ({ challenge_id, user_id: uid, status: 'pending' }))
    )

    if (error) {
      console.error('group-invites POST error:', error)
      return Response.json({ error: 'Failed to create invites' }, { status: 500 })
    }

    return Response.json({ ok: true })
  } catch (err) {
    console.error('group-invites POST error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/group-invites — update a participant's status
export async function PATCH(request) {
  try {
    const { challenge_id, user_id, status } = await request.json()
    if (!challenge_id || !user_id || !status) {
      return Response.json({ error: 'Missing fields' }, { status: 400 })
    }

    const admin = adminClient()
    const { error } = await admin
      .from('challenge_participants')
      .update({ status })
      .eq('challenge_id', challenge_id)
      .eq('user_id', user_id)

    if (error) {
      console.error('group-invites PATCH error:', error)
      return Response.json({ error: 'Failed to update status' }, { status: 500 })
    }

    return Response.json({ ok: true })
  } catch (err) {
    console.error('group-invites PATCH error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
