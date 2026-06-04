import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

function toDateStr(date) {
  return (
    date.getFullYear() +
    '-' +
    String(date.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(date.getDate()).padStart(2, '0')
  )
}

function calculateStreak(completions) {
  if (!completions || completions.length === 0) return 0

  const today = new Date()
  const todayStr = toDateStr(today)
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = toDateStr(yesterday)

  const completedDates = new Set(completions.map((c) => c.completed_date))

  if (!completedDates.has(todayStr) && !completedDates.has(yesterdayStr)) return 0

  const startStr = completedDates.has(todayStr) ? todayStr : yesterdayStr
  const current = new Date(startStr)
  let streak = 0
  while (completedDates.has(toDateStr(current))) {
    streak++
    current.setDate(current.getDate() - 1)
  }
  return streak
}

export async function GET(request) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Find active partners (where this user is either side of the partnership)
  const { data: partnerships } = await supabase
    .from('partnerships')
    .select('user_id, partner_id')
    .or(`user_id.eq.${user.id},partner_id.eq.${user.id}`)
    .eq('status', 'active')

  if (!partnerships || partnerships.length === 0) {
    return NextResponse.json([])
  }

  const partnerIds = partnerships.map((p) =>
    p.user_id === user.id ? p.partner_id : p.user_id
  )

  // Get partner profiles
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email')
    .in('id', partnerIds)

  const profileMap = {}
  for (const p of profiles ?? []) profileMap[p.id] = p

  const todayStr = toDateStr(new Date())

  // Build partner data with habits and streaks
  const result = []
  for (const partnerId of partnerIds) {
    const profile = profileMap[partnerId]
    if (!profile) continue

    const { data: habits } = await supabase
      .from('habits')
      .select('id, name')
      .eq('user_id', partnerId)

    const habitList = habits ?? []
    let totalStreak = 0
    const habitData = []

    if (habitList.length > 0) {
      const { data: completions } = await supabase
        .from('completions')
        .select('habit_id, completed_date')
        .eq('user_id', partnerId)
        .in('habit_id', habitList.map((h) => h.id))

      const completionsByHabit = {}
      for (const h of habitList) completionsByHabit[h.id] = []
      for (const c of completions ?? []) {
        if (completionsByHabit[c.habit_id]) completionsByHabit[c.habit_id].push(c)
      }

      for (const habit of habitList) {
        const cs = completionsByHabit[habit.id]
        const streak = calculateStreak(cs)
        totalStreak += streak
        habitData.push({
          id: habit.id,
          name: habit.name,
          completedToday: cs.some((c) => c.completed_date === todayStr),
          streak,
        })
      }
    }

    result.push({
      id: partnerId,
      email: profile.email,
      totalStreak,
      habits: habitData,
    })
  }

  return NextResponse.json(result)
}
