import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'

export async function POST(request) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll() {},
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { email, partnership_id } = await request.json()
  const origin = new URL(request.url).origin
  const resend = new Resend(process.env.RESEND_API_KEY)

  const { error } = await resend.emails.send({
    from: 'onboarding@resend.dev',
    to: email,
    subject: 'You have been invited to be an accountability partner on Streak!',
    html: `
<div style="background:#111827;color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,sans-serif;padding:48px 40px;max-width:520px;margin:0 auto;border-radius:16px">
  <h1 style="color:#f97316;font-size:26px;font-weight:700;margin:0 0 4px 0">Streak</h1>
  <p style="color:#6b7280;font-size:12px;letter-spacing:.1em;text-transform:uppercase;margin:0 0 36px 0">Accountability Partner Invite</p>
  <p style="font-size:17px;font-weight:600;margin:0 0 8px 0">${user.email}</p>
  <p style="color:#d1d5db;font-size:15px;margin:0 0 8px 0">wants you to be their accountability partner on Streak.</p>
  <p style="color:#9ca3af;font-size:14px;margin:0 0 40px 0">Click the button below to accept or decline.</p>
  <a href="${origin}/partners/respond?id=${partnership_id}"
     style="display:inline-block;background:#f97316;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:700;font-size:15px">
    View Invite
  </a>
</div>`.trim(),
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
