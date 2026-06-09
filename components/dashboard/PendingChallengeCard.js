export function PendingChallengeCard({ challenge, onAccept, onDecline }) {
  const challengerName = challenge.challengerProfile?.username
    ? `@${challenge.challengerProfile.username}`
    : (challenge.challengerProfile?.email ?? 'Someone')

  return (
    <div style={{ backgroundColor: '#0f172a', border: '1px solid rgba(249,115,22,0.15)', borderRadius: 16, padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
      <div>
        <p style={{ fontWeight: 600, fontSize: 15, margin: '0 0 2px' }}>
          {challengerName} challenged you to <span style={{ color: '#f97316' }}>{challenge.habit_name}</span>
        </p>
        <p style={{ color: '#6b7280', fontSize: 13, margin: 0 }}>
          {challenge.duration_days}-day challenge
          {challenge.isGroupParticipant && <span style={{ marginLeft: 6, color: '#f97316', fontWeight: 500 }}>· Group challenge</span>}
        </p>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => onDecline(challenge)} style={{ fontSize: 13, fontWeight: 600, padding: '8px 16px', borderRadius: 10, backgroundColor: 'transparent', border: '1px solid rgba(255,255,255,0.12)', color: '#9ca3af', cursor: 'pointer' }}>Decline</button>
        <button onClick={() => onAccept(challenge)} style={{ fontSize: 13, fontWeight: 700, padding: '8px 20px', borderRadius: 10, backgroundColor: '#f97316', border: 'none', color: '#fff', cursor: 'pointer', boxShadow: '0 4px 14px rgba(249,115,22,0.35)' }}>Accept</button>
      </div>
    </div>
  )
}
