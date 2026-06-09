export function StakeCard({ stake, isCompleted, winnerId, userId, opponentName }) {
  let emoji = '⚔️', label = 'On the line', color = '#f97316'
  let bg = 'rgba(249,115,22,0.07)', border = 'rgba(249,115,22,0.2)'

  if (isCompleted && winnerId) {
    if (winnerId === userId) {
      emoji = '🏆'; label = `You won! ${opponentName} owes you`
      color = '#4ade80'; bg = 'rgba(74,222,128,0.07)'; border = 'rgba(74,222,128,0.2)'
    } else {
      emoji = '💀'; label = `You lost! You owe ${opponentName}`
      color = '#f87171'; bg = 'rgba(248,113,113,0.07)'; border = 'rgba(248,113,113,0.2)'
    }
  }

  return (
    <div style={{ borderRadius: 16, padding: '18px 22px', backgroundColor: bg, border: `1px solid ${border}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 20 }}>{emoji}</span>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color }}>{label}</span>
      </div>
      <p style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: 0, lineHeight: 1.4 }}>{stake}</p>
    </div>
  )
}
