'use client'

import Link from 'next/link'

const headerStyle = {
  position: 'sticky', top: 0, zIndex: 50,
  backgroundColor: 'rgba(3,7,18,0.85)',
  backdropFilter: 'blur(16px)',
  borderBottom: '1px solid rgba(255,255,255,0.06)',
}

export function Navbar({ backHref, backLabel = '← Dashboard', maxWidth = 720, right }) {
  return (
    <header style={headerStyle}>
      <div style={{ maxWidth, margin: '0 auto', padding: '0 20px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/dashboard" style={{ fontWeight: 800, fontSize: 20, color: '#f97316', textDecoration: 'none', letterSpacing: '-0.01em' }}>
          Streak 🔥
        </Link>
        {right ?? (backHref && (
          <Link
            href={backHref}
            style={{ fontSize: 13, color: '#6b7280', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}
            onMouseEnter={e => e.currentTarget.style.color = '#fff'}
            onMouseLeave={e => e.currentTarget.style.color = '#6b7280'}
          >
            {backLabel}
          </Link>
        ))}
      </div>
    </header>
  )
}
