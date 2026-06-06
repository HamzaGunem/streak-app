import { createClient } from '@supabase/supabase-js'

export async function POST(request) {
  try {
    const { winner_id, loser_id, challenge_id } = await request.json()

    if (!winner_id || !loser_id || !challenge_id) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Read both existing rivalry rows in parallel
    const [{ data: winnerRow }, { data: loserRow }] = await Promise.all([
      adminClient.from('rivalries').select('*')
        .eq('user_id', winner_id).eq('rival_id', loser_id).maybeSingle(),
      adminClient.from('rivalries').select('*')
        .eq('user_id', loser_id).eq('rival_id', winner_id).maybeSingle(),
    ])

    // Upsert winner perspective: user_wins++, total_challenges++
    // Upsert loser perspective:  rival_wins++, total_challenges++
    await Promise.all([
      adminClient.from('rivalries').upsert(
        {
          user_id: winner_id,
          rival_id: loser_id,
          user_wins:        (winnerRow?.user_wins        ?? 0) + 1,
          rival_wins:        winnerRow?.rival_wins        ?? 0,
          total_challenges: (winnerRow?.total_challenges ?? 0) + 1,
        },
        { onConflict: 'user_id,rival_id' }
      ),
      adminClient.from('rivalries').upsert(
        {
          user_id: loser_id,
          rival_id: winner_id,
          user_wins:         loserRow?.user_wins         ?? 0,
          rival_wins:       (loserRow?.rival_wins        ?? 0) + 1,
          total_challenges: (loserRow?.total_challenges  ?? 0) + 1,
        },
        { onConflict: 'user_id,rival_id' }
      ),
    ])

    return Response.json({ ok: true })
  } catch (err) {
    console.error('update-rivalry error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
