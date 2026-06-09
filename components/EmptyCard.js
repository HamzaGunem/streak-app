export function EmptyCard({ children }) {
  return (
    <div style={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '32px 24px', textAlign: 'center', color: '#6b7280', fontSize: 14 }}>
      {children}
    </div>
  )
}
