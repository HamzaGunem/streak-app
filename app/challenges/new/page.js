'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { lookupUser } from '@/lib/utils'
import { sendNotifications } from '@/lib/notifications'
import { Navbar } from '@/components/Navbar'

const QUICK_PICKS = [
  { emoji: '🏃', label: 'Running' }, { emoji: '📚', label: 'Reading' }, { emoji: '💧', label: 'Water' },
  { emoji: '🏋️', label: 'Workout' }, { emoji: '🧘', label: 'Meditation' }, { emoji: '🚴', label: 'Cycling' },
  { emoji: '✍️', label: 'Journaling' }, { emoji: '😴', label: 'Sleep' },
]
const DURATIONS = [7, 14, 30, 60]
const STAKE_MAX = 100

const inputStyle = { width: '100%', boxSizing: 'border-box', backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '12px 16px', fontSize: 15, color: '#fff', outline: 'none', transition: 'border-color 0.15s' }
const labelStyle = { display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#f97316', marginBottom: 12 }

function NewChallengeForm() {
  const [user, setUser]                         = useState(null)
  const [challengerProfile, setChallengerProfile] = useState(null)
  const [habitName, setHabitName]               = useState('')
  const [duration, setDuration]                 = useState(30)
  const [opponent, setOpponent]                 = useState('')
  const [stake, setStake]                       = useState('')
  const [groupMode, setGroupMode]               = useState(false)
  const [extraOpponents, setExtraOpponents]     = useState([''])
  const [error, setError]                       = useState('')
  const [loading, setLoading]                   = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => { const pre = searchParams.get('opponent'); if (pre) setOpponent(pre) }, [searchParams])
  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }
      setUser(user)
      const { data: profile } = await supabase.from('profiles').select('id, username, email').eq('id', user.id).maybeSingle()
      setChallengerProfile(profile)
    }
    checkAuth()
  }, [router])

  async function handleSubmit(e) {
    e.preventDefault(); setError('')
    const trimmedHabit = habitName.trim(), trimmedOpponent = opponent.trim()
    if (!trimmedHabit) { setError('Please enter a habit name.'); return }
    if (!trimmedOpponent) { setError('Please enter an opponent email or username.'); return }
    setLoading(true)
    const supabase = createClient()
    const opponentProfile = await lookupUser(supabase, trimmedOpponent)
    if (!opponentProfile) { setError('No account found. They need to sign up first.'); setLoading(false); return }
    if (opponentProfile.id === user.id) { setError("You can't challenge yourself!"); setLoading(false); return }

    const activeExtras = groupMode ? extraOpponents.filter(v => v.trim() !== '') : []
    const extraProfiles = []
    for (const q of activeExtras) {
      const prof = await lookupUser(supabase, q)
      if (!prof) { setError(`No account found for "${q}".`); setLoading(false); return }
      if (prof.id === user.id) { setError("You can't add yourself."); setLoading(false); return }
      if (prof.id === opponentProfile.id || extraProfiles.some(p => p.id === prof.id)) { setError(`Duplicate: "${q}".`); setLoading(false); return }
      extraProfiles.push(prof)
    }

    const { data: newChallenge, error: insertError } = await supabase.from('habit_challenges').insert({ habit_name: trimmedHabit, challenger_id: user.id, opponent_id: opponentProfile.id, status: 'pending', duration_days: duration, stake: stake.trim() || null, max_participants: 2 + extraProfiles.length }).select().single()
    if (insertError) { setError('Something went wrong. Please try again.'); setLoading(false); return }

    if (extraProfiles.length > 0 && newChallenge) {
      await fetch('/api/group-invites', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ challenge_id: newChallenge.id, user_ids: extraProfiles.map(p => p.id) }) })
    }

    if (newChallenge) {
      const challengerName = challengerProfile?.username ?? user.email
      const allOpponents = [opponentProfile, ...extraProfiles]
      for (const opp of allOpponents) {
        fetch('/api/challenge-invite', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ opponent_email: opp.email, opponent_username: opp.username ?? '', challenger_username: challengerName, habit_name: trimmedHabit, duration_days: duration, challenge_id: newChallenge.id }) }).catch(console.error)
      }
      sendNotifications(allOpponents.map(opp => ({ user_id: opp.id, type: 'challenge_received', title: 'New challenge! ⚔️', message: `@${challengerName} challenged you to ${trimmedHabit} for ${duration} days!` })))
    }
    router.replace('/dashboard')
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#030712', color: '#fff', fontFamily: 'system-ui, sans-serif', display: 'flex', flexDirection: 'column' }}>
      <Navbar backHref="/dashboard" backLabel="← Back" />
      <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 20px 80px' }}>
        <div style={{ width: '100%', maxWidth: 480 }}>
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚔️</div>
            <h1 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.02em' }}>New Challenge</h1>
            <p style={{ color: '#6b7280', fontSize: 14, margin: 0 }}>Pick a habit, set the stakes, find an opponent.</p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {error && <div style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', fontSize: 13, padding: '12px 16px', borderRadius: 12 }}>{error}</div>}

            <div style={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: 24 }}>
              <label style={labelStyle}>Habit Name</label>
              <input type="text" value={habitName} onChange={e => setHabitName(e.target.value)} placeholder="e.g. Run 5km, Read 30 mins…" style={{ ...inputStyle, marginBottom: 16 }} onFocus={e => e.target.style.borderColor = '#f97316'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {QUICK_PICKS.map(pick => {
                  const sel = habitName === `${pick.emoji} ${pick.label}`
                  return <button key={pick.label} type="button" onClick={() => setHabitName(`${pick.emoji} ${pick.label}`)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 13px', borderRadius: 100, backgroundColor: sel ? 'rgba(249,115,22,0.15)' : 'rgba(255,255,255,0.04)', border: sel ? '1px solid rgba(249,115,22,0.6)' : '1px solid rgba(255,255,255,0.1)', color: sel ? '#f97316' : '#9ca3af', fontSize: 13, fontWeight: sel ? 600 : 400, cursor: 'pointer' }}><span>{pick.emoji}</span><span>{pick.label}</span></button>
                })}
              </div>
            </div>

            <div style={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: 24 }}>
              <label style={labelStyle}>Duration</label>
              <div style={{ display: 'flex', gap: 10 }}>
                {DURATIONS.map(d => {
                  const sel = duration === d
                  return <button key={d} type="button" onClick={() => setDuration(d)} style={{ flex: 1, padding: '12px 8px', borderRadius: 12, backgroundColor: sel ? '#f97316' : 'rgba(255,255,255,0.04)', border: sel ? '1px solid #f97316' : '1px solid rgba(255,255,255,0.1)', color: sel ? '#fff' : '#9ca3af', fontSize: 14, fontWeight: sel ? 700 : 400, cursor: 'pointer', boxShadow: sel ? '0 4px 14px rgba(249,115,22,0.35)' : 'none' }}>{d}d</button>
                })}
              </div>
            </div>

            <div style={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label style={{ ...labelStyle, marginBottom: 0 }}>Add a Stake? <span style={{ color: '#374151', fontWeight: 400 }}>(optional)</span></label>
                <span style={{ fontSize: 12, color: stake.length > STAKE_MAX * 0.8 ? '#f97316' : '#374151' }}>{stake.length}/{STAKE_MAX}</span>
              </div>
              <p style={{ color: '#4b5563', fontSize: 12, margin: '0 0 12px', lineHeight: 1.5 }}>What does the loser have to do? Keep it fun 😈</p>
              <input type="text" value={stake} onChange={e => { if (e.target.value.length <= STAKE_MAX) setStake(e.target.value) }} placeholder="e.g. Loser buys coffee ☕" style={inputStyle} onFocus={e => e.target.style.borderColor = '#f97316'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
            </div>

            <div style={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: 24 }}>
              <label style={labelStyle}>Challenge who?</label>
              <input type="text" value={opponent} onChange={e => setOpponent(e.target.value)} placeholder="Their email or @username" autoComplete="off" style={inputStyle} onFocus={e => e.target.style.borderColor = '#f97316'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
              <p style={{ margin: '8px 0 0', fontSize: 12, color: '#4b5563' }}>They&apos;ll get a notification to accept or decline.</p>
              <button type="button" onClick={() => setGroupMode(m => !m)} style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                <div style={{ width: 36, height: 20, borderRadius: 100, backgroundColor: groupMode ? '#f97316' : 'rgba(255,255,255,0.1)', position: 'relative', transition: 'background-color 0.2s', flexShrink: 0 }}>
                  <div style={{ position: 'absolute', top: 2, left: groupMode ? 18 : 2, width: 16, height: 16, borderRadius: '50%', backgroundColor: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.4)' }} />
                </div>
                <span style={{ fontSize: 13, color: groupMode ? '#f97316' : '#6b7280', fontWeight: groupMode ? 600 : 400 }}>Invite more people?</span>
              </button>
              {groupMode && (
                <div style={{ marginTop: 16 }}>
                  <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 12px' }}>Add up to 4 more opponents.</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {extraOpponents.map((val, i) => (
                      <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input type="text" value={val} onChange={e => setExtraOpponents(prev => prev.map((v, idx) => idx === i ? e.target.value : v))} placeholder={`Opponent ${i + 2} email or @username`} autoComplete="off" style={{ ...inputStyle, flex: 1 }} onFocus={e => e.target.style.borderColor = '#f97316'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
                        <button type="button" onClick={() => setExtraOpponents(prev => prev.filter((_, idx) => idx !== i))} style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                      </div>
                    ))}
                    {extraOpponents.length < 4 && <button type="button" onClick={() => setExtraOpponents(prev => [...prev, ''])} style={{ padding: 9, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.12)', color: '#6b7280', fontSize: 13, cursor: 'pointer' }}>+ Add another opponent</button>}
                  </div>
                </div>
              )}
            </div>

            <button type="submit" disabled={loading || !user} style={{ width: '100%', padding: 15, borderRadius: 14, backgroundColor: loading ? 'rgba(249,115,22,0.5)' : '#f97316', border: 'none', color: '#fff', fontWeight: 700, fontSize: 16, cursor: loading ? 'default' : 'pointer', boxShadow: loading ? 'none' : '0 6px 22px rgba(249,115,22,0.42)', transition: 'background 0.15s' }}>
              {loading ? 'Sending challenge…' : groupMode && extraOpponents.some(v => v.trim()) ? `⚔️ Send Group Challenge (${1 + extraOpponents.filter(v => v.trim()).length} opponents)` : '⚔️ Send Challenge'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function NewChallengePage() {
  return <Suspense><NewChallengeForm /></Suspense>
}
