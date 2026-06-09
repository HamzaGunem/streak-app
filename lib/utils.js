export function toDateStr(date) {
  return date.getFullYear() + '-' +
    String(date.getMonth() + 1).padStart(2, '0') + '-' +
    String(date.getDate()).padStart(2, '0')
}

export function calculateStreak(checkins, userId) {
  if (!checkins || checkins.length === 0) return 0
  const userCheckins = checkins.filter(c => c.user_id === userId)
  if (userCheckins.length === 0) return 0
  const todayStr = toDateStr(new Date())
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = toDateStr(yesterday)
  const dates = new Set(userCheckins.map(c => c.checkin_date))
  if (!dates.has(todayStr) && !dates.has(yesterdayStr)) return 0
  const startStr = dates.has(todayStr) ? todayStr : yesterdayStr
  let streak = 0
  const cur = new Date(startStr)
  while (dates.has(toDateStr(cur))) { streak++; cur.setDate(cur.getDate() - 1) }
  return streak
}

export function calculatePersonalStreak(completions) {
  if (!completions || completions.length === 0) return 0
  const todayStr = toDateStr(new Date())
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = toDateStr(yesterday)
  const dates = new Set(completions.map(c => c.completed_date))
  if (!dates.has(todayStr) && !dates.has(yesterdayStr)) return 0
  const startStr = dates.has(todayStr) ? todayStr : yesterdayStr
  let streak = 0
  const cur = new Date(startStr)
  while (dates.has(toDateStr(cur))) { streak++; cur.setDate(cur.getDate() - 1) }
  return streak
}

export function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000)
  if (diff < 60) return 'Just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 172800) return 'Yesterday'
  return new Date(dateStr).toLocaleDateString()
}

export async function lookupUser(supabase, query) {
  const q = query.trim()
  if (!q) return null
  const { data: byEmail } = await supabase.from('profiles').select('id, email, username').eq('email', q).maybeSingle()
  if (byEmail) return byEmail
  const uname = q.startsWith('@') ? q.slice(1) : q
  const { data: byUser } = await supabase.from('profiles').select('id, email, username').eq('username', uname).maybeSingle()
  return byUser ?? null
}

export const CHALLENGE_STATUS_MAP = {
  active:    { bg: 'rgba(249,115,22,0.1)',  border: 'rgba(249,115,22,0.25)',  text: '#f97316', label: 'Active'    },
  pending:   { bg: 'rgba(234,179,8,0.1)',   border: 'rgba(234,179,8,0.25)',   text: '#eab308', label: 'Pending'   },
  completed: { bg: 'rgba(22,163,74,0.1)',   border: 'rgba(22,163,74,0.3)',    text: '#4ade80', label: 'Completed' },
  declined:  { bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.25)',   text: '#ef4444', label: 'Declined'  },
  cancelled: { bg: 'rgba(107,114,128,0.1)', border: 'rgba(107,114,128,0.25)', text: '#6b7280', label: 'Cancelled' },
}
