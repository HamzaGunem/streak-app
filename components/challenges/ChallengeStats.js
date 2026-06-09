export function ChallengeStats({ myLabel, oppLabel, myCompletions, oppCompletions, myStreak, oppStreak, myCompPct, oppCompPct, totalElapsed }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      {[
        { label: myLabel,  completions: myCompletions,  compPct: myCompPct,  streak: myStreak,  isYou: true  },
        { label: oppLabel, completions: oppCompletions, compPct: oppCompPct, streak: oppStreak, isYou: false },
      ].map(({ label, completions, compPct, streak, isYou }) => (
        <div key={label} style={{ backgroundColor: '#0f172a', border: isYou ? '1px solid rgba(249,115,22,0.2)' : '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: 20, position: 'relative', overflow: 'hidden' }}>
          {isYou && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, #ea580c, #f97316)' }} />}
          <p style={{ fontSize: 13, fontWeight: 700, color: isYou ? '#f97316' : '#6b7280', margin: '0 0 14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '0.02em' }}>{label}</p>
          <div style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
              <span style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1 }}>{completions}</span>
              <span style={{ fontSize: 14, color: '#374151', fontWeight: 500 }}>/{totalElapsed}</span>
            </div>
            <p style={{ color: '#374151', fontSize: 12, margin: '3px 0 0' }}>days completed</p>
          </div>
          <div style={{ height: 3, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 100, overflow: 'hidden', marginBottom: 12 }}>
            <div style={{ height: '100%', width: `${compPct}%`, backgroundColor: isYou ? '#f97316' : '#4b5563', borderRadius: 100, transition: 'width 0.6s ease' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: '#4b5563' }}>{compPct}% done</span>
            <span style={{ fontSize: 15, fontWeight: 800, color: isYou ? '#f97316' : '#6b7280' }}>{streak} 🔥</span>
          </div>
        </div>
      ))}
    </div>
  )
}
