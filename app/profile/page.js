'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { BADGES, checkAndAwardBadges } from '@/lib/badges'
import { Navbar } from '@/components/Navbar'
import { PageLoader } from '@/components/PageLoader'

const AVATAR_OPTIONS = ['🔥', '⚡', '🏆', '💪', '🎯', '🚀', '👑', '⭐']

function formatMemberSince(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function getChallengeDisplayStatus(challenge, userId) {
  if (challenge.status === 'active')  return { label: 'Active',   color: '#f97316', bg: 'rgba(249,115,22,0.1)',  border: 'rgba(249,115,22,0.2)'  }
  if (challenge.status === 'pending') return { label: 'Pending',  color: '#eab308', bg: 'rgba(234,179,8,0.1)',   border: 'rgba(234,179,8,0.2)'   }
  if (challenge.status === 'declined')return { label: 'Declined', color: '#6b7280', bg: 'rgba(107,114,128,0.1)', border: 'rgba(107,114,128,0.2)' }
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
  const [rivals, setRivals]                   = useState([])
  const [rivalProfiles, setRivalProfiles]     = useState({})
  const [earnedBadges, setEarnedBadges]       = useState(new Set())
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
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
      setProfile(profileData)
      setEarnedBadges(new Set(profileData?.badges ?? []))
      checkAndAwardBadges(user.id, supabase).then(nb => { if (nb.length > 0) setEarnedBadges(prev => new Set([...prev, ...nb])) }).catch(() => {})
      const { data: challengesData } = await supabase.from('habit_challenges').select('*').or(`challenger_id.eq.${user.id},opponent_id.eq.${user.id}`).order('created_at', { ascending: false })
      if (challengesData?.length > 0) {
        setChallenges(challengesData)
        const opponentIds = [...new Set(challengesData.map(c => c.challenger_id === user.id ? c.opponent_id : c.challenger_id))]
        const { data: oppProfiles } = await supabase.from('profiles').select('id, username, email').in('id', opponentIds)
        const map = {}; for (const p of oppProfiles ?? []) map[p.id] = p
        setOpponentMap(map)
      }
      const { data: rivalsData } = await supabase.from('rivalries').select('*').eq('user_id', user.id).order('total_challenges', { ascending: false })
      if (rivalsData?.length > 0) {
        setRivals(rivalsData)
        const { data: rProfiles } = await supabase.from('profiles').select('id, username, email').in('id', rivalsData.map(r => r.rival_id))
        const rMap = {}; for (const p of rProfiles ?? []) rMap[p.id] = p
        setRivalProfiles(rMap)
      }
      setLoading(false)
    }
    load()
  }, [router])

  async function saveUsername() {
    const trimmed = usernameInput.trim()
    if (!trimmed) { setUsernameError('Username cannot be empty.'); return }
    if (trimmed === profile?.username) { setEditingUsername(false); return }
    setSavingUsername(true); setUsernameError('')
    const supabase = createClient()
    const { error } = await supabase.from('profiles').update({ username: trimmed }).eq('id', user.id)
    if (error) { setUsernameError('That username is taken or invalid.') }
    else { setProfile(prev => ({ ...prev, username: trimmed })); setEditingUsername(false) }
    setSavingUsername(false)
  }

  async function handleAvatarPick(emoji) {
    if (savingAvatar || profile?.avatar === emoji) return
    setProfile(prev => ({ ...prev, avatar: emoji })); setSavingAvatar(true)
    const supabase = createClient()
    await supabase.from('profiles').update({ avatar: emoji }).eq('id', user.id)
    setSavingAvatar(false)
  }

  if (loading) return <PageLoader text="Loading profile…" />
  if (!user) return null

  const avatar = profile?.avatar || '🔥'
  const displayName = profile?.username ? `@${profile.username}` : (user.email ?? '')
  const wins = challenges.filter(c => c.winner_id === user.id).length
  const completed = challenges.filter(c => c.status === 'completed').length
  const winRate = completed > 0 ? Math.round((wins / completed) * 100) : 0
  const stats = [
    { label: 'Total Challenges', value: challenges.length,                     icon: '⚔️',  accent: false },
    { label: 'Wins',             value: wins,                                   icon: '🏆',  accent: true  },
    { label: 'Active Now',       value: challenges.filter(c => c.status === 'active').length, icon: '🔥', accent: false },
    { label: 'Win Rate',         value: `${winRate}%`,                          icon: '📈',  accent: wins > 0 },
  ]

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#030712', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
      <Navbar backHref="/dashboard" />
      <main style={{ maxWidth: 720, margin: '0 auto', padding: '40px 20px 80px' }}>

        <section style={{ textAlign: 'center', marginBottom: 44 }}>
          <div style={{ width: 96, height: 96, borderRadius: '50%', background: 'linear-gradient(135deg, rgba(249,115,22,0.3), rgba(249,115,22,0.05))', border: '1.5px solid rgba(249,115,22,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 48, boxShadow: '0 0 40px rgba(249,115,22,0.12), 0 8px 32px rgba(0,0,0,0.4)' }}>{avatar}</div>
          {editingUsername ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                <input ref={inputRef} value={usernameInput} onChange={e => setUsernameInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') saveUsername(); if (e.key === 'Escape') { setEditingUsername(false); setUsernameError('') } }} placeholder="username" style={{ backgroundColor: '#1e293b', border: '1.5px solid rgba(249,115,22,0.5)', borderRadius: 12, padding: '10px 16px', fontSize: 20, fontWeight: 700, color: '#fff', outline: 'none', textAlign: 'center', width: 220, letterSpacing: '-0.01em' }} />
                <button onClick={saveUsername} disabled={savingUsername} style={{ padding: '10px 20px', borderRadius: 12, border: 'none', backgroundColor: savingUsername ? 'rgba(249,115,22,0.4)' : '#f97316', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>{savingUsername ? 'Saving…' : 'Save'}</button>
                <button onClick={() => { setEditingUsername(false); setUsernameError('') }} style={{ padding: '10px 14px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'transparent', color: '#6b7280', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              </div>
              {usernameError && <p style={{ color: '#f87171', fontSize: 12, margin: 0 }}>{usernameError}</p>}
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 4 }}>
              <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, letterSpacing: '-0.025em' }}>{displayName}</h1>
              <button onClick={() => { setUsernameInput(profile?.username ?? ''); setUsernameError(''); setEditingUsername(true); setTimeout(() => inputRef.current?.focus(), 0) }} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '4px 10px', color: '#4b5563', fontSize: 12, cursor: 'pointer' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(249,115,22,0.4)'; e.currentTarget.style.color = '#f97316' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#4b5563' }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                Edit
              </button>
            </div>
          )}
          <p style={{ color: '#374151', fontSize: 13, margin: '8px 0 0' }}>Member since {formatMemberSince(profile?.created_at)}</p>
        </section>

        <section style={{ marginBottom: 40 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {stats.map(({ label, value, icon, accent }) => (
              <div key={label} style={{ backgroundColor: '#0f172a', border: accent ? '1px solid rgba(249,115,22,0.2)' : '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: '22px 24px', position: 'relative', overflow: 'hidden' }}>
                {accent && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, #ea580c, #f97316)' }} />}
                <div style={{ fontSize: 24, marginBottom: 10 }}>{icon}</div>
                <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 4, lineHeight: 1, color: accent ? '#f97316' : '#fff' }}>{value}</div>
                <div style={{ fontSize: 12, color: '#4b5563', fontWeight: 500 }}>{label}</div>
              </div>
            ))}
          </div>
        </section>

        <section style={{ marginBottom: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#f97316', margin: 0 }}>Achievements</h2>
            <span style={{ fontSize: 12, color: '#4b5563', fontWeight: 500 }}>{earnedBadges.size}/{BADGES.length} unlocked</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {BADGES.map(badge => {
              const isEarned = earnedBadges.has(badge.id)
              return (
                <div key={badge.id} style={{ backgroundColor: '#0f172a', border: isEarned ? '1px solid rgba(249,115,22,0.3)' : '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14, opacity: isEarned ? 1 : 0.45, boxShadow: isEarned ? '0 0 20px rgba(249,115,22,0.07)' : 'none' }}>
                  <span style={{ fontSize: 28, lineHeight: 1, flexShrink: 0, filter: isEarned ? 'none' : 'grayscale(1)' }}>{isEarned ? badge.emoji : '🔒'}</span>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontWeight: 600, fontSize: 13, margin: '0 0 2px', color: isEarned ? '#fff' : '#6b7280' }}>{badge.name}</p>
                    <p style={{ fontSize: 11, color: '#4b5563', margin: 0, lineHeight: 1.4 }}>{badge.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {rivals.length > 0 && (
          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#f97316', margin: '0 0 16px' }}>Your Rivals</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {rivals.map(rivalry => {
                const rProfile = rivalProfiles[rivalry.rival_id]
                const rName = rProfile?.username ? `@${rProfile.username}` : (rProfile?.email ?? 'Unknown')
                const iLead = rivalry.user_wins > rivalry.rival_wins, theyLead = rivalry.rival_wins > rivalry.user_wins
                return (
                  <div key={rivalry.id} style={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '18px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: 15, margin: '0 0 4px' }}>{rName}</p>
                      <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>
                        <span style={{ color: iLead ? '#4ade80' : theyLead ? '#f87171' : '#9ca3af', fontWeight: 600 }}>You {rivalry.user_wins}</span>
                        {' — '}
                        <span style={{ color: theyLead ? '#f87171' : '#9ca3af', fontWeight: 600 }}>{rivalry.rival_wins} {rName}</span>
                        <span style={{ color: '#374151' }}> · {rivalry.total_challenges} matches</span>
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: iLead ? '#4ade80' : theyLead ? '#f87171' : '#9ca3af' }}>{iLead ? 'You lead' : theyLead ? 'They lead' : 'Tied'}</span>
                      {rProfile?.username && <Link href={`/challenges/new?opponent=${rProfile.username}`} style={{ fontSize: 12, fontWeight: 700, padding: '6px 14px', borderRadius: 10, backgroundColor: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.25)', color: '#f97316', textDecoration: 'none' }}>Challenge Again ⚔️</Link>}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        <section style={{ marginBottom: 40 }}>
          <div style={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: 24 }}>
            <h2 style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#f97316', margin: '0 0 16px' }}>Change Avatar</h2>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {AVATAR_OPTIONS.map(emoji => {
                const sel = avatar === emoji
                return (
                  <button key={emoji} onClick={() => handleAvatarPick(emoji)} style={{ width: 54, height: 54, borderRadius: 14, fontSize: 28, backgroundColor: sel ? 'rgba(249,115,22,0.12)' : 'rgba(255,255,255,0.03)', border: sel ? '2px solid rgba(249,115,22,0.7)' : '2px solid rgba(255,255,255,0.08)', cursor: sel ? 'default' : 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: sel ? '0 0 18px rgba(249,115,22,0.3)' : 'none', transform: sel ? 'scale(1.08)' : 'scale(1)' }}
                    onMouseEnter={e => { if (!sel) { e.currentTarget.style.borderColor = 'rgba(249,115,22,0.4)'; e.currentTarget.style.backgroundColor = 'rgba(249,115,22,0.08)'; e.currentTarget.style.transform = 'scale(1.05)' } }}
                    onMouseLeave={e => { if (!sel) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)'; e.currentTarget.style.transform = 'scale(1)' } }}>
                    {emoji}
                  </button>
                )
              })}
            </div>
          </div>
        </section>

        <section>
          <h2 style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#f97316', margin: '0 0 16px' }}>Challenge History</h2>
          {challenges.length === 0 ? (
            <div style={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '32px 24px', textAlign: 'center', color: '#4b5563', fontSize: 14 }}>No challenges yet. <Link href="/challenges/new" style={{ color: '#f97316', textDecoration: 'none', fontWeight: 600 }}>Start one →</Link></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {challenges.map(challenge => {
                const opponentId = challenge.challenger_id === user.id ? challenge.opponent_id : challenge.challenger_id
                const opp = opponentMap[opponentId]
                const oppName = opp?.username ? `@${opp.username}` : (opp?.email ?? 'Opponent')
                const st = getChallengeDisplayStatus(challenge, user.id)
                return (
                  <Link key={challenge.id} href={`/challenges/${challenge.id}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '14px 18px', textDecoration: 'none', color: 'inherit', gap: 12 }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(249,115,22,0.25)'; e.currentTarget.style.backgroundColor = '#111827' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.backgroundColor = '#0f172a' }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p style={{ fontWeight: 600, fontSize: 14, margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{challenge.habit_name}</p>
                      <p style={{ color: '#4b5563', fontSize: 12, margin: 0 }}>vs {oppName} · {challenge.duration_days}d</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: st.color, backgroundColor: st.bg, border: `1px solid ${st.border}`, padding: '4px 12px', borderRadius: 100 }}>{st.label}</span>
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#374151" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
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
