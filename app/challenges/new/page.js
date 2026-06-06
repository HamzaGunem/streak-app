'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

const QUICK_PICKS = [
  { emoji: '🏃', label: 'Running' },
  { emoji: '📚', label: 'Reading' },
  { emoji: '💧', label: 'Water' },
  { emoji: '🏋️', label: 'Workout' },
  { emoji: '🧘', label: 'Meditation' },
  { emoji: '🚴', label: 'Cycling' },
  { emoji: '✍️', label: 'Journaling' },
  { emoji: '😴', label: 'Sleep' },
]

const DURATIONS = [7, 14, 30, 60]
const STAKE_MAX = 100

const inputStyle = {
  width: '100%', boxSizing: 'border-box',
  backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 12, padding: '12px 16px',
  fontSize: 15, color: '#fff', outline: 'none',
  transition: 'border-color 0.15s',
}
const labelStyle = {
  display: 'block', fontSize: 11, fontWeight: 700,
  letterSpacing: '0.1em', textTransform: 'uppercase',
  color: '#f97316', marginBottom: 12,
}

async function lookupOpponent(supabase, query) {
  const q = query.trim()
  if (!q) return null
  const { data: byEmail } = await supabase
    .from('profiles').select('id, email, username').eq('email', q).maybeSingle()
  if (byEmail) return byEmail
  const uname = q.startsWith('@') ? q.slice(1) : q
  const { data: byUser } = await supabase
    .from('profiles').select('id, email, username').eq('username', uname).maybeSingle()
  return byUser ?? null
}

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
  const router      = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const pre = searchParams.get('opponent')
    if (pre) setOpponent(pre)
  }, [searchParams])

  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }
      setUser(user)
      const { data: profile } = await supabase
        .from('profiles').select('id, username, email').eq('id', user.id).maybeSingle()
      setChallengerProfile(profile)
    }
    checkAuth()
  }, [router])

  function addExtra() {
    if (extraOpponents.length < 4) setExtraOpponents(prev => [...prev, ''])
  }

  function removeExtra(i) {
    setExtraOpponents(prev => prev.filter((_, idx) => idx !== i))
  }

  function updateExtra(i, val) {
    setExtraOpponents(prev => prev.map((v, idx) => idx === i ? val : v))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    const trimmedHabit    = habitName.trim()
    const trimmedOpponent = opponent.trim()

    if (!trimmedHabit)    { setError('Please enter a habit name.'); return }
    if (!trimmedOpponent) { setError('Please enter an opponent email or username.'); return }

    setLoading(true)
    const supabase = createClient()

    // Look up primary opponent
    const opponentProfile = await lookupOpponent(supabase, trimmedOpponent)
    if (!opponentProfile) {
      setError('No account found. They need to sign up first.')
      setLoading(false)
      return
    }
    if (opponentProfile.id === user.id) {
      setError("You can't challenge yourself!")
      setLoading(false)
      return
    }

    // Look up extra opponents (group mode)
    const activeExtras = groupMode ? extraOpponents.filter(v => v.trim() !== '') : []
    const extraProfiles = []
    for (const q of activeExtras) {
      const prof = await lookupOpponent(supabase, q)
      if (!prof) {
        setError(`No account found for "${q}". They need to sign up first.`)
        setLoading(false)
        return
      }
      if (prof.id === user.id) {
        setError("You can't add yourself as an opponent.")
        setLoading(false)
        return
      }
      if (prof.id === opponentProfile.id || extraProfiles.some(p => p.id === prof.id)) {
        setError(`Duplicate opponent: "${q}".`)
        setLoading(false)
        return
      }
      extraProfiles.push(prof)
    }

    // Create the challenge
    const { data: newChallenge, error: insertError } = await supabase
      .from('habit_challenges')
      .insert({
        habit_name:       trimmedHabit,
        challenger_id:    user.id,
        opponent_id:      opponentProfile.id,
        status:           'pending',
        duration_days:    duration,
        stake:            stake.trim() || null,
        max_participants: 2 + extraProfiles.length,
      })
      .select()
      .single()

    if (insertError) {
      setError('Something went wrong. Please try again.')
      setLoading(false)
      return
    }

    // Add extra participants via server route (bypasses RLS)
    if (extraProfiles.length > 0 && newChallenge) {
      await fetch('/api/group-invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challenge_id: newChallenge.id,
          user_ids: extraProfiles.map(p => p.id),
        }),
      })
    }

    // Send invite emails (fire-and-forget — never blocks redirect)
    if (newChallenge) {
      const challengerName = challengerProfile?.username ?? user.email
      for (const opp of [opponentProfile, ...extraProfiles]) {
        fetch('/api/challenge-invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            opponent_email:     opp.email,
            opponent_username:  opp.username ?? '',
            challenger_username: challengerName,
            habit_name:         trimmedHabit,
            duration_days:      duration,
            challenge_id:       newChallenge.id,
          }),
        }).catch(err => console.error('Email invite failed:', err))
      }
    }

    router.replace('/dashboard')
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#030712', color: '#fff', fontFamily: 'system-ui, sans-serif', display: 'flex', flexDirection: 'column' }}>

      {/* Navbar */}
      <header style={{
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        backgroundColor: 'rgba(3,7,18,0.85)',
        backdropFilter: 'blur(16px)',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 20px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/dashboard" style={{ fontWeight: 800, fontSize: 20, color: '#f97316', textDecoration: 'none', letterSpacing: '-0.01em' }}>
            Streak 🔥
          </Link>
          <Link href="/dashboard" style={{ fontSize: 13, color: '#6b7280', textDecoration: 'none' }}>
            ← Back
          </Link>
        </div>
      </header>

      <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 20px 80px' }}>
        <div style={{ width: '100%', maxWidth: 480 }}>

          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚔️</div>
            <h1 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.02em' }}>New Challenge</h1>
            <p style={{ color: '#6b7280', fontSize: 14, margin: 0 }}>Pick a habit, set the stakes, find an opponent.</p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {error && (
              <div style={{
                backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                color: '#fca5a5', fontSize: 13, padding: '12px 16px', borderRadius: 12,
              }}>
                {error}
              </div>
            )}

            {/* ── Habit Name ── */}
            <div style={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: 24 }}>
              <label style={labelStyle}>Habit Name</label>
              <input
                type="text"
                value={habitName}
                onChange={e => setHabitName(e.target.value)}
                placeholder="e.g. Run 5km, Read 30 mins…"
                style={{ ...inputStyle, marginBottom: 16 }}
                onFocus={e => e.target.style.borderColor = '#f97316'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
              />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {QUICK_PICKS.map(pick => {
                  const isSelected = habitName === `${pick.emoji} ${pick.label}`
                  return (
                    <button
                      key={pick.label}
                      type="button"
                      onClick={() => setHabitName(`${pick.emoji} ${pick.label}`)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '7px 13px', borderRadius: 100,
                        backgroundColor: isSelected ? 'rgba(249,115,22,0.15)' : 'rgba(255,255,255,0.04)',
                        border: isSelected ? '1px solid rgba(249,115,22,0.6)' : '1px solid rgba(255,255,255,0.1)',
                        color: isSelected ? '#f97316' : '#9ca3af',
                        fontSize: 13, fontWeight: isSelected ? 600 : 400,
                        cursor: 'pointer', transition: 'all 0.15s',
                      }}
                    >
                      <span>{pick.emoji}</span><span>{pick.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* ── Duration ── */}
            <div style={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: 24 }}>
              <label style={labelStyle}>Duration</label>
              <div style={{ display: 'flex', gap: 10 }}>
                {DURATIONS.map(d => {
                  const isSelected = duration === d
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDuration(d)}
                      style={{
                        flex: 1, padding: '12px 8px', borderRadius: 12,
                        backgroundColor: isSelected ? '#f97316' : 'rgba(255,255,255,0.04)',
                        border: isSelected ? '1px solid #f97316' : '1px solid rgba(255,255,255,0.1)',
                        color: isSelected ? '#fff' : '#9ca3af',
                        fontSize: 14, fontWeight: isSelected ? 700 : 400,
                        cursor: 'pointer', transition: 'all 0.15s',
                        boxShadow: isSelected ? '0 4px 14px rgba(249,115,22,0.35)' : 'none',
                      }}
                    >
                      {d}d
                    </button>
                  )
                })}
              </div>
            </div>

            {/* ── Stake (optional) ── */}
            <div style={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label style={{ ...labelStyle, marginBottom: 0 }}>Add a Stake? <span style={{ color: '#374151', fontWeight: 400 }}>(optional)</span></label>
                <span style={{ fontSize: 12, color: stake.length > STAKE_MAX * 0.8 ? '#f97316' : '#374151' }}>
                  {stake.length}/{STAKE_MAX}
                </span>
              </div>
              <p style={{ color: '#4b5563', fontSize: 12, margin: '0 0 12px', lineHeight: 1.5 }}>
                What does the loser have to do? Keep it fun — buy a coffee, do pushups, post an embarrassing photo 😈
              </p>
              <input
                type="text"
                value={stake}
                onChange={e => { if (e.target.value.length <= STAKE_MAX) setStake(e.target.value) }}
                placeholder="e.g. Loser buys coffee ☕"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#f97316'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
              />
            </div>

            {/* ── Opponent ── */}
            <div style={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: 24 }}>
              <label style={labelStyle}>Challenge who?</label>
              <input
                type="text"
                value={opponent}
                onChange={e => setOpponent(e.target.value)}
                placeholder="Their email or @username"
                autoComplete="off"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#f97316'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
              />
              <p style={{ margin: '8px 0 0', fontSize: 12, color: '#4b5563' }}>
                They'll get a notification to accept or decline.
              </p>

              {/* Group mode toggle */}
              <button
                type="button"
                onClick={() => setGroupMode(m => !m)}
                style={{
                  marginTop: 16, display: 'flex', alignItems: 'center', gap: 8,
                  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                }}
              >
                <div style={{
                  width: 36, height: 20, borderRadius: 100,
                  backgroundColor: groupMode ? '#f97316' : 'rgba(255,255,255,0.1)',
                  position: 'relative', transition: 'background-color 0.2s', flexShrink: 0,
                }}>
                  <div style={{
                    position: 'absolute', top: 2, left: groupMode ? 18 : 2,
                    width: 16, height: 16, borderRadius: '50%', backgroundColor: '#fff',
                    transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
                  }} />
                </div>
                <span style={{ fontSize: 13, color: groupMode ? '#f97316' : '#6b7280', fontWeight: groupMode ? 600 : 400 }}>
                  Invite more people?
                </span>
              </button>

              {/* Extra opponent fields */}
              {groupMode && (
                <div style={{ marginTop: 16 }}>
                  <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 12px' }}>
                    Add up to 4 more opponents. Everyone must accept to start.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {extraOpponents.map((val, i) => (
                      <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input
                          type="text"
                          value={val}
                          onChange={e => updateExtra(i, e.target.value)}
                          placeholder={`Opponent ${i + 2} email or @username`}
                          autoComplete="off"
                          style={{ ...inputStyle, flex: 1 }}
                          onFocus={e => e.target.style.borderColor = '#f97316'}
                          onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                        />
                        <button
                          type="button"
                          onClick={() => removeExtra(i)}
                          style={{
                            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                            backgroundColor: 'rgba(239,68,68,0.1)',
                            border: '1px solid rgba(239,68,68,0.2)',
                            color: '#ef4444', cursor: 'pointer', fontSize: 16,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    {extraOpponents.length < 4 && (
                      <button
                        type="button"
                        onClick={addExtra}
                        style={{
                          padding: '9px', borderRadius: 10,
                          backgroundColor: 'rgba(255,255,255,0.03)',
                          border: '1px dashed rgba(255,255,255,0.12)',
                          color: '#6b7280', fontSize: 13, cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(249,115,22,0.4)'; e.currentTarget.style.color = '#f97316' }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = '#6b7280' }}
                      >
                        + Add another opponent
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ── Submit ── */}
            <button
              type="submit"
              disabled={loading || !user}
              style={{
                width: '100%', padding: '15px', borderRadius: 14,
                backgroundColor: loading ? 'rgba(249,115,22,0.5)' : '#f97316',
                border: 'none', color: '#fff', fontWeight: 700, fontSize: 16,
                cursor: loading ? 'default' : 'pointer',
                boxShadow: loading ? 'none' : '0 6px 22px rgba(249,115,22,0.42)',
                transition: 'background 0.15s, box-shadow 0.15s',
              }}
            >
              {loading
                ? 'Sending challenge…'
                : groupMode && extraOpponents.some(v => v.trim())
                  ? `⚔️ Send Group Challenge (${1 + extraOpponents.filter(v => v.trim()).length} opponents)`
                  : '⚔️ Send Challenge'}
            </button>

          </form>
        </div>
      </div>
    </div>
  )
}

export default function NewChallengePage() {
  return (
    <Suspense>
      <NewChallengeForm />
    </Suspense>
  )
}
