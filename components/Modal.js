export function Modal({ onClose, children, maxWidth = 380, textAlign = 'center' }) {
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: 16 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: 32, maxWidth, width: '100%', textAlign }}
      >
        {children}
      </div>
    </div>
  )
}
