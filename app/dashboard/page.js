'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

function toDateStr(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return year + '-' + month + '-' + day
}

function calculateStreak(checkins, userId) {
  if (!checkins || checkins.length === 0) return 0
  const userCheckins = checkins.filter(c => c.user_id === userId)
  const today = new Date()
  const todayStr = toDateStr(today)
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = toDateStr(yesterday)
  const dates = new Set(userCheckins.map(c => c.checkin_date))
  if (!dates.has(todayStr) && !dates.has(yesterdayStr)) return 0
  const startStr = dates.has(todayStr) ? todayStr : yesterdayStr
  let streak = 0
  const current = new Date(startStr)
  while (dates.has(toDateStr(current))) {
    streak++
    current.setDate(current.getDate() - 1)
  }
  return streak
}

function calculatePersonalStreak(completions) {
  if (!completions || completions.length === 0) return 0
  const today = new Date()
  const todayStr = toDateStr(today)
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = toDateStr(yesterday)
  const dates = new Set(completions.map(c => c.completed_date))
  if (!dates.has(todayStr) && !dates.has(yesterdayStr)) return 0
  const startStr = dates.has(todayStr) ? todayStr : yesterdayStr
  let streak = 0
  const current = new Date(startStr)
  while (dates.has(toDateStr(current))) {
    streak++
    current.setDate(current.getDate() - 1)
  }
  return streak
}

export default function DashboardPage() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [challenges, setChallenges] = useState([])
  const [pendingChallenges, setPendingChallenges] = useState([])
  const [habits, setHabits] = useState([])
  const [personalCompletions, setPersonalCompletions] = useState({})
  const [checkingIn, setCheckingIn] = useState(new Set())
  const [togglingHabit, setTogglingHabit] = useState(new Set())
  const [habitToDelete, setHabitToDelete] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const todayStr = toDateStr(new Date())

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }
      setUser(user)

      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, username, email')
        .eq('id', user.id)
        .maybeSingle()
      setProfile(profileData)

      // Active challenges
      const { data: activeChallenges } = await supabase
        .from('habit_challenges')
        .select('*')
        .or(`challenger_id.eq.${user.id},opponent_id.eq.${user.id}`)
        .eq('status', 'active')

      if (activeChallenges && activeChallenges.length > 0) {
        const opponentIds = activeChallenges.map(c =>
          c.challenger_id === user.id ? c.opponent_id : c.challenger_id
        )
        const { data: opponentProfiles } = await supabase
          .from('profiles')
          .select('id, username, email')
          .in('id', opponentIds)
        const profileMap = {}
        for (const p of opponentProfiles ?? []) profileMap[p.id] = p

        const challengeIds = activeChallenges.map(c => c.id)
        const { data: allCheckins } = await supabase
          .from('challenge_checkins')
          .select('*')
          .in('challenge_id', challengeIds)

        const checkinsByChallenge = {}
        for (const id of challengeIds) checkinsByChallenge[id] = []
        for (const ci of allCheckins ?? []) {
          if (checkinsByChallenge[ci.challenge_id]) checkinsByChallenge[ci.challenge_id].push(ci)
        }

        setChallenges(activeChallenges.map(c => {
          const opponentId = c.challenger_id === user.id ? c.opponent_id : c.challenger_id
          return {
            ...c,
            opponentProfile: profileMap[opponentId] ?? null,
            checkins: checkinsByChallenge[c.id] ?? [],
          }
        }))
      }

      // Pending challenges (where user is opponent)
      const { data: pendingData } = await supabase
        .from('habit_challenges')
        .select('*')
        .eq('opponent_id', user.id)
        .eq('status', 'pending')

      if (pendingData && pendingData.length > 0) {
        const challengerIds = pendingData.map(c => c.challenger_id)
        const { data: challengerProfiles } = await supabase
          .from('profiles')
          .select('id, username, email')
          .in('id', challengerIds)
        const cProfileMap = {}
        for (const p of challengerProfiles ?? []) cProfileMap[p.id] = p
        setPendingChallenges(pendingData.map(c => ({
          ...c,
          challengerProfile: cProfileMap[c.challenger_id] ?? null,
        })))
      }

      // Personal habits
      const { data: habitsData } = await supabase
        .from('habits')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      setHabits(habitsData ?? [])

      if (habitsData && habitsData.length > 0) {
        const { data: completionsData } = await supabase
          .from('completions')
          .select('habit_id, completed_date')
          .eq('user_id', user.id)
          .in('habit_id', habitsData.map(h => h.id))
        const map = {}
        for (const h of habitsData) map[h.id] = []
        for (const c of completionsData ?? []) {
          if (map[c.habit_id]) map[c.habit_id].push(c)
        }
        setPersonalCompletions(map)
      }

      setLoading(false)
    }
    load()
  }, [router])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace('/login')
  }

  async function handleCheckIn(challenge) {
    if (checkingIn.has(challenge.id)) return
    setCheckingIn(prev => new Set(prev).add(challenge.id))
    const supabase = createClient()
    const { data: newCheckin } = await supabase
      .from('challenge_checkins')
      .insert({ challenge_id: challenge.id, user_id: user.id, checkin_date: todayStr })
      .select()
      .single()
    if (newCheckin) {
      setChallenges(prev => prev.map(c =>
        c.id === challenge.id ? { ...c, checkins: [...c.checkins, newCheckin] } : c
      ))
    }
    setCheckingIn(prev => { const n = new Set(prev); n.delete(challenge.id); return n })
  }

  async function handleAcceptChallenge(challenge) {
    const supabase = createClient()
    const today = new Date()
    const endDate = new Date(today)
    endDate.setDate(endDate.getDate() + challenge.duration_days)
    await supabase
      .from('habit_challenges')
      .update({ status: 'active', start_date: todayStr, end_date: toDateStr(endDate) })
      .eq('id', challenge.id)
    setPendingChallenges(prev => prev.filter(c => c.id !== challenge.id))
    const supabase2 = createClient()
    const { data: updated } = await supabase2
      .from('habit_challenges')
      .select('*')
      .eq('id', challenge.id)
      .single()
    if (updated) {
      const opponentId = updated.challenger_id === user.id ? updated.opponent_id : updated.challenger_id
      const { data: opponentProfiles } = await supabase2
        .from('profiles')
        .select('id, username, email')
        .eq('id', opponentId)
      const opponentProfile = opponentProfiles?.[0] ?? null
      setChallenges(prev => [...prev, { ...updated, opponentProfile, checkins: [] }])
    }
  }

  async function handleDeclineChallenge(challenge) {
    const supabase = createClient()
    await supabase
      .from('habit_challenges')
      .update({ status: 'declined' })
      .eq('id', challenge.id)
    setPendingChallenges(prev => prev.filter(c => c.id !== challenge.id))
  }

  async function toggleHabit(habit) {
    if (togglingHabit.has(habit.id)) return
    setTogglingHabit(prev => new Set(prev).add(habit.id))
    const supabase = createClient()
    const completions = personalCompletions[habit.id] ?? []
    const doneToday = completions.some(c => c.completed_date === todayStr)
    if (doneToday) {
      await supabase.from('completions').delete()
        .eq('habit_id', habit.id).eq('user_id', user.id).eq('completed_date', todayStr)
      setPersonalCompletions(prev => ({
        ...prev,
        [habit.id]: prev[habit.id].filter(c => c.completed_date !== todayStr),
      }))
    } else {
      await supabase.from('completions').insert({ habit_id: habit.id, user_id: user.id, completed_date: todayStr })
      setPersonalCompletions(prev => ({
        ...prev,
        [habit.id]: [...(prev[habit.id] ?? []), { habit_id: habit.id, completed_date: todayStr }],
      }))
    }
    setTogglingHabit(prev => { const n = new Set(prev); n.delete(habit.id); return n })
  }

  async function confirmDeleteHabit() {
    const habit = habitToDelete
    setHabitToDelete(null)
    const supabase = createClient()
    await supabase.from('habits').delete().eq('id', habit.id)
    setHabits(prev => prev.filter(h => h.id !== habit.id))
    setPersonalCompletions(prev => { const n = { ...prev }; delete n[habit.id]; return n })
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#030712', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🔥</div>
          <p style={{ color: '#6b7280', fontSize: 14 }}>Loading your dashboard…</p>
        </div>
      </div>
    )
  }

  const displayName = profile?.username ? `@${profile.username}` : (profile?.email ?? user?.email ?? '')

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#030712', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>

      {/* Navbar */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        backgroundColor: 'rgba(3,7,18,0.85)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 20px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 800, fontSize: 20, color: '#f97316', letterSpacing: '-0.01em' }}>Streak 🔥</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: 13, color: '#9ca3af' }}>{displayName}</span>
            <button
              onClick={handleSignOut}
              style={{ fontSize: 13, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', padding: '6px 12px', borderRadius: 8, transition: 'color 0.15s' }}
              onMouseEnter={e => e.target.style.color = '#fff'}
              onMouseLeave={e => e.target.style.color = '#6b7280'}
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 960, margin: '0 auto', padding: '32px 20px 120px' }}>

        {/* Welcome */}
        <div style={{ marginBottom: 40 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 4px', letterSpacing: '-0.02em' }}>
            Welcome back, {displayName} 🔥
          </h1>
          <p style={{ color: '#6b7280', fontSize: 14, margin: 0 }}>
            {challenges.length} active challenge{challenges.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* ── Active Challenges ── */}
        <section style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#f97316', marginBottom: 16 }}>
            Active Challenges
          </h2>

          {challenges.length === 0 ? (
            <EmptyCard>
              No active challenges yet.{' '}
              <Link href="/challenges/new" style={{ color: '#f97316', textDecoration: 'none', fontWeight: 600 }}>Start one →</Link>
            </EmptyCard>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {challenges.map(challenge => {
                const opponentId = challenge.challenger_id === user.id ? challenge.opponent_id : challenge.challenger_id
                const opponentName = challenge.opponentProfile?.username
                  ? `@${challenge.opponentProfile.username}`
                  : (challenge.opponentProfile?.email ?? 'Opponent')

                const checkins = challenge.checkins ?? []
                const myCheckins = checkins.filter(c => c.user_id === user.id)
                const opponentCheckins = checkins.filter(c => c.user_id === opponentId)
                const iCheckedIn = myCheckins.some(c => c.checkin_date === todayStr)
                const theyCheckedIn = opponentCheckins.some(c => c.checkin_date === todayStr)
                const myStreak = calculateStreak(checkins, user.id)
                const opponentStreak = calculateStreak(checkins, opponentId)
                const isCheckingIn = checkingIn.has(challenge.id)

                const start = challenge.start_date ? new Date(challenge.start_date) : new Date()
                const today = new Date()
                const dayX = Math.max(1, Math.floor((today - start) / 86400000) + 1)
                const dayTotal = challenge.duration_days ?? 30
                const pct = Math.min(100, Math.round((dayX / dayTotal) * 100))

                let statusMsg = '⏰ Check in before midnight!'
                if (iCheckedIn && !theyCheckedIn) statusMsg = `🏆 ${opponentName} missed today! You're winning`
                else if (!iCheckedIn && theyCheckedIn) statusMsg = `⚠️ Don't let ${opponentName} win! Check in now`
                else if (iCheckedIn && theyCheckedIn) statusMsg = '💪 Both on track! Keep going'

                return (
                  <div key={challenge.id} style={{
                    backgroundColor: '#0f172a',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: 20,
                    padding: '24px 28px',
                    transition: 'border-color 0.2s',
                  }}>
                    {/* Title row */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, gap: 12 }}>
                      <div>
                        <h3 style={{ fontWeight: 700, fontSize: 17, margin: '0 0 2px' }}>
                          {challenge.emoji ? `${challenge.emoji} ` : ''}{challenge.habit_name}
                        </h3>
                        <p style={{ color: '#6b7280', fontSize: 13, margin: 0 }}>vs {opponentName}</p>
                      </div>
                      <span style={{
                        fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                        color: '#f97316', backgroundColor: 'rgba(249,115,22,0.1)',
                        border: '1px solid rgba(249,115,22,0.2)',
                        padding: '4px 12px', borderRadius: 100, whiteSpace: 'nowrap', flexShrink: 0,
                      }}>Active</span>
                    </div>

                    {/* Progress */}
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6b7280', marginBottom: 6 }}>
                        <span>Day {dayX} of {dayTotal}</span>
                        <span style={{ color: '#f97316', fontWeight: 600 }}>{pct}%</span>
                      </div>
                      <div style={{ height: 6, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 100, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, backgroundColor: '#f97316', borderRadius: 100, boxShadow: '0 0 12px rgba(249,115,22,0.6)' }} />
                      </div>
                    </div>

                    {/* Participants */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                      {[
                        { label: displayName, userId: user.id, checkedIn: iCheckedIn, streak: myStreak, isYou: true },
                        { label: opponentName, userId: opponentId, checkedIn: theyCheckedIn, streak: opponentStreak, isYou: false },
                      ].map(({ label, checkedIn, streak, isYou }) => (
                        <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                              width: 24, height: 24, borderRadius: '50%',
                              backgroundColor: checkedIn ? '#16a34a' : 'rgba(255,255,255,0.08)',
                              border: checkedIn ? '2px solid #16a34a' : '2px solid rgba(255,255,255,0.12)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                            }}>
                              {checkedIn && <span style={{ fontSize: 12 }}>✓</span>}
                            </div>
                            <span style={{ fontSize: 14, fontWeight: isYou ? 600 : 400, color: isYou ? '#fff' : '#9ca3af' }}>{label}</span>
                          </div>
                          <span style={{ fontSize: 14, fontWeight: 700, color: '#f97316' }}>{streak} 🔥</span>
                        </div>
                      ))}
                    </div>

                    {/* Status + Button */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                      <p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>{statusMsg}</p>
                      {iCheckedIn ? (
                        <button disabled style={{
                          fontSize: 13, fontWeight: 700, padding: '9px 20px', borderRadius: 12,
                          backgroundColor: 'rgba(22,163,74,0.15)', border: '1px solid rgba(22,163,74,0.3)',
                          color: '#4ade80', cursor: 'default',
                        }}>
                          Checked In ✅
                        </button>
                      ) : (
                        <button
                          onClick={() => handleCheckIn(challenge)}
                          disabled={isCheckingIn}
                          style={{
                            fontSize: 13, fontWeight: 700, padding: '9px 20px', borderRadius: 12,
                            backgroundColor: isCheckingIn ? 'rgba(249,115,22,0.4)' : '#f97316',
                            border: 'none', color: '#fff', cursor: isCheckingIn ? 'default' : 'pointer',
                            boxShadow: '0 4px 16px rgba(249,115,22,0.35)', transition: 'background 0.15s',
                          }}
                        >
                          {isCheckingIn ? 'Checking in…' : 'Check In'}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* ── Pending Challenges ── */}
        {pendingChallenges.length > 0 && (
          <section style={{ marginBottom: 48 }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#f97316', marginBottom: 16 }}>
              Pending Challenges
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {pendingChallenges.map(challenge => {
                const challengerName = challenge.challengerProfile?.username
                  ? `@${challenge.challengerProfile.username}`
                  : (challenge.challengerProfile?.email ?? 'Someone')
                return (
                  <div key={challenge.id} style={{
                    backgroundColor: '#0f172a',
                    border: '1px solid rgba(249,115,22,0.15)',
                    borderRadius: 16,
                    padding: '20px 24px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
                  }}>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: 15, margin: '0 0 2px' }}>
                        {challengerName} challenged you to <span style={{ color: '#f97316' }}>{challenge.habit_name}</span>
                      </p>
                      <p style={{ color: '#6b7280', fontSize: 13, margin: 0 }}>{challenge.duration_days}-day challenge</p>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => handleDeclineChallenge(challenge)}
                        style={{
                          fontSize: 13, fontWeight: 600, padding: '8px 16px', borderRadius: 10,
                          backgroundColor: 'transparent', border: '1px solid rgba(255,255,255,0.12)',
                          color: '#9ca3af', cursor: 'pointer', transition: 'border-color 0.15s',
                        }}
                      >
                        Decline
                      </button>
                      <button
                        onClick={() => handleAcceptChallenge(challenge)}
                        style={{
                          fontSize: 13, fontWeight: 700, padding: '8px 20px', borderRadius: 10,
                          backgroundColor: '#f97316', border: 'none', color: '#fff', cursor: 'pointer',
                          boxShadow: '0 4px 14px rgba(249,115,22,0.35)', transition: 'background 0.15s',
                        }}
                      >
                        Accept
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ── Personal Habits ── */}
        <section>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#f97316', margin: 0 }}>
              Personal Habits
            </h2>
            <Link
              href="/habits/new"
              style={{
                fontSize: 13, fontWeight: 700, padding: '7px 16px', borderRadius: 10,
                backgroundColor: '#f97316', color: '#fff', textDecoration: 'none',
                boxShadow: '0 4px 14px rgba(249,115,22,0.3)',
              }}
            >
              + Add Habit
            </Link>
          </div>

          {habits.length === 0 ? (
            <EmptyCard>No personal habits yet. <Link href="/habits/new" style={{ color: '#f97316', textDecoration: 'none', fontWeight: 600 }}>Add one →</Link></EmptyCard>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {habits.map(habit => {
                const completions = personalCompletions[habit.id] ?? []
                const doneToday = completions.some(c => c.completed_date === todayStr)
                const streak = calculatePersonalStreak(completions)
                const isToggling = togglingHabit.has(habit.id)

                return (
                  <div
                    key={habit.id}
                    className="habit-row"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      backgroundColor: '#0f172a',
                      border: doneToday ? '1px solid rgba(22,163,74,0.3)' : '1px solid rgba(255,255,255,0.06)',
                      borderRadius: 14, padding: '14px 18px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <button
                        onClick={() => toggleHabit(habit)}
                        disabled={isToggling}
                        style={{
                          width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                          backgroundColor: doneToday ? '#16a34a' : 'transparent',
                          border: doneToday ? '2px solid #16a34a' : '2px solid rgba(255,255,255,0.2)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: isToggling ? 'default' : 'pointer', transition: 'all 0.15s', padding: 0,
                        }}
                      >
                        {doneToday && <span style={{ fontSize: 13, color: '#fff' }}>✓</span>}
                      </button>
                      <span style={{ fontSize: 15, fontWeight: 500, color: doneToday ? '#4ade80' : '#fff' }}>
                        {habit.name}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontWeight: 700, color: '#f97316', fontSize: 15 }}>{streak} 🔥</span>
                      <button
                        onClick={() => setHabitToDelete(habit)}
                        className="delete-btn"
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: '#ef4444', padding: '4px', borderRadius: 6, display: 'flex', opacity: 0, transition: 'opacity 0.15s',
                        }}
                      >
                        <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </main>

      {/* Floating New Challenge Button */}
      <Link
        href="/challenges/new"
        style={{
          position: 'fixed', bottom: 28, right: 28,
          display: 'flex', alignItems: 'center', gap: 8,
          backgroundColor: '#f97316', color: '#fff',
          fontWeight: 700, fontSize: 14, textDecoration: 'none',
          padding: '14px 22px', borderRadius: 50,
          boxShadow: '0 8px 28px rgba(249,115,22,0.45)',
          transition: 'transform 0.15s, box-shadow 0.15s',
          zIndex: 40,
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 36px rgba(249,115,22,0.55)' }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(249,115,22,0.45)' }}
      >
        ⚔️ New Challenge
      </Link>

      {/* Delete Habit Modal */}
      {habitToDelete && (
        <div
          onClick={() => setHabitToDelete(null)}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: 16 }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: 32, maxWidth: 360, width: '100%', textAlign: 'center' }}
          >
            <div style={{ width: 52, height: 52, borderRadius: '50%', backgroundColor: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#ef4444" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 style={{ fontWeight: 700, fontSize: 18, margin: '0 0 8px' }}>Delete Habit</h3>
            <p style={{ color: '#9ca3af', fontSize: 14, margin: '0 0 24px', lineHeight: 1.6 }}>
              Delete <span style={{ color: '#f97316', fontWeight: 600 }}>{habitToDelete.name}</span>? All streak data will be lost.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setHabitToDelete(null)}
                style={{ flex: 1, padding: '10px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'transparent', color: '#9ca3af', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteHabit}
                style={{ flex: 1, padding: '10px', borderRadius: 12, border: 'none', backgroundColor: '#dc2626', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .habit-row:hover .delete-btn { opacity: 1 !important; }
      `}</style>
    </div>
  )
}

function EmptyCard({ children }) {
  return (
    <div style={{
      backgroundColor: '#0f172a',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 16, padding: '32px 24px',
      textAlign: 'center', color: '#6b7280', fontSize: 14,
    }}>
      {children}
    </div>
  )
}
