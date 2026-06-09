'use client'

import { use, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { checkAndAwardBadges } from '@/lib/badges'
import { toDateStr, calculateStreak, lookupUser, CHALLENGE_STATUS_MAP } from '@/lib/utils'
import { sendNotifications, loadNotifSettings } from '@/lib/notifications'
import { Navbar } from '@/components/Navbar'
import { PageLoader } from '@/components/PageLoader'
import { Modal } from '@/components/Modal'
import { Confetti } from '@/components/Confetti'
import { StatusBadge } from '@/components/StatusBadge'
import { WinnerBanner } from '@/components/challenges/WinnerBanner'
import { StakeCard } from '@/components/challenges/StakeCard'
import { CheckinCalendar } from '@/components/challenges/CheckinCalendar'
import { ChallengeStats } from '@/components/challenges/ChallengeStats'

export default function ChallengeDetailPage({ params }) {
  const { id } = use(params)
  const [user, setUser]                       = useState(null)
  const [myProfile, setMyProfile]             = useState(null)
  const [challenge, setChallenge]             = useState(null)
  const [opponentProfile, setOpponentProfile] = useState(null)
  const [checkins, setCheckins]               = useState([])
  const [participants, setParticipants]       = useState([])
  const [loading, setLoading]                 = useState(true)
  const [checkingIn, setCheckingIn]           = useState(false)
  const [cancelModal, setCancelModal]         = useState(false)
  const [forfeitModal, setForfeitModal]       = useState(false)
  const [inviteModal, setInviteModal]         = useState(false)
  const [inviteInput, setInviteInput]         = useState('')
  const [inviteError, setInviteError]         = useState('')
  const [inviteSuccess, setInviteSuccess]     = useState('')
  const [inviting, setInviting]               = useState(false)
  const [actionLoading, setActionLoading]     = useState(false)
  const completionHandledRef = useRef(false)
  const notifSentRef         = useRef(false)
  const router   = useRouter()
  const todayStr = toDateStr(new Date())

  async function processCompletion(challengeData, checkinsData, userId, myProfileData, oppProfileData) {
    if (completionHandledRef.current || challengeData.status !== 'active') return
    const start = challengeData.start_date ? new Date(challengeData.start_date + 'T00:00:00') : null
    if (!start) return
    const dayX = Math.floor((new Date() - start) / 86400000) + 1
    if (dayX <= challengeData.duration_days) return
    completionHandledRef.current = true
    const opponentId = challengeData.challenger_id === userId ? challengeData.opponent_id : challengeData.challenger_id
    const myCount  = checkinsData.filter(c => c.user_id === userId).length
    const oppCount = checkinsData.filter(c => c.user_id === opponentId).length
    const winnerId = myCount > oppCount ? userId : (oppCount > myCount ? opponentId : null)
    const loserId  = winnerId ? (winnerId === userId ? opponentId : userId) : null
    const supabase = createClient()
    const { data: updated } = await supabase.from('habit_challenges').update({ status: 'completed', winner_id: winnerId }).eq('id', challengeData.id).select().single()
    if (updated) setChallenge(updated)
    if (winnerId && loserId && !notifSentRef.current) {
      notifSentRef.current = true
      const habitName = challengeData.habit_name
      const myUsername  = myProfileData?.username ?? 'challenger'
      const oppUsername = oppProfileData?.username ?? 'opponent'
      await sendNotifications([
        { user_id: winnerId, type: 'challenge_won',  title: '🏆 You won!',   message: `You beat @${winnerId === userId ? oppUsername : myUsername} in the ${habitName} challenge!` },
        { user_id: loserId,  type: 'challenge_lost', title: '💀 You lost',   message: `@${winnerId === userId ? myUsername : oppUsername} beat you in the ${habitName} challenge. Rematch?` },
      ])
      fetch('/api/update-rivalry', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ winner_id: winnerId, loser_id: loserId, challenge_id: challengeData.id }) }).catch(console.error)
    }
    checkAndAwardBadges(userId, createClient()).catch(console.error)
  }

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }
      setUser(user)
      const { data: profileData } = await supabase.from('profiles').select('id, username, email').eq('id', user.id).maybeSingle()
      setMyProfile(profileData)
      const { data: challengeData } = await supabase.from('habit_challenges').select('*').eq('id', id).maybeSingle()
      if (!challengeData) { router.replace('/dashboard'); return }
      if (challengeData.challenger_id !== user.id && challengeData.opponent_id !== user.id) { router.replace('/dashboard'); return }
      setChallenge(challengeData)
      const opponentId = challengeData.challenger_id === user.id ? challengeData.opponent_id : challengeData.challenger_id
      const [{ data: oppProfile }, { data: checkinsData }, { data: partsData }] = await Promise.all([
        supabase.from('profiles').select('id, username, email').eq('id', opponentId).maybeSingle(),
        supabase.from('challenge_checkins').select('*').eq('challenge_id', id),
        supabase.from('challenge_participants').select('*').eq('challenge_id', id),
      ])
      setOpponentProfile(oppProfile)
      const ci = checkinsData ?? []
      setCheckins(ci)
      setParticipants(partsData ?? [])
      setLoading(false)
      processCompletion(challengeData, ci, user.id, profileData, oppProfile)
    }
    load()
  }, [id, router])

  async function handleCheckIn() {
    if (checkingIn) return
    setCheckingIn(true)
    const supabase = createClient()
    const { data: newCheckin } = await supabase.from('challenge_checkins').insert({ challenge_id: id, user_id: user.id, checkin_date: todayStr }).select().single()
    if (newCheckin) {
      const updated = [...checkins, newCheckin]
      setCheckins(updated)
      checkAndAwardBadges(user.id, createClient()).catch(console.error)
      if (challenge) processCompletion(challenge, updated, user.id, myProfile, opponentProfile)
      const settings = loadNotifSettings(user.id)
      if (settings.notify_checkin) sendNotifications([{ user_id: user.id, type: 'checkin_done', title: 'Checked in! 🔥', message: `You checked in for ${challenge?.habit_name}. Keep the streak alive!` }])
    }
    setCheckingIn(false)
  }

  async function handleCancelChallenge() {
    setActionLoading(true)
    const supabase = createClient()
    await supabase.from('habit_challenges').update({ status: 'cancelled' }).eq('id', id)
    const opponentId = challenge.challenger_id === user.id ? challenge.opponent_id : challenge.challenger_id
    await sendNotifications([{ user_id: opponentId, type: 'challenge_cancelled', title: 'Challenge Cancelled', message: `@${myProfile?.username ?? 'challenger'} cancelled the ${challenge.habit_name} challenge` }])
    router.replace('/dashboard')
  }

  async function handleForfeit() {
    setActionLoading(true)
    const opponentId = challenge.challenger_id === user.id ? challenge.opponent_id : challenge.challenger_id
    const supabase = createClient()
    await supabase.from('habit_challenges').update({ status: 'completed', winner_id: opponentId }).eq('id', id)
    await sendNotifications([{ user_id: opponentId, type: 'challenge_won', title: 'You won! 🏆', message: `@${myProfile?.username ?? 'challenger'} forfeited! You win the ${challenge.habit_name} challenge!` }])
    fetch('/api/update-rivalry', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ winner_id: opponentId, loser_id: user.id, challenge_id: id }) }).catch(console.error)
    router.replace('/dashboard')
  }

  async function handleInviteMore() {
    setInviteError(''); setInviteSuccess('')
    if (!inviteInput.trim()) { setInviteError('Enter a username or email'); return }
    setInviting(true)
    const supabase = createClient()
    const found = await lookupUser(supabase, inviteInput)
    if (!found) { setInviteError('User not found'); setInviting(false); return }
    if (found.id === user.id) { setInviteError("You can't invite yourself"); setInviting(false); return }
    const opponentId = challenge.challenger_id === user.id ? challenge.opponent_id : challenge.challenger_id
    if (found.id === opponentId || participants.some(p => p.user_id === found.id)) { setInviteError('Already in the challenge'); setInviting(false); return }
    const { error } = await supabase.from('habit_challenges').insert({ challenger_id: user.id, opponent_id: found.id, habit_name: challenge.habit_name, duration_days: challenge.duration_days, status: 'pending', stake: challenge.stake ?? null })
    if (error) { setInviteError('Failed to send invite'); setInviting(false); return }
    if (found.email) fetch('/api/challenge-invite', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ opponent_email: found.email, opponent_username: found.username, challenger_username: myProfile?.username ?? '', habit_name: challenge.habit_name, duration_days: challenge.duration_days, challenge_id: id }) }).catch(console.error)
    setInviteSuccess(`Invite sent to @${found.username ?? found.email}!`)
    setInviteInput('')
    setParticipants(prev => [...prev, { user_id: found.id, status: 'pending', profile: found }])
    setInviting(false)
  }

  if (loading) return <PageLoader text="Loading challenge…" />
  if (!challenge || !user) return null

  const opponentId    = challenge.challenger_id === user.id ? challenge.opponent_id : challenge.challenger_id
  const isChallenger  = challenge.challenger_id === user.id
  const myCheckins    = checkins.filter(c => c.user_id === user.id)
  const oppCheckins   = checkins.filter(c => c.user_id === opponentId)
  const myDates       = new Set(myCheckins.map(c => c.checkin_date))
  const oppDates      = new Set(oppCheckins.map(c => c.checkin_date))
  const myDisplayName = myProfile?.username ? `@${myProfile.username}` : (user.email ?? 'You')
  const opponentName  = opponentProfile?.username ? `@${opponentProfile.username}` : (opponentProfile?.email ?? 'Opponent')
  const statusStyle   = CHALLENGE_STATUS_MAP[challenge.status] ?? CHALLENGE_STATUS_MAP.pending
  const today         = new Date()
  const start         = challenge.start_date ? new Date(challenge.start_date + 'T00:00:00') : null
  const dayX          = start ? Math.max(1, Math.floor((today - start) / 86400000) + 1) : 1
  const dayTotal      = challenge.duration_days ?? 30
  const dayDisplay    = Math.min(dayX, dayTotal)
  const pct           = Math.min(100, Math.round((dayDisplay / dayTotal) * 100))
  const iCheckedIn    = myDates.has(todayStr)
  const totalElapsed  = start ? Math.max(1, Math.min(dayX, dayTotal)) : 1
  const myCompletions  = myCheckins.length
  const oppCompletions = oppCheckins.length
  const myCompPct  = Math.round((myCompletions / totalElapsed) * 100)
  const oppCompPct = Math.round((oppCompletions / totalElapsed) * 100)
  const myStreak   = calculateStreak(checkins, user.id)
  const oppStreak  = calculateStreak(checkins, opponentId)
  const isCompleted = challenge.status === 'completed'
  const iWon  = isCompleted && challenge.winner_id === user.id
  const iLost = isCompleted && challenge.winner_id && challenge.winner_id !== user.id
  const isTied = isCompleted && !challenge.winner_id
  const rematchUrl = `/challenges/new?opponent=${opponentProfile?.username ?? ''}`
  const totalParticipantCount = 2 + participants.length
  const canInviteMore = isChallenger && challenge.status === 'pending' && totalParticipantCount < 5

  let winnerText = "🤝 It's a tie!", winnerColor = '#9ca3af', winnerBg = 'rgba(255,255,255,0.03)', winnerBorder = 'rgba(255,255,255,0.08)'
  if (myCompletions > oppCompletions) { winnerText = '🏆 You are currently winning'; winnerColor = '#f97316'; winnerBg = 'rgba(249,115,22,0.07)'; winnerBorder = 'rgba(249,115,22,0.2)' }
  else if (oppCompletions > myCompletions) { winnerText = `🏆 ${opponentName} is currently winning`; winnerColor = '#f87171'; winnerBg = 'rgba(239,68,68,0.06)'; winnerBorder = 'rgba(239,68,68,0.15)' }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#030712', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
      {iWon && <Confetti />}
      <Navbar backHref="/dashboard" />

      <main style={{ maxWidth: 720, margin: '0 auto', padding: '36px 20px 80px' }}>
        {isCompleted && <section style={{ marginBottom: 32 }}><WinnerBanner iWon={iWon} iLost={iLost} isTied={isTied} opponentName={opponentName} myCompletions={myCompletions} oppCompletions={oppCompletions} totalElapsed={totalElapsed} rematchUrl={rematchUrl} /></section>}

        <section style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 6 }}>
            <h1 style={{ fontSize: 30, fontWeight: 800, margin: 0, letterSpacing: '-0.025em', lineHeight: 1.15 }}>{challenge.habit_name}</h1>
            <StatusBadge status={challenge.status} style={{ marginTop: 4 }} />
          </div>
          <p style={{ color: '#6b7280', fontSize: 15, margin: '0 0 20px' }}>vs {opponentName}</p>
          {start && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
                <span style={{ color: '#6b7280' }}>Day {dayDisplay} of {dayTotal}</span>
                <span style={{ color: '#f97316', fontWeight: 700 }}>{pct}%</span>
              </div>
              <div style={{ height: 8, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 100, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, #ea580c, #f97316)', borderRadius: 100, boxShadow: '0 0 16px rgba(249,115,22,0.45)', transition: 'width 0.6s ease' }} />
              </div>
            </div>
          )}
        </section>

        {challenge.status === 'active' && (
          <section style={{ marginBottom: 32 }}>
            {iCheckedIn ? (
              <button disabled style={{ width: '100%', padding: 17, borderRadius: 16, backgroundColor: 'rgba(22,163,74,0.1)', border: '1px solid rgba(22,163,74,0.25)', color: '#4ade80', fontWeight: 700, fontSize: 16, cursor: 'default' }}>Checked In Today ✅</button>
            ) : (
              <button onClick={handleCheckIn} disabled={checkingIn} style={{ width: '100%', padding: 17, borderRadius: 16, background: checkingIn ? 'rgba(249,115,22,0.5)' : 'linear-gradient(135deg, #ea580c, #f97316)', border: 'none', color: '#fff', fontWeight: 700, fontSize: 16, cursor: checkingIn ? 'default' : 'pointer', boxShadow: checkingIn ? 'none' : '0 8px 28px rgba(249,115,22,0.45)', transition: 'all 0.15s' }}>
                {checkingIn ? 'Checking in…' : 'Check In Today 🔥'}
              </button>
            )}
          </section>
        )}

        {challenge.stake && <section style={{ marginBottom: 32 }}><StakeCard stake={challenge.stake} isCompleted={isCompleted} winnerId={challenge.winner_id} userId={user.id} opponentName={opponentName} /></section>}

        {start && <section style={{ marginBottom: 32 }}><CheckinCalendar start={challenge.start_date} endDate={challenge.end_date} myDates={myDates} oppDates={oppDates} opponentName={opponentName} /></section>}

        {start && <section style={{ marginBottom: 32 }}><ChallengeStats myLabel={myDisplayName} oppLabel={opponentName} myCompletions={myCompletions} oppCompletions={oppCompletions} myStreak={myStreak} oppStreak={oppStreak} myCompPct={myCompPct} oppCompPct={oppCompPct} totalElapsed={totalElapsed} /></section>}

        {start && !isCompleted && (
          <section style={{ marginBottom: 32 }}>
            <div style={{ borderRadius: 16, padding: '18px 24px', backgroundColor: winnerBg, border: `1px solid ${winnerBorder}`, textAlign: 'center', fontWeight: 700, fontSize: 16, color: winnerColor }}>
              {winnerText}
            </div>
          </section>
        )}

        {isChallenger && (challenge.status === 'pending' || challenge.status === 'active') && (
          <section style={{ marginBottom: 32, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {canInviteMore && <button onClick={() => setInviteModal(true)} style={{ width: '100%', padding: 14, borderRadius: 14, backgroundColor: 'transparent', border: '1px solid rgba(249,115,22,0.4)', color: '#f97316', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>+ Invite More People</button>}
            {challenge.status === 'pending' && <button onClick={() => setCancelModal(true)} style={{ width: '100%', padding: 14, borderRadius: 14, backgroundColor: 'transparent', border: '1px solid rgba(239,68,68,0.35)', color: '#f87171', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>Cancel Challenge</button>}
            {challenge.status === 'active'  && <button onClick={() => setForfeitModal(true)} style={{ width: '100%', padding: 14, borderRadius: 14, backgroundColor: 'transparent', border: '1px solid rgba(239,68,68,0.35)', color: '#f87171', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>Forfeit Challenge</button>}
          </section>
        )}
      </main>

      {cancelModal && (
        <Modal onClose={() => setCancelModal(false)}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', backgroundColor: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 22 }}>🚫</div>
          <h3 style={{ fontWeight: 700, fontSize: 18, margin: '0 0 8px' }}>Cancel this challenge?</h3>
          <p style={{ color: '#9ca3af', fontSize: 14, margin: '0 0 24px', lineHeight: 1.6 }}>This will notify {opponentName} that you cancelled.</p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setCancelModal(false)} style={{ flex: 1, padding: 10, borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'transparent', color: '#9ca3af', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>Keep it</button>
            <button onClick={handleCancelChallenge} disabled={actionLoading} style={{ flex: 1, padding: 10, borderRadius: 12, border: 'none', backgroundColor: '#dc2626', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>{actionLoading ? 'Cancelling…' : 'Confirm'}</button>
          </div>
        </Modal>
      )}

      {forfeitModal && (
        <Modal onClose={() => setForfeitModal(false)}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>💀</div>
          <h3 style={{ fontWeight: 700, fontSize: 18, margin: '0 0 8px' }}>Forfeit this challenge?</h3>
          <p style={{ color: '#9ca3af', fontSize: 14, margin: '0 0 24px', lineHeight: 1.6 }}>You will lose and {opponentName} wins.</p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setForfeitModal(false)} style={{ flex: 1, padding: 10, borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'transparent', color: '#9ca3af', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>Keep going</button>
            <button onClick={handleForfeit} disabled={actionLoading} style={{ flex: 1, padding: 10, borderRadius: 12, border: 'none', backgroundColor: '#dc2626', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>{actionLoading ? 'Forfeiting…' : 'Forfeit'}</button>
          </div>
        </Modal>
      )}

      {inviteModal && (
        <Modal onClose={() => { setInviteModal(false); setInviteInput(''); setInviteError(''); setInviteSuccess('') }} maxWidth={420} textAlign="left">
          <h3 style={{ fontWeight: 700, fontSize: 18, margin: '0 0 4px' }}>Invite more opponents</h3>
          <p style={{ color: '#6b7280', fontSize: 13, margin: '0 0 20px' }}>{totalParticipantCount}/5 spots filled</p>
          {participants.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6b7280', marginBottom: 8 }}>Already invited</p>
              {participants.map(p => (
                <div key={p.user_id ?? p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10, marginBottom: 4 }}>
                  <span style={{ fontSize: 13, color: '#9ca3af' }}>{p.profile?.username ? `@${p.profile.username}` : (p.profile?.email ?? p.user_id?.slice(0, 8))}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 100, backgroundColor: p.status === 'accepted' ? 'rgba(34,197,94,0.1)' : p.status === 'declined' ? 'rgba(239,68,68,0.1)' : 'rgba(234,179,8,0.1)', color: p.status === 'accepted' ? '#4ade80' : p.status === 'declined' ? '#f87171' : '#eab308' }}>{p.status}</span>
                </div>
              ))}
            </div>
          )}
          <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#f97316', display: 'block', marginBottom: 8 }}>Username or Email</label>
          <input type="text" value={inviteInput} onChange={e => { setInviteInput(e.target.value); setInviteError(''); setInviteSuccess('') }} onKeyDown={e => { if (e.key === 'Enter') handleInviteMore() }} placeholder="@username or email" style={{ width: '100%', boxSizing: 'border-box', backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '11px 14px', fontSize: 14, color: '#fff', outline: 'none', marginBottom: 12 }} />
          {inviteError && <p style={{ color: '#f87171', fontSize: 13, margin: '0 0 12px' }}>{inviteError}</p>}
          {inviteSuccess && <p style={{ color: '#4ade80', fontSize: 13, margin: '0 0 12px' }}>{inviteSuccess}</p>}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => { setInviteModal(false); setInviteInput(''); setInviteError(''); setInviteSuccess('') }} style={{ flex: 1, padding: 10, borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'transparent', color: '#9ca3af', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>Close</button>
            <button onClick={handleInviteMore} disabled={inviting} style={{ flex: 1, padding: 10, borderRadius: 12, border: 'none', backgroundColor: inviting ? 'rgba(249,115,22,0.5)' : '#f97316', color: '#fff', cursor: inviting ? 'default' : 'pointer', fontWeight: 700, fontSize: 14 }}>{inviting ? 'Sending…' : 'Send Invite'}</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
