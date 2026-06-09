import { calculateStreak, toDateStr } from '@/lib/utils'

export function ChallengeCard({ challenge, user, profile, todayStr, checkingIn, onCheckIn }) {
  const isGroupChallenge = (challenge.max_participants ?? 2) > 2
  const opponentId = challenge.challenger_id === user.id ? challenge.opponent_id : challenge.challenger_id
  const opponentName = challenge.opponentProfile?.username ? `@${challenge.opponentProfile.username}` : (challenge.opponentProfile?.email ?? 'Opponent')
  const checkins = challenge.checkins ?? []
  const myCheckins = checkins.filter(c => c.user_id === user.id)
  const opponentCheckins = checkins.filter(c => c.user_id === opponentId)
  const iCheckedIn = myCheckins.some(c => c.checkin_date === todayStr)
  const theyCheckedIn = opponentCheckins.some(c => c.checkin_date === todayStr)
  const myStreak = calculateStreak(checkins, user.id)
  const opponentStreak = calculateStreak(checkins, opponentId)
  const isCheckingIn = checkingIn.has(challenge.id)

  const start = challenge.start_date ? new Date(challenge.start_date) : new Date()
  const dayX = Math.max(1, Math.floor((new Date() - start) / 86400000) + 1)
  const dayTotal = challenge.duration_days ?? 30
  const pct = Math.min(100, Math.round((dayX / dayTotal) * 100))
  const myName = profile?.username ? `@${profile.username}` : 'You'

  let groupMembers = []
  if (isGroupChallenge) {
    const addMember = (uid, prof, isYou) => ({
      key: uid,
      name: isYou ? myName : (prof?.username ? `@${prof.username}` : prof?.email ?? 'Unknown'),
      isYou,
      checkedInToday: checkins.some(c => c.user_id === uid && c.checkin_date === todayStr),
      isPending: false,
    })
    groupMembers.push(addMember(challenge.challenger_id, challenge.challengerProfile, challenge.challenger_id === user.id))
    if (challenge.opponent_id) groupMembers.push(addMember(challenge.opponent_id, challenge.mainOpponentProfile, challenge.opponent_id === user.id))
    for (const gp of challenge.groupParticipants ?? []) {
      groupMembers.push({ ...addMember(gp.user_id, gp.profile, gp.user_id === user.id), isPending: gp.status === 'pending' })
    }
  }

  let statusMsg = '⏰ Check in before midnight!'
  if (isGroupChallenge) {
    const checkedCount = groupMembers.filter(m => m.checkedInToday).length
    statusMsg = iCheckedIn ? `💪 ${checkedCount}/${groupMembers.length} checked in today` : `⏰ ${checkedCount}/${groupMembers.length} checked in — don't fall behind!`
  } else {
    if (iCheckedIn && !theyCheckedIn) statusMsg = `🏆 ${opponentName} missed today! You're winning`
    else if (!iCheckedIn && theyCheckedIn) statusMsg = `⚠️ Don't let ${opponentName} win! Check in now`
    else if (iCheckedIn && theyCheckedIn) statusMsg = '💪 Both on track! Keep going'
  }

  return (
    <div style={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: '24px 28px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4, gap: 12 }}>
        <div>
          <h3 style={{ fontWeight: 700, fontSize: 17, margin: '0 0 2px' }}>{challenge.emoji ? `${challenge.emoji} ` : ''}{challenge.habit_name}</h3>
          <p style={{ color: '#6b7280', fontSize: 13, margin: 0 }}>{isGroupChallenge ? `${groupMembers.length} participants` : `vs ${opponentName}`}</p>
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#f97316', backgroundColor: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.2)', padding: '4px 12px', borderRadius: 100, whiteSpace: 'nowrap', flexShrink: 0 }}>Active</span>
      </div>
      {challenge.stake ? <p style={{ fontSize: 12, color: '#f97316', margin: '6px 0 16px', fontWeight: 500 }}>💰 Stake: {challenge.stake}</p> : <div style={{ marginBottom: 16 }} />}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6b7280', marginBottom: 6 }}>
          <span>Day {dayX} of {dayTotal}</span>
          <span style={{ color: '#f97316', fontWeight: 600 }}>{pct}%</span>
        </div>
        <div style={{ height: 6, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 100, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, backgroundColor: '#f97316', borderRadius: 100, boxShadow: '0 0 12px rgba(249,115,22,0.6)' }} />
        </div>
      </div>
      {isGroupChallenge ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
          {groupMembers.map(m => (
            <div key={m.key} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 100, backgroundColor: m.isYou ? 'rgba(249,115,22,0.1)' : 'rgba(255,255,255,0.04)', border: m.isYou ? '1px solid rgba(249,115,22,0.25)' : '1px solid rgba(255,255,255,0.08)' }}>
              <span style={{ fontSize: 14 }}>{m.isPending ? '⏳' : m.checkedInToday ? '✅' : '❌'}</span>
              <span style={{ fontSize: 13, color: m.isYou ? '#f97316' : '#9ca3af', fontWeight: m.isYou ? 600 : 400 }}>{m.name}</span>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          {[
            { label: myName, checkedIn: iCheckedIn, streak: myStreak, isYou: true },
            { label: opponentName, checkedIn: theyCheckedIn, streak: opponentStreak, isYou: false },
          ].map(({ label, checkedIn, streak, isYou }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', backgroundColor: checkedIn ? '#16a34a' : 'rgba(255,255,255,0.08)', border: checkedIn ? '2px solid #16a34a' : '2px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {checkedIn && <span style={{ fontSize: 12 }}>✓</span>}
                </div>
                <span style={{ fontSize: 14, fontWeight: isYou ? 600 : 400, color: isYou ? '#fff' : '#9ca3af' }}>{label}</span>
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#f97316' }}>{streak} 🔥</span>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>{statusMsg}</p>
        {iCheckedIn ? (
          <button disabled style={{ fontSize: 13, fontWeight: 700, padding: '9px 20px', borderRadius: 12, backgroundColor: 'rgba(22,163,74,0.15)', border: '1px solid rgba(22,163,74,0.3)', color: '#4ade80', cursor: 'default' }}>Checked In ✅</button>
        ) : (
          <button onClick={() => onCheckIn(challenge)} disabled={isCheckingIn} style={{ fontSize: 13, fontWeight: 700, padding: '9px 20px', borderRadius: 12, backgroundColor: isCheckingIn ? 'rgba(249,115,22,0.4)' : '#f97316', border: 'none', color: '#fff', cursor: isCheckingIn ? 'default' : 'pointer', boxShadow: '0 4px 16px rgba(249,115,22,0.35)', transition: 'background 0.15s' }}>
            {isCheckingIn ? 'Checking in…' : 'Check In'}
          </button>
        )}
      </div>
    </div>
  )
}
