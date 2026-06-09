import { CHALLENGE_STATUS_MAP } from '@/lib/utils'

export function StatusBadge({ status, style }) {
  const s = CHALLENGE_STATUS_MAP[status] ?? CHALLENGE_STATUS_MAP.pending
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
      color: s.text, backgroundColor: s.bg, border: `1px solid ${s.border}`,
      padding: '5px 14px', borderRadius: 100, flexShrink: 0,
      ...style,
    }}>
      {s.label}
    </span>
  )
}
