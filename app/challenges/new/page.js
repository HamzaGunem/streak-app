'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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

export default function NewChallengePage() {
  const [user, setUser] = useState(null)
  const [challengerProfile, setChallengerProfile] = useState(null)
  const [habitName, setHabitName] = useState('')
  const [duration, setDuration] = useState(30)
  const [opponent, setOpponent] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }
      setUser(user)

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, username, email')
        .eq('id', user.id)
        .maybeSingle()
      setChallengerProfile(profile)
    }
    checkAuth()
  }, [router])

  function selectQuickPick(pick) {
    setHabitName(`${pick.emoji} ${pick.label}`)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    const trimmedHabit = habitName.trim()
    const trimmedOpponent = opponent.trim()

    if (!trimmedHabit) { setError('Please enter a habit name.'); return }
    if (!trimmedOpponent) { setError('Please enter an opponent email or username.'); return }

    setLoading(true)
    const supabase = createClient()

    // Look up opponent — try email first, then username
    let opponentProfile = null

    const { data: byEmail } = await supabase
      .from('profiles')
      .select('id, email, username')
      .eq('email', trimmedOpponent)
      .maybeSingle()

    if (byEmail) {
      opponentProfile = byEmail
    } else {
      const usernameQuery = trimmedOpponent.startsWith('@')
        ? trimmedOpponent.slice(1)
        : trimmedOpponent

      const { data: byUsername } = await supabase
        .from('profiles')
        .select('id, email, username')
        .eq('username', usernameQuery)
        .maybeSingle()

      opponentProfile = byUsername ?? null
    }

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

    const { data: newChallenge, error: insertError } = await supabase
      .from('habit_challenges')
      .insert({
        habit_name: trimmedHabit,
        challenger_id: user.id,
        opponent_id: opponentProfile.id,
        status: 'pending',
        duration_days: duration,
      })
      .select()
      .single()

    if (insertError) {
      setError('Something went wrong. Please try again.')
      setLoading(false)
      return
    }

    if (newChallenge) {
      fetch('/api/challenge-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opponent_email: opponentProfile.email,
          opponent_username: opponentProfile.username ?? '',
          challenger_username: challengerProfile?.username ?? user.email,
          habit_name: trimmedHabit,
          duration_days: duration,
          challenge_id: newChallenge.id,
        }),
      }).catch(err => console.error('Email invite failed:', err))
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
          <Link href="/dashboard" style={{ fontSize: 13, color: '#6b7280', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
            ← Back
          </Link>
        </div>
      </header>

      <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 20px 80px' }}>
        <div style={{ width: '100%', maxWidth: 480 }}>

          {/* Header */}
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

            {/* Habit Name */}
            <div style={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: 24 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#f97316', marginBottom: 12 }}>
                Habit Name
              </label>
              <input
                type="text"
                value={habitName}
                onChange={e => setHabitName(e.target.value)}
                placeholder="e.g. Run 5km, Read 30 mins…"
                style={{
                  width: '100%', boxSizing: 'border-box',
                  backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 12, padding: '12px 16px',
                  fontSize: 15, color: '#fff', outline: 'none',
                  transition: 'border-color 0.15s', marginBottom: 16,
                }}
                onFocus={e => e.target.style.borderColor = '#f97316'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
              />

              {/* Quick Picks */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {QUICK_PICKS.map(pick => {
                  const isSelected = habitName === `${pick.emoji} ${pick.label}`
                  return (
                    <button
                      key={pick.label}
                      type="button"
                      onClick={() => selectQuickPick(pick)}
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
                      <span>{pick.emoji}</span>
                      <span>{pick.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Duration */}
            <div style={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: 24 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#f97316', marginBottom: 12 }}>
                Duration
              </label>
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

            {/* Opponent */}
            <div style={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: 24 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#f97316', marginBottom: 12 }}>
                Challenge who?
              </label>
              <input
                type="text"
                value={opponent}
                onChange={e => setOpponent(e.target.value)}
                placeholder="Their email or @username"
                autoComplete="off"
                style={{
                  width: '100%', boxSizing: 'border-box',
                  backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 12, padding: '12px 16px',
                  fontSize: 15, color: '#fff', outline: 'none',
                  transition: 'border-color 0.15s',
                }}
                onFocus={e => e.target.style.borderColor = '#f97316'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
              />
              <p style={{ margin: '8px 0 0', fontSize: 12, color: '#4b5563' }}>
                They'll get a notification to accept or decline.
              </p>
            </div>

            {/* Submit */}
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
              {loading ? 'Sending challenge…' : '⚔️ Send Challenge'}
            </button>

          </form>
        </div>
      </div>
    </div>
  )
}
