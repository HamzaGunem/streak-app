'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { toDateStr, calculatePersonalStreak } from '@/lib/utils'
import { loadNotifSettings, sendNotifications, TYPE_CATEGORY } from '@/lib/notifications'
import { Navbar } from '@/components/Navbar'
import { PageLoader } from '@/components/PageLoader'
import { EmptyCard } from '@/components/EmptyCard'
import { Modal } from '@/components/Modal'
import { ChallengeCard } from '@/components/dashboard/ChallengeCard'
import { PendingChallengeCard } from '@/components/dashboard/PendingChallengeCard'

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
  const [unreadCount, setUnreadCount] = useState(0)
  const router = useRouter()
  const todayStr = toDateStr(new Date())

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }
      setUser(user)

      const { data: profileData } = await supabase.from('profiles').select('id, username, email, avatar').eq('id', user.id).maybeSingle()
      setProfile(profileData)

      const [{ data: directActive }, { data: pendingAsOpp }, groupInvitesRes] = await Promise.all([
        supabase.from('habit_challenges').select('*').or(`challenger_id.eq.${user.id},opponent_id.eq.${user.id}`).eq('status', 'active'),
        supabase.from('habit_challenges').select('*').eq('opponent_id', user.id).eq('status', 'pending'),
        fetch(`/api/group-invites?user_id=${user.id}`).then(r => r.json()).catch(() => ({ pending: [], active: [] })),
      ])

      const { pending: pendingAsGroup, active: groupActive } = groupInvitesRes
      const directActiveIds = new Set((directActive ?? []).map(c => c.id))
      const activeChallenges = [...(directActive ?? []), ...(groupActive ?? []).filter(c => !directActiveIds.has(c.id))]

      if (activeChallenges.length > 0) {
        const challengeIds = activeChallenges.map(c => c.id)
        const opponentIds = activeChallenges.map(c => c.challenger_id === user.id ? c.opponent_id : c.challenger_id)
        const [{ data: opponentProfiles }, { data: allCheckins }, { data: allParticipants }] = await Promise.all([
          supabase.from('profiles').select('id, username, email').in('id', opponentIds),
          supabase.from('challenge_checkins').select('*').in('challenge_id', challengeIds),
          supabase.from('challenge_participants').select('challenge_id, user_id, status').in('challenge_id', challengeIds),
        ])
        const profileMap = {}
        for (const p of opponentProfiles ?? []) profileMap[p.id] = p
        const extraIds = new Set()
        for (const c of activeChallenges) {
          if ((c.max_participants ?? 2) > 2) {
            if (!profileMap[c.challenger_id] && c.challenger_id !== user.id) extraIds.add(c.challenger_id)
            if (c.opponent_id && !profileMap[c.opponent_id] && c.opponent_id !== user.id) extraIds.add(c.opponent_id)
          }
        }
        for (const p of allParticipants ?? []) { if (!profileMap[p.user_id] && p.user_id !== user.id) extraIds.add(p.user_id) }
        if (extraIds.size > 0) {
          const { data: extraProfiles } = await supabase.from('profiles').select('id, username, email').in('id', [...extraIds])
          for (const p of extraProfiles ?? []) profileMap[p.id] = p
        }
        const checkinsByChallenge = {}, participantsByChallenge = {}
        for (const id of challengeIds) { checkinsByChallenge[id] = []; participantsByChallenge[id] = [] }
        for (const ci of allCheckins ?? []) { if (checkinsByChallenge[ci.challenge_id]) checkinsByChallenge[ci.challenge_id].push(ci) }
        for (const p of allParticipants ?? []) { if (participantsByChallenge[p.challenge_id]) participantsByChallenge[p.challenge_id].push(p) }
        setChallenges(activeChallenges.map(c => {
          const opponentId = c.challenger_id === user.id ? c.opponent_id : c.challenger_id
          return { ...c, opponentProfile: profileMap[opponentId] ?? null, mainOpponentProfile: profileMap[c.opponent_id] ?? null, challengerProfile: profileMap[c.challenger_id] ?? null, checkins: checkinsByChallenge[c.id] ?? [], groupParticipants: (participantsByChallenge[c.id] ?? []).map(p => ({ ...p, profile: profileMap[p.user_id] ?? null })) }
        }))
      }

      const allPending = [...(pendingAsOpp ?? []).map(c => ({ ...c, isGroupParticipant: false })), ...pendingAsGroup]
      if (allPending.length > 0) {
        const challengerIds = allPending.map(c => c.challenger_id)
        const { data: challengerProfiles } = await supabase.from('profiles').select('id, username, email').in('id', challengerIds)
        const cMap = {}
        for (const p of challengerProfiles ?? []) cMap[p.id] = p
        setPendingChallenges(allPending.map(c => ({ ...c, challengerProfile: cMap[c.challenger_id] ?? null })))
      }

      const { data: habitsData } = await supabase.from('habits').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
      setHabits(habitsData ?? [])
      if (habitsData?.length > 0) {
        const { data: completionsData } = await supabase.from('personal_completions').select('habit_id, completed_date').eq('user_id', user.id).in('habit_id', habitsData.map(h => h.id))
        const map = {}
        for (const h of habitsData) map[h.id] = []
        for (const c of completionsData ?? []) { if (map[c.habit_id]) map[c.habit_id].push(c) }
        setPersonalCompletions(map)
      }

      setLoading(false)

      const notifSettings = loadNotifSettings(user.id)
      const enabledTypes = Object.entries(TYPE_CATEGORY).filter(([, cat]) => notifSettings[cat]).map(([type]) => type)
      let countQuery = supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('read', false)
      if (enabledTypes.length < Object.keys(TYPE_CATEGORY).length) countQuery = countQuery.in('type', enabledTypes)
      countQuery.then(({ count }) => setUnreadCount(count ?? 0)).catch(() => {})
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
    const { data: newCheckin } = await supabase.from('challenge_checkins').insert({ challenge_id: challenge.id, user_id: user.id, checkin_date: todayStr }).select().single()
    if (newCheckin) {
      setChallenges(prev => prev.map(c => c.id === challenge.id ? { ...c, checkins: [...c.checkins, newCheckin] } : c))
      const settings = loadNotifSettings(user.id)
      if (settings.notify_checkin) sendNotifications([{ user_id: user.id, type: 'checkin_done', title: 'Checked in! 🔥', message: `You checked in for ${challenge.habit_name}. Keep the streak alive!` }])
    }
    setCheckingIn(prev => { const n = new Set(prev); n.delete(challenge.id); return n })
  }

  async function handleAcceptChallenge(challenge) {
    const supabase = createClient()
    const myUsername = profile?.username ?? user.email
    if (challenge.isGroupParticipant) {
      await fetch('/api/group-invites', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ challenge_id: challenge.id, user_id: user.id, status: 'accepted' }) })
      sendNotifications([{ user_id: challenge.challenger_id, type: 'challenge_accepted', title: 'Challenge accepted! ✅', message: `@${myUsername} accepted your ${challenge.habit_name} challenge.` }])
      setPendingChallenges(prev => prev.filter(c => c.id !== challenge.id))
      router.push(`/challenges/${challenge.id}`)
      return
    }
    const endDate = new Date(); endDate.setDate(endDate.getDate() + challenge.duration_days)
    await supabase.from('habit_challenges').update({ status: 'active', start_date: todayStr, end_date: toDateStr(endDate) }).eq('id', challenge.id)
    sendNotifications([{ user_id: challenge.challenger_id, type: 'challenge_accepted', title: 'Challenge accepted! ✅', message: `@${myUsername} accepted your ${challenge.habit_name} challenge. It starts today!` }])
    setPendingChallenges(prev => prev.filter(c => c.id !== challenge.id))
    const { data: updated } = await supabase.from('habit_challenges').select('*').eq('id', challenge.id).single()
    if (updated) {
      const opponentId = updated.challenger_id === user.id ? updated.opponent_id : updated.challenger_id
      const { data: ops } = await supabase.from('profiles').select('id, username, email').eq('id', opponentId)
      const opponentProfile = ops?.[0] ?? null
      setChallenges(prev => [...prev, { ...updated, opponentProfile, mainOpponentProfile: opponentProfile, challengerProfile: null, checkins: [], groupParticipants: [] }])
    }
  }

  async function handleDeclineChallenge(challenge) {
    const supabase = createClient()
    const myUsername = profile?.username ?? user.email
    if (challenge.isGroupParticipant) {
      await fetch('/api/group-invites', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ challenge_id: challenge.id, user_id: user.id, status: 'declined' }) })
    } else {
      await supabase.from('habit_challenges').update({ status: 'declined' }).eq('id', challenge.id)
    }
    sendNotifications([{ user_id: challenge.challenger_id, type: 'challenge_declined', title: 'Challenge declined ❌', message: `@${myUsername} declined your ${challenge.habit_name} challenge.` }])
    setPendingChallenges(prev => prev.filter(c => c.id !== challenge.id))
  }

  async function toggleHabit(habit) {
    if (togglingHabit.has(habit.id)) return
    setTogglingHabit(prev => new Set(prev).add(habit.id))
    const supabase = createClient()
    const completions = personalCompletions[habit.id] ?? []
    const doneToday = completions.some(c => c.completed_date === todayStr)
    if (doneToday) {
      await supabase.from('personal_completions').delete().eq('habit_id', habit.id).eq('user_id', user.id).eq('completed_date', todayStr)
      setPersonalCompletions(prev => ({ ...prev, [habit.id]: prev[habit.id].filter(c => c.completed_date !== todayStr) }))
    } else {
      await supabase.from('personal_completions').insert({ habit_id: habit.id, user_id: user.id, completed_date: todayStr })
      setPersonalCompletions(prev => ({ ...prev, [habit.id]: [...(prev[habit.id] ?? []), { habit_id: habit.id, completed_date: todayStr }] }))
    }
    setTogglingHabit(prev => { const n = new Set(prev); n.delete(habit.id); return n })
  }

  async function confirmDeleteHabit() {
    const habit = habitToDelete; setHabitToDelete(null)
    const supabase = createClient()
    await supabase.from('habits').delete().eq('id', habit.id)
    setHabits(prev => prev.filter(h => h.id !== habit.id))
    setPersonalCompletions(prev => { const n = { ...prev }; delete n[habit.id]; return n })
  }

  if (loading) return <PageLoader text="Loading your dashboard…" />

  const displayName = profile?.username ?? (user?.email ?? '')

  const navRight = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <Link href="/leaderboard" style={{ fontSize: 13, color: '#6b7280', textDecoration: 'none', padding: '6px 10px', borderRadius: 8 }} title="Leaderboard">🏆</Link>
      <Link href="/notifications" style={{ position: 'relative', fontSize: 18, textDecoration: 'none', padding: '6px 8px', borderRadius: 8, lineHeight: 1, display: 'flex', alignItems: 'center' }} title="Notifications">
        🔔
        {unreadCount > 0 && <span style={{ position: 'absolute', top: 2, right: 2, width: 8, height: 8, borderRadius: '50%', backgroundColor: '#f97316', border: '1.5px solid #030712' }} />}
      </Link>
      <Link href="/profile" style={{ display: 'flex', alignItems: 'center', gap: 7, textDecoration: 'none', padding: '5px 10px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.03)' }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(249,115,22,0.35)'; e.currentTarget.style.backgroundColor = 'rgba(249,115,22,0.07)' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)' }}
      >
        <span style={{ fontSize: 16 }}>{profile?.avatar || '🔥'}</span>
        <span style={{ fontSize: 13, color: '#9ca3af', fontWeight: 500 }}>{displayName}</span>
      </Link>
      <button onClick={handleSignOut} style={{ fontSize: 13, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', padding: '6px 12px', borderRadius: 8 }}
        onMouseEnter={e => e.target.style.color = '#fff'} onMouseLeave={e => e.target.style.color = '#6b7280'}>Sign out</button>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#030712', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
      <Navbar maxWidth={960} right={navRight} />

      <main style={{ maxWidth: 960, margin: '0 auto', padding: '32px 20px 120px' }}>
        <div style={{ marginBottom: 40 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 4px', letterSpacing: '-0.02em' }}>Welcome back, {displayName} 🔥</h1>
          <p style={{ color: '#6b7280', fontSize: 14, margin: 0 }}>{challenges.length} active challenge{challenges.length !== 1 ? 's' : ''}</p>
        </div>

        <section style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#f97316', marginBottom: 16 }}>Active Challenges</h2>
          {challenges.length === 0 ? (
            <EmptyCard>No active challenges yet. <Link href="/challenges/new" style={{ color: '#f97316', textDecoration: 'none', fontWeight: 600 }}>Start one →</Link></EmptyCard>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {challenges.map(challenge => <ChallengeCard key={challenge.id} challenge={challenge} user={user} profile={profile} todayStr={todayStr} checkingIn={checkingIn} onCheckIn={handleCheckIn} />)}
            </div>
          )}
        </section>

        {pendingChallenges.length > 0 && (
          <section style={{ marginBottom: 48 }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#f97316', marginBottom: 16 }}>Pending Challenges</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {pendingChallenges.map(c => <PendingChallengeCard key={c.id} challenge={c} onAccept={handleAcceptChallenge} onDecline={handleDeclineChallenge} />)}
            </div>
          </section>
        )}

        <section>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#f97316', margin: 0 }}>Personal Habits</h2>
            <Link href="/habits/new" style={{ fontSize: 13, fontWeight: 700, padding: '7px 16px', borderRadius: 10, backgroundColor: '#f97316', color: '#fff', textDecoration: 'none', boxShadow: '0 4px 14px rgba(249,115,22,0.3)' }}>+ Add Habit</Link>
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
                  <div key={habit.id} className="habit-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#0f172a', border: doneToday ? '1px solid rgba(22,163,74,0.3)' : '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '14px 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <button onClick={() => toggleHabit(habit)} disabled={isToggling} style={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0, backgroundColor: doneToday ? '#16a34a' : 'transparent', border: doneToday ? '2px solid #16a34a' : '2px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: isToggling ? 'default' : 'pointer', transition: 'all 0.15s', padding: 0 }}>
                        {doneToday && <span style={{ fontSize: 13, color: '#fff' }}>✓</span>}
                      </button>
                      <span style={{ fontSize: 15, fontWeight: 500, color: doneToday ? '#4ade80' : '#fff' }}>{habit.name}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontWeight: 700, color: '#f97316', fontSize: 15 }}>{streak} 🔥</span>
                      <button onClick={() => setHabitToDelete(habit)} className="delete-btn" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 4, borderRadius: 6, display: 'flex', opacity: 0, transition: 'opacity 0.15s' }}>
                        <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </main>

      <Link href="/challenges/new" style={{ position: 'fixed', bottom: 28, right: 28, display: 'flex', alignItems: 'center', gap: 8, backgroundColor: '#f97316', color: '#fff', fontWeight: 700, fontSize: 14, textDecoration: 'none', padding: '14px 22px', borderRadius: 50, boxShadow: '0 8px 28px rgba(249,115,22,0.45)', zIndex: 40 }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 36px rgba(249,115,22,0.55)' }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(249,115,22,0.45)' }}>
        ⚔️ New Challenge
      </Link>

      {habitToDelete && (
        <Modal onClose={() => setHabitToDelete(null)}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', backgroundColor: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#ef4444" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </div>
          <h3 style={{ fontWeight: 700, fontSize: 18, margin: '0 0 8px' }}>Delete Habit</h3>
          <p style={{ color: '#9ca3af', fontSize: 14, margin: '0 0 24px', lineHeight: 1.6 }}>Delete <span style={{ color: '#f97316', fontWeight: 600 }}>{habitToDelete.name}</span>? All streak data will be lost.</p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setHabitToDelete(null)} style={{ flex: 1, padding: 10, borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'transparent', color: '#9ca3af', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>Cancel</button>
            <button onClick={confirmDeleteHabit} style={{ flex: 1, padding: 10, borderRadius: 12, border: 'none', backgroundColor: '#dc2626', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>Delete</button>
          </div>
        </Modal>
      )}

      <style>{`.habit-row:hover .delete-btn { opacity: 1 !important; }`}</style>
    </div>
  )
}
