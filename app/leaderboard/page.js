'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Navbar } from '@/components/Navbar'
import { PageLoader } from '@/components/PageLoader'

export default function LeaderboardPage() {
  const [user, setUser] = useState(null)
  const [tab, setTab] = useState('winners')
  const [winners, setWinners] = useState([])
  const [mostActive, setMostActive] = useState([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }
      setUser(user)

      const { data: rivalries } = await supabase
        .from('rivalries')
        .select('user_id, user_wins, total_challenges')

      if (!rivalries || rivalries.length === 0) {
        setLoading(false)
        return
      }

      // Aggregate per user
      const winMap = {}
      const activeMap = {}
      for (const r of rivalries) {
        winMap[r.user_id] = (winMap[r.user_id] ?? 0) + (r.user_wins ?? 0)
        activeMap[r.user_id] = (activeMap[r.user_id] ?? 0) + (r.total_challenges ?? 0)
      }

      const allUserIds = [...new Set(rivalries.map(r => r.user_id))]
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar')
        .in('id', allUserIds)

      const profileMap = {}
      for (const p of profiles ?? []) profileMap[p.id] = p

      const buildList = (map) =>
        Object.entries(map)
          .map(([uid, stat]) => ({ uid, stat, profile: profileMap[uid] ?? null }))
          .sort((a, b) => b.stat - a.stat)
          .slice(0, 20)

      setWinners(buildList(winMap))
      setMostActive(buildList(activeMap))
      setLoading(false)
    }
    load()
  }, [router])

  const rows = tab === 'winners' ? winners : mostActive
  const statLabel = tab === 'winners' ? 'wins' : 'challenges'

  if (loading) return <PageLoader emoji="🏆" text="Loading leaderboard…" />

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#030712', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
      <Navbar backHref="/dashboard" backLabel="← Dashboard" />

      <main style={{ maxWidth: 720, margin: '0 auto', padding: '36px 20px 80px' }}>

        <h1 style={{ fontSize: 26, fontWeight: 800, margin: '0 0 28px', letterSpacing: '-0.02em' }}>
          Leaderboard 🏆
        </h1>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 28, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 4 }}>
          {[
            { key: 'winners', label: 'Top Winners' },
            { key: 'active', label: 'Most Active' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                flex: 1, padding: '9px 16px', borderRadius: 9, border: 'none',
                fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                backgroundColor: tab === key ? '#f97316' : 'transparent',
                color: tab === key ? '#fff' : '#6b7280',
                boxShadow: tab === key ? '0 2px 8px rgba(249,115,22,0.35)' : 'none',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {rows.length === 0 ? (
          <div style={{
            backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 20, padding: '60px 24px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🏆</div>
            <p style={{ color: '#6b7280', fontSize: 15, margin: 0 }}>Not enough data yet — start challenging people!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {rows.map(({ uid, stat, profile }, i) => {
              const rank = i + 1
              const isMe = uid === user?.id
              const username = profile?.username ? `@${profile.username}` : uid.slice(0, 8)
              const avatar = profile?.avatar || '🔥'
              return (
                <div
                  key={uid}
                  style={{
                    backgroundColor: isMe ? 'rgba(249,115,22,0.08)' : '#0f172a',
                    border: isMe ? '1px solid rgba(249,115,22,0.3)' : '1px solid rgba(255,255,255,0.07)',
                    borderRadius: 14, padding: '16px 20px',
                    display: 'flex', alignItems: 'center', gap: 16,
                  }}
                >
                  <div style={{ minWidth: 32, textAlign: 'center' }}>
                    {rank === 1
                      ? <span style={{ fontSize: 20 }}>👑</span>
                      : <span style={{ fontSize: 15, fontWeight: 800, color: rank <= 3 ? '#f97316' : '#4b5563' }}>#{rank}</span>
                    }
                  </div>
                  <span style={{ fontSize: 24, lineHeight: 1 }}>{avatar}</span>
                  <span style={{
                    flex: 1, fontSize: 15, fontWeight: isMe ? 700 : 500,
                    color: isMe ? '#f97316' : '#fff',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {username}
                    {isMe && <span style={{ fontSize: 11, color: '#f97316', marginLeft: 8, fontWeight: 600 }}>you</span>}
                  </span>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: 20, fontWeight: 800, color: isMe ? '#f97316' : '#fff' }}>{stat}</span>
                    <span style={{ fontSize: 12, color: '#4b5563', marginLeft: 4 }}>{statLabel}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
