'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

const AVATAR_OPTIONS = ['🔥', '⚡', '🏆', '💪', '🎯', '🚀', '👑', '⭐']

function formatMemberSince(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function getChallengeDisplayStatus(challenge, userId) {
  if (challenge.status === 'active')   return { label: 'Active',   color: '#f97316', bg: 'rgba(249,115,22,0.1)',  border: 'rgba(249,115,22,0.2)'  }
  if (challenge.status === 'pending')  return { label: 'Pending',  color: '#eab308', bg: 'rgba(234,179,8,0.1)',   border: 'rgba(234,179,8,0.2)'   }
  if (challenge.status === 'declined') return { label: 'Declined', color: '#6b7280', bg: 'rgba(107,114,128,0.1)', border: 'rgba(107,114,128,0.2)' }
  if (challenge.status === 'completed') {
    if (challenge.winner_id === userId) return { label: 'Won',  color: '#4ade80', bg: 'rgba(74,222,128,0.1)',  border: 'rgba(74,222,128,0.25)'  }
    if (challenge.winner_id != null)    return { label: 'Lost', color: '#f87171', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.2)' }
    return { label: 'Done', color: '#9ca3af', bg: 'rgba(156,163,175,0.1)', border: 'rgba(156,163,175,0.2)' }
  }
  return { label: challenge.status, color: '#9ca3af', bg: 'rgba(156,163,175,0.1)', border: 'rgba(156,163,175,0.2)' }
}

export default function ProfilePage() {
  const [user, setUser]                       = useState(null)
  const [profile, setProfile]                 = useState(null)
  const [challenges, setChallenges]           = useState([])
  const [opponentMap, setOpponentMap]         = useState({})
  const [loading, setLoading]                 = useState(true)
  const [editingUsername, setEditingUsername] = useState(false)
  const [usernameInput, setUsernameInput]     = useState('')
  const [savingUsername, setSavingUsername]   = useState(false)
  const [usernameError, setUsernameError]     = useState('')
  const [savingAvatar, setSavingAvatar]       = useState(false)
  const inputRef = useRef(null)
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }
      setUser(user)

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()
      setProfile(profileData)

      const { data: challengesData } = await supabase
        .from('habit_challenges')
        .select('*')
        .or(`challenger_id.eq.${user.id},opponent_id.eq.${user.id}`)
        .order('created_at', { ascending: false })

      if (challengesData && challengesData.length > 0) {
        setChallenges(challengesData)

        const opponentIds = [...new Set(
          challengesData.map(c => c.challenger_id === user.id ? c.opponent_id : c.challenger_id)
        )]
        const { data: oppProfiles } = await supabase
          .from('profiles')
          .select('id, username, email')
          .in('id', opponentIds)

        const map = {}
        for (const p of oppProfiles ?? []) map[p.id] = p
        setOpponentMap(map)
      }

      setLoading(false)
    }
    load()
  }, [router])

  function startEditUsername() {
    setUsernameInput(profile?.username ?? '')
    setUsernameError('')
    setEditingUsername(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  async function saveUsername() {
    const trimmed = usernameInput.trim()
    if (!trimmed) { setUsernameError('Username cannot be empty.'); return }
    if (trimmed === profile?.username) { setEditingUsername(false); return }
    setSavingUsername(true)
    setUsernameError('')
    const supabase = createClient()
    const { error } = await supabase
      .from('profiles')
      .update({ username: trimmed })
      .eq('id', user.id)
    if (error) {
      setUsernameError('That username is taken or invalid.')
    } else {
      setProfile(prev => ({ ...prev, username: trimmed }))
      setEditingUsername(false)
    }
    setSavingUsername(false)
  }

  async function handleAvatarPick(emoji) {
    if (savingAvatar || profile?.avatar === emoji) return
    setProfile(prev => ({ ...prev, avatar: emoji }))
    setSavingAvatar(true)
    const supabase = createClient()
    await supabase.from('profiles').update({ avatar: emoji }).eq('id', user.id)
    setSavingAvatar(false)
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#030712', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🔥</div>
          <p style={{ color: '#6b7280', fontSize: 14 }}>Loading profile…</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  const avatar      = profile?.avatar || '🔥'
  const username    = profile?.username
  const displayName = username ? `@${username}` : (user.email ?? '')

  const totalChallenges = challenges.length
  const wins            = challenges.filter(c => c.winner_id === user.id).length
  const activeCount     = challenges.filter(c => c.status === 'active').length
  const completed       = challenges.filter(c => c.status === 'completed').length
  const winRate         = completed > 0 ? Math.round((wins / completed) * 100) : 0

  const stats = [
    { label: 'Total Challenges', value: totalChallenges, icon: '⚔️',  accent: false },
    { label: 'Wins',             value: wins,            icon: '🏆',  accent: true  },
    { label: 'Active Now',       value: activeCount,     icon: '🔥',  accent: false },
    { label: 'Win Rate',         value: `${winRate}%`,   icon: '📈',  accent: wins > 0 },
  ]

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#030712', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>

      {/* Navbar */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        backgroundColor: 'rgba(3,7,18,0.85)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 20px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/dashboard" style={{ fontWeight: 800, fontSize: 20, color: '#f97316', textDecoration: 'none', letterSpacing: '-0.01em' }}>
            Streak 🔥
          </Link>
          <Link
            href="/dashboard"
            style={{ fontSize: 13, color: '#6b7280', textDecoration: 'none', transition: 'color 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.color = '#fff'}
            onMouseLeave={e => e.currentTarget.style.color = '#6b7280'}
          >
            ← Dashboard
          </Link>
        </div>
      </header>

      <main style={{ maxWidth: 720, margin: '0 auto', padding: '40px 20px 80px' }}>

        {/* ── HEADER SECTION ── */}
        <section style={{ textAlign: 'center', marginBottom: 44 }}>

          {/* Avatar ring */}
          <div style={{
            width: 96, height: 96, borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(249,115,22,0.3), rgba(249,115,22,0.05))',
            border: '1.5px solid rgba(249,115,22,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
            fontSize: 48,
            boxShadow: '0 0 40px rgba(249,115,22,0.12), 0 8px 32px rgba(0,0,0,0.4)',
            position: 'relative',
          }}>
            {avatar}
          </div>

          {/* Username row */}
          {editingUsername ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                <input
                  ref={inputRef}
                  value={usernameInput}
                  onChange={e => setUsernameInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') saveUsername()
                    if (e.key === 'Escape') { setEditingUsername(false); setUsernameError('') }
                  }}
                  placeholder="username"
                  style={{
                    backgroundColor: '#1e293b',
                    border: '1.5px solid rgba(249,115,22,0.5)',
                    borderRadius: 12, padding: '10px 16px',
                    fontSize: 20, fontWeight: 700, color: '#fff', outline: 'none',
                    textAlign: 'center', width: 220, letterSpacing: '-0.01em',
                    transition: 'border-color 0.15s',
                  }}
                  onFocus={e => e.target.style.borderColor = '#f97316'}
                  onBlur={e => e.target.style.borderColor = 'rgba(249,115,22,0.5)'}
                />
                <button
                  onClick={saveUsername}
                  disabled={savingUsername}
                  style={{
                    padding: '10px 20px', borderRadius: 12, border: 'none',
                    backgroundColor: savingUsername ? 'rgba(249,115,22,0.4)' : '#f97316',
                    color: '#fff', fontWeight: 700, fontSize: 13,
                    cursor: savingUsername ? 'default' : 'pointer',
                    transition: 'background 0.15s',
                  }}
                >
                  {savingUsername ? 'Saving…' : 'Save'}
                </button>
                <button
                  onClick={() => { setEditingUsername(false); setUsernameError('') }}
                  style={{
                    padding: '10px 14px', borderRadius: 12,
                    border: '1px solid rgba(255,255,255,0.1)',
                    backgroundColor: 'transparent', color: '#6b7280',
                    fontSize: 13, cursor: 'pointer', transition: 'color 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                  onMouseLeave={e => e.currentTarget.style.color = '#6b7280'}
                >
                  Cancel
                </button>
              </div>
              {usernameError && (
                <p style={{ color: '#f87171', fontSize: 12, margin: 0 }}>{usernameError}</p>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 4 }}>
              <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, letterSpacing: '-0.025em' }}>
                {displayName}
              </h1>
              <button
                onClick={startEditUsername}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  background: 'none',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8, padding: '4px 10px',
                  color: '#4b5563', fontSize: 12, cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(249,115,22,0.4)'; e.currentTarget.style.color = '#f97316' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#4b5563' }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit
              </button>
            </div>
          )}

          <p style={{ color: '#374151', fontSize: 13, margin: '8px 0 0' }}>
            Member since {formatMemberSince(profile?.created_at)}
          </p>
        </section>

        {/* ── STATS GRID ── */}
        <section style={{ marginBottom: 40 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {stats.map(({ label, value, icon, accent }) => (
              <div key={label} style={{
                backgroundColor: '#0f172a',
                border: accent ? '1px solid rgba(249,115,22,0.2)' : '1px solid rgba(255,255,255,0.07)',
                borderRadius: 20,
                padding: '22px 24px',
                position: 'relative',
                overflow: 'hidden',
              }}>
                {accent && (
                  <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                    background: 'linear-gradient(90deg, #ea580c, #f97316)',
                  }} />
                )}
                <div style={{ fontSize: 24, marginBottom: 10 }}>{icon}</div>
                <div style={{
                  fontSize: 32, fontWeight: 800, letterSpacing: '-0.03em',
                  marginBottom: 4, lineHeight: 1,
                  color: accent ? '#f97316' : '#fff',
                }}>
                  {value}
                </div>
                <div style={{ fontSize: 12, color: '#4b5563', fontWeight: 500, letterSpacing: '0.01em' }}>
                  {label}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── AVATAR PICKER ── */}
        <section style={{ marginBottom: 40 }}>
          <div style={{
            backgroundColor: '#0f172a',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 20,
            padding: '24px',
          }}>
            <h2 style={{
              fontSize: 11, fontWeight: 700, letterSpacing: '0.12em',
              textTransform: 'uppercase', color: '#f97316', margin: '0 0 16px',
            }}>
              Change Avatar
            </h2>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {AVATAR_OPTIONS.map(emoji => {
                const isSelected = avatar === emoji
                return (
                  <button
                    key={emoji}
                    onClick={() => handleAvatarPick(emoji)}
                    style={{
                      width: 54, height: 54, borderRadius: 14,
                      fontSize: 28,
                      backgroundColor: isSelected ? 'rgba(249,115,22,0.12)' : 'rgba(255,255,255,0.03)',
                      border: isSelected ? '2px solid rgba(249,115,22,0.7)' : '2px solid rgba(255,255,255,0.08)',
                      cursor: isSelected ? 'default' : 'pointer',
                      transition: 'all 0.15s',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: isSelected ? '0 0 18px rgba(249,115,22,0.3)' : 'none',
                      transform: isSelected ? 'scale(1.08)' : 'scale(1)',
                    }}
                    onMouseEnter={e => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = 'rgba(249,115,22,0.4)'
                        e.currentTarget.style.backgroundColor = 'rgba(249,115,22,0.08)'
                        e.currentTarget.style.transform = 'scale(1.05)'
                      }
                    }}
                    onMouseLeave={e => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
                        e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)'
                        e.currentTarget.style.transform = 'scale(1)'
                      }
                    }}
                  >
                    {emoji}
                  </button>
                )
              })}
            </div>
          </div>
        </section>

        {/* ── CHALLENGE HISTORY ── */}
        <section>
          <h2 style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: '#f97316', margin: '0 0 16px',
          }}>
            Challenge History
          </h2>

          {challenges.length === 0 ? (
            <div style={{
              backgroundColor: '#0f172a',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 16, padding: '32px 24px',
              textAlign: 'center', color: '#4b5563', fontSize: 14,
            }}>
              No challenges yet.{' '}
              <Link href="/challenges/new" style={{ color: '#f97316', textDecoration: 'none', fontWeight: 600 }}>
                Start one →
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {challenges.map(challenge => {
                const opponentId = challenge.challenger_id === user.id ? challenge.opponent_id : challenge.challenger_id
                const opp        = opponentMap[opponentId]
                const oppName    = opp?.username ? `@${opp.username}` : (opp?.email ?? 'Opponent')
                const st         = getChallengeDisplayStatus(challenge, user.id)

                return (
                  <Link
                    key={challenge.id}
                    href={`/challenges/${challenge.id}`}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      backgroundColor: '#0f172a',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: 14, padding: '14px 18px',
                      textDecoration: 'none', color: 'inherit',
                      transition: 'border-color 0.15s, background-color 0.15s',
                      gap: 12,
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = 'rgba(249,115,22,0.25)'
                      e.currentTarget.style.backgroundColor = '#111827'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'
                      e.currentTarget.style.backgroundColor = '#0f172a'
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p style={{
                        fontWeight: 600, fontSize: 14, margin: '0 0 2px',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {challenge.habit_name}
                      </p>
                      <p style={{ color: '#4b5563', fontSize: 12, margin: 0 }}>
                        vs {oppName} · {challenge.duration_days}d
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                      <span style={{
                        fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                        color: st.color, backgroundColor: st.bg,
                        border: `1px solid ${st.border}`,
                        padding: '4px 12px', borderRadius: 100,
                      }}>
                        {st.label}
                      </span>
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#374151" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </section>

      </main>
    </div>
  )
}
