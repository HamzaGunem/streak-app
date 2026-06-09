import { toDateStr } from '@/lib/utils'

function buildCalendarRows(days) {
  if (!days.length) return []
  const firstDow = new Date(days[0] + 'T00:00:00').getDay()
  const cells = [...Array(firstDow).fill(null), ...days]
  while (cells.length % 7 !== 0) cells.push(null)
  const rows = []
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7))
  return rows
}

export function CheckinCalendar({ start, endDate, myDates, oppDates, opponentName }) {
  const todayStr = toDateStr(new Date())
  const calendarEnd = endDate && endDate < todayStr ? endDate : todayStr
  const days = []
  if (start) {
    const cur = new Date(start)
    while (toDateStr(cur) <= calendarEnd) { days.push(toDateStr(cur)); cur.setDate(cur.getDate() + 1) }
  }
  const rows = buildCalendarRows(days)

  return (
    <div style={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: '24px 20px' }}>
      <h2 style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#f97316', margin: '0 0 16px' }}>Check-in History</h2>
      <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        {[{ color: '#22c55e', shadow: 'rgba(34,197,94,0.5)', label: 'You' }, { color: '#3b82f6', shadow: 'rgba(59,130,246,0.5)', label: opponentName }, { color: 'rgba(255,255,255,0.1)', shadow: 'none', label: 'Missed' }].map(({ color, shadow, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: color, boxShadow: shadow !== 'none' ? `0 0 6px ${shadow}` : 'none' }} />
            <span style={{ fontSize: 12, color: '#6b7280' }}>{label}</span>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, marginBottom: 3 }}>
        {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => <div key={d} style={{ textAlign: 'center', fontSize: 10, color: '#374151', fontWeight: 600, padding: '2px 0' }}>{d}</div>)}
      </div>
      {rows.map((row, ri) => (
        <div key={ri} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, marginBottom: 3 }}>
          {row.map((day, ci) => {
            if (!day) return <div key={ci} style={{ minHeight: 54 }} />
            const isToday = day === todayStr
            return (
              <div key={day} style={{ borderRadius: 8, padding: '6px 2px', backgroundColor: isToday ? 'rgba(249,115,22,0.1)' : 'rgba(255,255,255,0.02)', border: isToday ? '1px solid rgba(249,115,22,0.5)' : '1px solid rgba(255,255,255,0.04)', minHeight: 54, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                <span style={{ fontSize: 10, lineHeight: 1, color: isToday ? '#f97316' : '#374151', fontWeight: isToday ? 700 : 400 }}>{parseInt(day.split('-')[2], 10)}</span>
                <div style={{ display: 'flex', gap: 3 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: myDates.has(day) ? '#22c55e' : 'rgba(255,255,255,0.1)', boxShadow: myDates.has(day) ? '0 0 5px rgba(34,197,94,0.7)' : 'none' }} />
                  <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: oppDates.has(day) ? '#3b82f6' : 'rgba(255,255,255,0.1)', boxShadow: oppDates.has(day) ? '0 0 5px rgba(59,130,246,0.7)' : 'none' }} />
                </div>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
