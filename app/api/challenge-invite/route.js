import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

function buildEmailHtml({ challenger_username, habit_name, duration_days, challengeUrl }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>You've been challenged on Streak!</title>
</head>
<body style="margin:0;padding:0;background-color:#030712;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#030712;padding:48px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:540px;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom:36px;">
              <span style="font-size:26px;font-weight:900;color:#f97316;letter-spacing:-0.01em;font-family:system-ui,sans-serif;">Streak 🔥</span>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background-color:#0f172a;border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:44px 40px;">

              <!-- Sword emoji -->
              <p style="text-align:center;font-size:60px;line-height:1;margin:0 0 24px 0;">⚔️</p>

              <!-- Headline -->
              <h1 style="color:#ffffff;font-size:22px;font-weight:800;text-align:center;margin:0 0 10px 0;letter-spacing:-0.02em;line-height:1.3;">
                @${challenger_username} challenged you!
              </h1>

              <!-- Habit -->
              <p style="color:#9ca3af;font-size:15px;text-align:center;margin:0 0 24px 0;line-height:1.5;">
                to complete <strong style="color:#f97316;font-weight:700;">${habit_name}</strong><br>every single day
              </p>

              <!-- Duration pill -->
              <p style="text-align:center;margin:0 0 24px 0;">
                <span style="display:inline-block;background-color:rgba(249,115,22,0.1);border:1px solid rgba(249,115,22,0.25);color:#f97316;font-size:14px;font-weight:700;padding:8px 20px;border-radius:100px;letter-spacing:0.02em;">
                  ${duration_days}-day challenge
                </span>
              </p>

              <!-- Divider -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px 0;">
                <tr><td style="height:1px;background-color:rgba(255,255,255,0.06);"></td></tr>
              </table>

              <!-- Tagline -->
              <p style="color:#6b7280;font-size:14px;text-align:center;margin:0 0 32px 0;line-height:1.7;">
                Check in every day — or they win.<br>
                <strong style="color:#9ca3af;">No excuses.</strong>
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center">
                    <a href="${challengeUrl}"
                       style="display:inline-block;background-color:#f97316;color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;padding:15px 40px;border-radius:12px;letter-spacing:0.01em;">
                      View Challenge →
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:28px;">
              <p style="color:#374151;font-size:12px;margin:0;line-height:1.8;">
                You received this because someone challenged you on Streak.<br>
                <a href="${challengeUrl}" style="color:#f97316;text-decoration:none;">View the challenge</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { opponent_email, opponent_username, challenger_username, habit_name, duration_days, challenge_id } = body

    if (!opponent_email || !challenge_id) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const origin = new URL(request.url).origin
    const challengeUrl = `${origin}/challenges/${challenge_id}`

    const { error } = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: opponent_email,
      subject: `@${challenger_username} challenged you on Streak! 🔥`,
      html: buildEmailHtml({ challenger_username, opponent_username, habit_name, duration_days, challengeUrl }),
    })

    if (error) {
      console.error('Resend error:', error)
      return Response.json({ error: 'Failed to send email' }, { status: 500 })
    }

    return Response.json({ ok: true })
  } catch (err) {
    console.error('challenge-invite route error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
