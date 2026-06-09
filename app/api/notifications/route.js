import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { notifications } = await request.json()
  if (!Array.isArray(notifications) || notifications.length === 0) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const rows = notifications.map(n => ({
    user_id: n.user_id,
    type: n.type,
    title: n.title,
    message: n.message ?? '',
    read: false,
  }))

  const { error } = await supabase.from('notifications').insert(rows)
  if (error) {
    console.error('[notifications]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
