'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

function toDateStr(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return year + '-' + month + '-' + day
}

function calculateStreak(checkins, userId) {
  if (!checkins || checkins.length === 0) return 0
  const userCheckins = checkins.filter(c => c.user_id === userId)
  if (userCheckins.length === 0) return 0
  const today = new Date()
  const todayStr = toDateStr(today)
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = toDateStr(yesterday)
  const dates = new Set(userCheckins.map(c => c.checkin_date))
  if (!dates.has(todayStr) && !dates.has(yesterdayStr)) return 0
  const startStr = dates.has(todayStr) ? todayStr : yesterdayStr
  let streak = 0
  const current = new Date(startStr)
  while (dates.has(toDateStr(current))) {
    streak++
    current.setDate(current.getDate() - 1)
  }
  return streak
}

function buildCalendarRows(calendarDays) {
  if (calendarDays.length === 0) return []
  const firstDay = new Date(calendarDays[0] + 'T00:00:00')
  const firstDow = firstDay.getDay()
  const cells = []
  for (let i = 0; i < firstDow; i++) cells.push(null)
  for (const d of calendarDays) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)
  const rows = []
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7))
  return rows
}

export default function ChallengeDetailPage({ params }) {
  const { id } = use(params)
  const [user, setUser] = useState(null)
  const [myProfile, setMyProfile] = useState(null)
  const [challenge, setChallenge] = useState(null)
  const [opponentProfile, setOpponentProfile] = useState(null)
  const [checkins, setCheckins] = useState([])
  const [loading, setLoading] = useState(true)
  const [checkingIn, setCheckingIn] = useState(false)
  const router = useRouter()
  const todayStr = toDateStr(new Date())

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }
      setUser(user)

      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, username, email')
        .eq('id', user.id)
        .maybeSingle()
      setMyProfile(profileData)

      const { data: challengeData } = await supabase
        .from('habit_challenges')
        .select('*')
        .eq('id', id)
        .maybeSingle()

      if (!challengeData) { router.replace('/dashboard'); return }

      if (challengeData.challenger_id !== user.id && challengeData.opponent_id !== user.id) {
        router.replace('/dashboard')
        return
      }

      setChallenge(challengeData)

      const opponentId = challengeData.challenger_id === user.id
        ? challengeData.opponent_id
        : challengeData.challenger_id

      const [{ data: oppProfile }, { data: checkinsData }] = await Promise.all([
        supabase.from('profiles').select('id, username, email').eq('id', opponentId).maybeSingle(),
        supabase.from('challenge_checkins').select('*').eq('challenge_id', id),
      ])

      setOpponentProfile(oppProfile)
      setCheckins(checkinsData ?? [])
      setLoading(false)
    }
    load()
  }, [id, router])

  async function handleCheckIn() {
    if (checkingIn) return
    setCheckingIn(true)
    const supabase = createClient()
    const { data: newCheckin } = await supabase
      .from('challenge_checkins')
      .insert({ challenge_id: id, user_id: user.id, checkin_date: todayStr })
      .select()
      .single()
    if (newCheckin) {
      setCheckins(prev => [...prev, newCheckin])
    }
    setCheckingIn(false)
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#030712', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🔥</div>
          <p style={{ color: '#6b7280', fontSize: 14 }}>Loading challenge…</p>
        </div>
      </div>
    )
  }

  if (!challenge || !user) return null

  const opponentId = challenge.challenger_id === user.id ? challenge.opponent_id : challenge.challenger_id

  const myCheckins = checkins.filter(c => c.user_id === user.id)
  const oppCheckins = checkins.filter(c => c.user_id === opponentId)
  const myDates = new Set(myCheckins.map(c => c.checkin_date))
  const oppDates = new Set(oppCheckins.map(c => c.checkin_date))

  const myDisplayName = myProfile?.username ? `@${myProfile.username}` : (user.email ?? 'You')
  const opponentName = opponentProfile?.username ? `@${opponentProfile.username}` : (opponentProfile?.email ?? 'Opponent')

  const statusMap = {
    active:    { bg: 'rgba(249,115,22,0.1)',  border: 'rgba(249,115,22,0.25)',  text: '#f97316',  label: 'Active'    },
    pending:   { bg: 'rgba(234,179,8,0.1)',   border: 'rgba(234,179,8,0.25)',   text: '#eab308',  label: 'Pending'   },
    completed: { bg: 'rgba(22,163,74,0.1)',   border: 'rgba(22,163,74,0.3)',    text: '#4ade80',  label: 'Completed' },
    declined:  { bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.25)',   text: '#ef4444',  label: 'Declined'  },
  }
  const statusStyle = statusMap[challenge.status] ?? statusMap.pending

  const today = new Date()
  const start = challenge.start_date ? new Date(challenge.start_date + 'T00:00:00') : null
  const dayX = start ? Math.max(1, Math.floor((today - start) / 86400000) + 1) : 1
  const dayTotal = challenge.duration_days ?? 30
  const dayDisplay = Math.min(dayX, dayTotal)
  const pct = Math.min(100, Math.round((dayDisplay / dayTotal) * 100))

  const iCheckedIn = myDates.has(todayStr)

  // Calendar: show from start to today (or end_date if completed)
  const calendarEndStr = challenge.end_date && challenge.end_date < todayStr
    ? challenge.end_date
    : todayStr
  const calendarDays = []
  if (start) {
    const cur = new Date(start)
    while (toDateStr(cur) <= calendarEndStr) {
      calendarDays.push(toDateStr(cur))
      cur.setDate(cur.getDate() + 1)
    }
  }
  const calendarRows = buildCalendarRows(calendarDays)

  const totalElapsed = start ? Math.max(1, Math.min(dayX, dayTotal)) : 1
  const myCompletions = myCheckins.length
  const oppCompletions = oppCheckins.length
  const myCompPct = Math.round((myCompletions / totalElapsed) * 100)
  const oppCompPct = Math.round((oppCompletions / totalElapsed) * 100)
  const myStreak = calculateStreak(checkins, user.id)
  const oppStreak = calculateStreak(checkins, opponentId)

  let winnerText, winnerColor, winnerBg, winnerBorder
  if (myCompletions > oppCompletions) {
    winnerText = '🏆 You are currently winning'
    winnerColor = '#f97316'
    winnerBg = 'rgba(249,115,22,0.07)'
    winnerBorder = 'rgba(249,115,22,0.2)'
  } else if (oppCompletions > myCompletions) {
    winnerText = `🏆 ${opponentName} is currently winning`
    winnerColor = '#f87171'
    winnerBg = 'rgba(239,68,68,0.06)'
    winnerBorder = 'rgba(239,68,68,0.15)'
  } else {
    winnerText = "🤝 It's a tie!"
    winnerColor = '#9ca3af'
    winnerBg = 'rgba(255,255,255,0.03)'
    winnerBorder = 'rgba(255,255,255,0.08)'
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#030712', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>

      {/* Navbar */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        backgroundColor: 'rgba(3,7,18,0.85)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 20px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/dashboard" style={{ fontWeight: 800, fontSize: 20, color: '#f97316', textDecoration: 'none', letterSpacing: '-0.01em' }}>
            Streak 🔥
          </Link>
          <Link
            href="/dashboard"
            style={{ fontSize: 13, color: '#6b7280', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6, transition: 'color 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.color = '#fff'}
            onMouseLeave={e => e.currentTarget.style.color = '#6b7280'}
          >
            ← Dashboard
          </Link>
        </div>
      </header>

      <main style={{ maxWidth: 720, margin: '0 auto', padding: '36px 20px 80px' }}>

        {/* ── HEADER SECTION ── */}
        <section style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 6 }}>
            <h1 style={{ fontSize: 30, fontWeight: 800, margin: 0, letterSpacing: '-0.025em', lineHeight: 1.15 }}>
              {challenge.habit_name}
            </h1>
            <span style={{
              flexShrink: 0,
              fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
              color: statusStyle.text,
              backgroundColor: statusStyle.bg,
              border: `1px solid ${statusStyle.border}`,
              padding: '5px 14px', borderRadius: 100,
              marginTop: 4,
            }}>
              {statusStyle.label}
            </span>
          </div>

          <p style={{ color: '#6b7280', fontSize: 15, margin: '0 0 20px' }}>
            vs {opponentName}
          </p>

          {start && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, marginBottom: 8 }}>
                <span style={{ color: '#6b7280' }}>Day {dayDisplay} of {dayTotal}</span>
                <span style={{ color: '#f97316', fontWeight: 700 }}>{pct}%</span>
              </div>
              <div style={{ height: 8, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 100, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${pct}%`,
                  background: 'linear-gradient(90deg, #ea580c, #f97316)',
                  borderRadius: 100,
                  boxShadow: '0 0 16px rgba(249,115,22,0.45)',
                  transition: 'width 0.6s ease',
                }} />
              </div>
            </div>
          )}
        </section>

        {/* ── CHECK IN BUTTON ── */}
        {challenge.status === 'active' && (
          <section style={{ marginBottom: 32 }}>
            {iCheckedIn ? (
              <button disabled style={{
                width: '100%', padding: '17px', borderRadius: 16,
                backgroundColor: 'rgba(22,163,74,0.1)', border: '1px solid rgba(22,163,74,0.25)',
                color: '#4ade80', fontWeight: 700, fontSize: 16, cursor: 'default',
                letterSpacing: '0.01em',
              }}>
                Checked In Today ✅
              </button>
            ) : (
              <button
                onClick={handleCheckIn}
                disabled={checkingIn}
                style={{
                  width: '100%', padding: '17px', borderRadius: 16,
                  background: checkingIn ? 'rgba(249,115,22,0.5)' : 'linear-gradient(135deg, #ea580c, #f97316)',
                  border: 'none', color: '#fff', fontWeight: 700, fontSize: 16,
                  cursor: checkingIn ? 'default' : 'pointer',
                  boxShadow: checkingIn ? 'none' : '0 8px 28px rgba(249,115,22,0.45)',
                  transition: 'all 0.15s', letterSpacing: '0.01em',
                }}
                onMouseEnter={e => { if (!checkingIn) e.currentTarget.style.boxShadow = '0 10px 36px rgba(249,115,22,0.6)' }}
                onMouseLeave={e => { if (!checkingIn) e.currentTarget.style.boxShadow = '0 8px 28px rgba(249,115,22,0.45)' }}
              >
                {checkingIn ? 'Checking in…' : 'Check In Today 🔥'}
              </button>
            )}
          </section>
        )}

        {/* ── CALENDAR SECTION ── */}
        {start && calendarDays.length > 0 && (
          <section style={{ marginBottom: 32 }}>
            <div style={{
              backgroundColor: '#0f172a',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 20,
              padding: '24px 20px',
            }}>
              <h2 style={{
                fontSize: 11, fontWeight: 700, letterSpacing: '0.12em',
                textTransform: 'uppercase', color: '#f97316', margin: '0 0 16px',
              }}>
                Check-in History
              </h2>

              {/* Legend */}
              <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#22c55e', boxShadow: '0 0 6px rgba(34,197,94,0.5)' }} />
                  <span style={{ fontSize: 12, color: '#6b7280' }}>You</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#3b82f6', boxShadow: '0 0 6px rgba(59,130,246,0.5)' }} />
                  <span style={{ fontSize: 12, color: '#6b7280' }}>{opponentName}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.1)' }} />
                  <span style={{ fontSize: 12, color: '#4b5563' }}>Missed</span>
                </div>
              </div>

              {/* Day-of-week headers */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, marginBottom: 3 }}>
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                  <div key={d} style={{ textAlign: 'center', fontSize: 10, color: '#374151', fontWeight: 600, padding: '2px 0' }}>
                    {d}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              {calendarRows.map((row, rowIdx) => (
                <div key={rowIdx} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, marginBottom: 3 }}>
                  {row.map((day, colIdx) => {
                    if (!day) return <div key={colIdx} style={{ minHeight: 54 }} />
                    const isToday = day === todayStr
                    const iMeChecked = myDates.has(day)
                    const theyChecked = oppDates.has(day)
                    const dayNum = parseInt(day.split('-')[2], 10)
                    return (
                      <div
                        key={day}
                        style={{
                          borderRadius: 8,
                          padding: '6px 2px',
                          backgroundColor: isToday ? 'rgba(249,115,22,0.1)' : 'rgba(255,255,255,0.02)',
                          border: isToday ? '1px solid rgba(249,115,22,0.5)' : '1px solid rgba(255,255,255,0.04)',
                          minHeight: 54,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 4,
                        }}
                      >
                        <span style={{
                          fontSize: 10, lineHeight: 1,
                          color: isToday ? '#f97316' : '#374151',
                          fontWeight: isToday ? 700 : 400,
                        }}>
                          {dayNum}
                        </span>
                        <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                          <div style={{
                            width: 8, height: 8, borderRadius: '50%',
                            backgroundColor: iMeChecked ? '#22c55e' : 'rgba(255,255,255,0.1)',
                            boxShadow: iMeChecked ? '0 0 5px rgba(34,197,94,0.7)' : 'none',
                            transition: 'background-color 0.15s',
                          }} />
                          <div style={{
                            width: 8, height: 8, borderRadius: '50%',
                            backgroundColor: theyChecked ? '#3b82f6' : 'rgba(255,255,255,0.1)',
                            boxShadow: theyChecked ? '0 0 5px rgba(59,130,246,0.7)' : 'none',
                            transition: 'background-color 0.15s',
                          }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── STATS SECTION ── */}
        {start && (
          <section style={{ marginBottom: 32 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {[
                { label: myDisplayName, completions: myCompletions, compPct: myCompPct, streak: myStreak, isYou: true },
                { label: opponentName,  completions: oppCompletions, compPct: oppCompPct, streak: oppStreak, isYou: false },
              ].map(({ label, completions, compPct, streak, isYou }) => (
                <div key={label} style={{
                  backgroundColor: '#0f172a',
                  border: isYou ? '1px solid rgba(249,115,22,0.2)' : '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 20,
                  padding: '20px',
                  position: 'relative',
                  overflow: 'hidden',
                }}>
                  {isYou && (
                    <div style={{
                      position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                      background: 'linear-gradient(90deg, #ea580c, #f97316)',
                    }} />
                  )}

                  <p style={{
                    fontSize: 13, fontWeight: 700,
                    color: isYou ? '#f97316' : '#6b7280',
                    margin: '0 0 14px',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    letterSpacing: '0.02em',
                  }}>
                    {label}
                  </p>

                  <div style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
                      <span style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1 }}>
                        {completions}
                      </span>
                      <span style={{ fontSize: 14, color: '#374151', fontWeight: 500 }}>
                        /{totalElapsed}
                      </span>
                    </div>
                    <p style={{ color: '#374151', fontSize: 12, margin: '3px 0 0' }}>days completed</p>
                  </div>

                  <div style={{ height: 3, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 100, overflow: 'hidden', marginBottom: 12 }}>
                    <div style={{
                      height: '100%',
                      width: `${compPct}%`,
                      backgroundColor: isYou ? '#f97316' : '#4b5563',
                      borderRadius: 100,
                      transition: 'width 0.6s ease',
                    }} />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: '#4b5563' }}>{compPct}% done</span>
                    <span style={{
                      fontSize: 15, fontWeight: 800,
                      color: isYou ? '#f97316' : '#6b7280',
                    }}>
                      {streak} 🔥
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── WINNER BANNER ── */}
        {start && (
          <section>
            <div style={{
              borderRadius: 16,
              padding: '18px 24px',
              backgroundColor: winnerBg,
              border: `1px solid ${winnerBorder}`,
              textAlign: 'center',
              fontWeight: 700,
              fontSize: 16,
              color: winnerColor,
              letterSpacing: '0.01em',
            }}>
              {winnerText}
            </div>
          </section>
        )}

      </main>
    </div>
  )
}
