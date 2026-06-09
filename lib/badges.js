// ─── Required SQL (run once in Supabase SQL editor) ───────────────────────────
//
// -- Part 1: betting
// alter table habit_challenges add column if not exists stake text;
//
// -- Part 2: rivals
// create table if not exists rivalries (
//   id uuid default gen_random_uuid() primary key,
//   user_id uuid references auth.users(id) on delete cascade,
//   rival_id uuid references auth.users(id) on delete cascade,
//   user_wins integer default 0,
//   rival_wins integer default 0,
//   total_challenges integer default 0,
//   unique(user_id, rival_id)
// );
//
// -- Part 3: badges
// alter table profiles add column if not exists badges text[] default '{}';
//
// -- Part 4: group challenges
// alter table habit_challenges add column if not exists max_participants integer default 2;
//
// create table if not exists challenge_participants (
//   id uuid default gen_random_uuid() primary key,
//   challenge_id uuid references habit_challenges(id) on delete cascade,
//   user_id uuid references auth.users(id) on delete cascade,
//   status text default 'pending',
//   joined_at timestamp with time zone default now(),
//   unique(challenge_id, user_id)
// );
// ──────────────────────────────────────────────────────────────────────────────

import { toDateStr } from '@/lib/utils'

export const BADGES = [
  { id: 'first_win',  emoji: '🏆', name: 'First Blood',   desc: 'Win your first challenge'                    },
  { id: 'on_fire',    emoji: '🔥', name: 'On Fire',        desc: 'Get a 7-day streak in a challenge'           },
  { id: 'ruthless',   emoji: '💀', name: 'Ruthless',       desc: 'Win 5 challenges'                            },
  { id: 'undefeated', emoji: '👑', name: 'Undefeated',     desc: 'Win 10 challenges with 0 losses'             },
  { id: 'early_bird', emoji: '🌅', name: 'Early Bird',     desc: 'Check in before 7am 5 times'                 },
  { id: 'comeback',   emoji: '⚡', name: 'Comeback Kid',   desc: 'Win a challenge after being behind'          },
  { id: 'consistent', emoji: '💎', name: 'Consistent',     desc: 'Complete a 30-day challenge'                 },
  { id: 'social',     emoji: '🤝', name: 'Social',         desc: 'Complete challenges with 3 different people' },
]

function calcStreak(checkinDates) {
  if (!checkinDates || checkinDates.length === 0) return 0
  const today = new Date()
  const todayStr = toDateStr(today)
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = toDateStr(yesterday)
  const dates = new Set(checkinDates)
  if (!dates.has(todayStr) && !dates.has(yesterdayStr)) return 0
  const startStr = dates.has(todayStr) ? todayStr : yesterdayStr
  let streak = 0
  const cur = new Date(startStr)
  while (dates.has(toDateStr(cur))) {
    streak++
    cur.setDate(cur.getDate() - 1)
  }
  return streak
}

export async function checkAndAwardBadges(userId, supabase) {
  const { data: challenges } = await supabase
    .from('habit_challenges')
    .select('id, status, winner_id, duration_days, challenger_id, opponent_id')
    .or(`challenger_id.eq.${userId},opponent_id.eq.${userId}`)

  const all       = challenges ?? []
  const completed = all.filter(c => c.status === 'completed')
  const wins      = completed.filter(c => c.winner_id === userId)
  const losses    = completed.filter(c => c.winner_id !== null && c.winner_id !== userId)

  const challengeIds = all.map(c => c.id)
  let myCheckins = []
  if (challengeIds.length > 0) {
    const { data } = await supabase
      .from('challenge_checkins')
      .select('challenge_id, checkin_date, created_at')
      .eq('user_id', userId)
      .in('challenge_id', challengeIds)
    myCheckins = data ?? []
  }

  // Group checkins by challenge for streak calculation
  const byChallenge = {}
  for (const c of myCheckins) {
    if (!byChallenge[c.challenge_id]) byChallenge[c.challenge_id] = []
    byChallenge[c.challenge_id].push(c.checkin_date)
  }

  let maxStreak = 0
  for (const cId of Object.keys(byChallenge)) {
    const s = calcStreak(byChallenge[cId])
    if (s > maxStreak) maxStreak = s
  }

  // Early bird: checkins where local hour of created_at < 7
  const earlyCount = myCheckins.filter(c => c.created_at && new Date(c.created_at).getHours() < 7).length

  // Unique opponents in completed challenges
  const uniqueOpponents = new Set(
    completed.map(c => c.challenger_id === userId ? c.opponent_id : c.challenger_id)
  )

  // Comeback: simplified as winning a challenge of duration >= 14 days
  const hasComeback = wins.some(c => c.duration_days >= 14)

  const earned = new Set()
  if (wins.length >= 1)                           earned.add('first_win')
  if (maxStreak >= 7)                             earned.add('on_fire')
  if (wins.length >= 5)                           earned.add('ruthless')
  if (wins.length >= 10 && losses.length === 0)   earned.add('undefeated')
  if (earlyCount >= 5)                            earned.add('early_bird')
  if (hasComeback)                                earned.add('comeback')
  if (completed.some(c => c.duration_days >= 30)) earned.add('consistent')
  if (uniqueOpponents.size >= 3)                  earned.add('social')

  const { data: profile } = await supabase
    .from('profiles').select('badges').eq('id', userId).maybeSingle()

  const currentBadges = new Set(profile?.badges ?? [])
  const newlyEarned   = [...earned].filter(b => !currentBadges.has(b))

  if (newlyEarned.length > 0) {
    await supabase
      .from('profiles')
      .update({ badges: [...new Set([...currentBadges, ...earned])] })
      .eq('id', userId)
  }

  return newlyEarned
}
