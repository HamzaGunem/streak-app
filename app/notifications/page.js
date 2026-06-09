'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { timeAgo, toDateStr } from '@/lib/utils'
import { TYPE_CATEGORY } from '@/lib/notifications'
import { Navbar } from '@/components/Navbar'
import { PageLoader } from '@/components/PageLoader'

const ICONS = { challenge_cancelled: '🚫', challenge_won: '🏆', challenge_lost: '💀', challenge_received: '⚔️', challenge_accepted: '✅', challenge_declined: '❌', checkin_done: '🔥', checkin_reminder: '⏰' }
const DEFAULT_SETTINGS = { notify_win_loss: true, notify_checkin: true, notify_challenge_updates: true }
const SETTING_ROWS = [
  { key: 'notify_win_loss',          label: 'Win & loss results',   desc: 'When a challenge ends and there is a winner' },
  { key: 'notify_checkin',           label: 'Check-in confirmations', desc: 'After you check in each day' },
  { key: 'notify_challenge_updates', label: 'Challenge updates',     desc: 'Accepted, declined, and cancelled challenges' },
]

function loadSettings(userId) {
  try { return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(`notif_settings_${userId}`) ?? '{}') } }
  catch { return { ...DEFAULT_SETTINGS } }
}
function saveSettings(userId, s) { try { localStorage.setItem(`notif_settings_${userId}`, JSON.stringify(s)) } catch {} }

function NotifCard({ notif, onRead }) {
  const unread = !notif.read
  return (
    <div onClick={() => onRead(notif)} style={{ backgroundColor: unread ? '#0f172a' : 'rgba(15,23,42,0.5)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: unread ? '3px solid #f97316' : '3px solid transparent', borderRadius: 14, padding: '16px 18px', display: 'flex', alignItems: 'flex-start', gap: 14, cursor: unread ? 'pointer' : 'default', transition: 'background-color 0.15s' }}
      onMouseEnter={e => { if (unread) e.currentTarget.style.backgroundColor = '#1e293b' }}
      onMouseLeave={e => { e.currentTarget.style.backgroundColor = unread ? '#0f172a' : 'rgba(15,23,42,0.5)' }}>
      <span style={{ fontSize: 22, lineHeight: 1, flexShrink: 0, marginTop: 1 }}>{ICONS[notif.type] ?? '🔔'}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 3 }}>
          <p style={{ fontWeight: unread ? 700 : 500, fontSize: 14, margin: 0, color: unread ? '#fff' : '#9ca3af' }}>{notif.title}</p>
          <span style={{ fontSize: 11, color: '#4b5563', flexShrink: 0 }}>{timeAgo(notif.created_at)}</span>
        </div>
        <p style={{ fontSize: 13, color: '#6b7280', margin: 0, lineHeight: 1.5 }}>{notif.message}</p>
      </div>
      {unread && <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#f97316', flexShrink: 0, marginTop: 6 }} />}
    </div>
  )
}

export default function NotificationsPage() {
  const [userId, setUserId] = useState(null)
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [markingAll, setMarkingAll] = useState(false)
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [showSettings, setShowSettings] = useState(false)
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }
      setUserId(user.id)
      setSettings(loadSettings(user.id))
      const { data } = await supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
      setNotifications(data ?? [])
      setLoading(false)
    }
    load()
  }, [router])

  function toggleSetting(key) {
    const next = { ...settings, [key]: !settings[key] }
    setSettings(next); saveSettings(userId, next)
  }

  async function markRead(notif) {
    if (notif.read) return
    const supabase = createClient()
    await supabase.from('notifications').update({ read: true }).eq('id', notif.id)
    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n))
  }

  async function markAllRead() {
    setMarkingAll(true)
    const supabase = createClient()
    const unreadIds = visibleNotifs.filter(n => !n.read).map(n => n.id)
    if (unreadIds.length > 0) {
      await supabase.from('notifications').update({ read: true }).in('id', unreadIds)
      setNotifications(prev => prev.map(n => unreadIds.includes(n.id) ? { ...n, read: true } : n))
    }
    setMarkingAll(false)
  }

  const visibleNotifs = notifications.filter(n => { const cat = TYPE_CATEGORY[n.type]; return cat ? settings[cat] : true })
  const todayStr = toDateStr(new Date())
  const todayNotifs   = visibleNotifs.filter(n => n.created_at?.slice(0, 10) === todayStr)
  const earlierNotifs = visibleNotifs.filter(n => n.created_at?.slice(0, 10) !== todayStr)
  const unreadCount   = visibleNotifs.filter(n => !n.read).length

  if (loading) return <PageLoader emoji="🔔" text="Loading notifications…" />

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#030712', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
      <Navbar backHref="/dashboard" />
      <main style={{ maxWidth: 720, margin: '0 auto', padding: '36px 20px 80px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32, gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, margin: '0 0 4px', letterSpacing: '-0.02em' }}>Notifications 🔔</h1>
            {unreadCount > 0 && <p style={{ color: '#6b7280', fontSize: 13, margin: 0 }}>{unreadCount} unread</p>}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowSettings(s => !s)} style={{ fontSize: 13, fontWeight: 600, padding: '8px 14px', borderRadius: 10, backgroundColor: showSettings ? 'rgba(255,255,255,0.08)' : 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#9ca3af', cursor: 'pointer' }}>⚙️ Settings</button>
            {unreadCount > 0 && <button onClick={markAllRead} disabled={markingAll} style={{ fontSize: 13, fontWeight: 600, padding: '8px 16px', borderRadius: 10, backgroundColor: 'transparent', border: '1px solid rgba(249,115,22,0.35)', color: '#f97316', cursor: 'pointer' }}>{markingAll ? 'Marking…' : 'Mark all read'}</button>}
          </div>
        </div>

        {showSettings && (
          <div style={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '20px 24px', marginBottom: 28 }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6b7280', margin: '0 0 16px' }}>Notification Preferences</p>
            {SETTING_ROWS.map((row, i) => (
              <div key={row.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '14px 0', borderBottom: i < SETTING_ROWS.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                <div>
                  <p style={{ fontWeight: 600, fontSize: 14, margin: '0 0 2px', color: '#fff' }}>{row.label}</p>
                  <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>{row.desc}</p>
                </div>
                <button onClick={() => toggleSetting(row.key)} style={{ flexShrink: 0, width: 44, height: 24, borderRadius: 100, border: 'none', cursor: 'pointer', backgroundColor: settings[row.key] ? '#f97316' : 'rgba(255,255,255,0.12)', position: 'relative', transition: 'background-color 0.2s', padding: 0 }}>
                  <div style={{ position: 'absolute', top: 3, left: settings[row.key] ? 23 : 3, width: 18, height: 18, borderRadius: '50%', backgroundColor: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.4)' }} />
                </button>
              </div>
            ))}
          </div>
        )}

        {visibleNotifs.length === 0 ? (
          <div style={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 20, padding: '60px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔔</div>
            <p style={{ color: '#6b7280', fontSize: 15, margin: 0 }}>No notifications yet</p>
          </div>
        ) : (
          <>
            {todayNotifs.length > 0 && <section style={{ marginBottom: 32 }}><p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6b7280', marginBottom: 12 }}>Today</p><div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{todayNotifs.map(n => <NotifCard key={n.id} notif={n} onRead={markRead} />)}</div></section>}
            {earlierNotifs.length > 0 && <section><p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6b7280', marginBottom: 12 }}>Earlier</p><div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{earlierNotifs.map(n => <NotifCard key={n.id} notif={n} onRead={markRead} />)}</div></section>}
          </>
        )}
      </main>
    </div>
  )
}
