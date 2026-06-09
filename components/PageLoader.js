export function PageLoader({ emoji = '🔥', text = 'Loading…' }) {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#030712', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>{emoji}</div>
        <p style={{ color: '#6b7280', fontSize: 14 }}>{text}</p>
      </div>
    </div>
  )
}
