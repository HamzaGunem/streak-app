import Link from 'next/link'

export function WinnerBanner({ iWon, iLost, isTied, opponentName, myCompletions, oppCompletions, totalElapsed, rematchUrl }) {
  if (iWon) return (
    <div style={{ borderRadius: 20, padding: '32px 24px', textAlign: 'center', background: 'linear-gradient(135deg, rgba(249,115,22,0.15), rgba(234,179,8,0.1))', border: '1px solid rgba(249,115,22,0.35)' }}>
      <div style={{ fontSize: 52, marginBottom: 12 }}>🏆</div>
      <h2 style={{ fontSize: 28, fontWeight: 900, margin: '0 0 8px', color: '#f97316', letterSpacing: '-0.02em' }}>YOU WON!</h2>
      <p style={{ color: '#9ca3af', fontSize: 15, margin: '0 0 20px' }}>You beat {opponentName} with {myCompletions}/{totalElapsed} check-ins</p>
      <Link href={rematchUrl} style={{ display: 'inline-block', padding: '11px 28px', borderRadius: 12, backgroundColor: '#f97316', color: '#fff', fontWeight: 700, fontSize: 14, textDecoration: 'none', boxShadow: '0 6px 20px rgba(249,115,22,0.4)' }}>Rematch? ⚔️</Link>
    </div>
  )

  if (iLost) return (
    <div style={{ borderRadius: 20, padding: '32px 24px', textAlign: 'center', backgroundColor: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
      <div style={{ fontSize: 52, marginBottom: 12 }}>💀</div>
      <h2 style={{ fontSize: 28, fontWeight: 900, margin: '0 0 8px', color: '#f87171', letterSpacing: '-0.02em' }}>You Lost</h2>
      <p style={{ color: '#9ca3af', fontSize: 15, margin: '0 0 6px' }}>Better luck next time</p>
      <p style={{ color: '#6b7280', fontSize: 13, margin: '0 0 20px' }}>{opponentName} had {oppCompletions} check-ins vs your {myCompletions}</p>
      <Link href={rematchUrl} style={{ display: 'inline-block', padding: '11px 28px', borderRadius: 12, backgroundColor: 'transparent', color: '#f87171', fontWeight: 700, fontSize: 14, textDecoration: 'none', border: '1px solid rgba(239,68,68,0.35)' }}>Rematch? ⚔️</Link>
    </div>
  )

  if (isTied) return (
    <div style={{ borderRadius: 20, padding: '32px 24px', textAlign: 'center', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}>
      <div style={{ fontSize: 52, marginBottom: 12 }}>🤝</div>
      <h2 style={{ fontSize: 28, fontWeight: 900, margin: '0 0 8px', color: '#9ca3af', letterSpacing: '-0.02em' }}>It&apos;s a Tie!</h2>
      <p style={{ color: '#6b7280', fontSize: 14, margin: '0 0 20px' }}>Both of you had {myCompletions} check-ins</p>
      <Link href={rematchUrl} style={{ display: 'inline-block', padding: '11px 28px', borderRadius: 12, backgroundColor: 'transparent', color: '#9ca3af', fontWeight: 700, fontSize: 14, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.12)' }}>Rematch? ⚔️</Link>
    </div>
  )

  return null
}
