const COLORS = ['#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#fff']

export function Confetti() {
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 5, overflow: 'hidden' }}>
      <style>{`@keyframes confettiFall{0%{transform:translateY(-60px) rotate(0deg);opacity:1}100%{transform:translateY(110vh) rotate(720deg);opacity:0}}`}</style>
      {Array.from({ length: 24 }, (_, i) => (
        <div key={i} style={{
          position: 'absolute', top: 0,
          left: `${(i * 4.2) % 100}%`,
          width: i % 3 === 0 ? 10 : 7,
          height: i % 3 === 0 ? 10 : 14,
          borderRadius: i % 2 === 0 ? '50%' : 2,
          backgroundColor: COLORS[i % COLORS.length],
          animation: `confettiFall ${2.2 + (i % 5) * 0.4}s ${(i * 0.18) % 2.5}s ease-in forwards`,
        }} />
      ))}
    </div>
  )
}
