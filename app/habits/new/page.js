'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

export default function NewHabitPage() {
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    const trimmed = name.trim()
    if (!trimmed) { setError('Habit name is required'); return }
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace('/login'); return }
    const { error: insertError } = await supabase
      .from('habits')
      .insert({ name: trimmed, user_id: user.id })
    if (insertError) {
      setError('Something went wrong. Please try again.')
      setLoading(false)
      return
    }
    router.replace('/dashboard')
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#030712', color: '#fff', fontFamily: 'system-ui, sans-serif', display: 'flex', flexDirection: 'column' }}>

      {/* Navbar */}
      <header style={{
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        backgroundColor: 'rgba(3,7,18,0.85)',
        backdropFilter: 'blur(16px)',
      }}>
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 20px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/dashboard" style={{ fontWeight: 800, fontSize: 20, color: '#f97316', textDecoration: 'none', letterSpacing: '-0.01em' }}>
            Streak 🔥
          </Link>
          <Link href="/dashboard" style={{ fontSize: 13, color: '#6b7280', textDecoration: 'none' }}>
            ← Back
          </Link>
        </div>
      </header>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 20px' }}>
        <div style={{ width: '100%', maxWidth: 440 }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <h1 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.02em' }}>New Habit</h1>
            <p style={{ color: '#6b7280', fontSize: 14, margin: 0 }}>Name the habit you want to build.</p>
          </div>

          <form onSubmit={handleSubmit} style={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: 28 }}>
            {error && (
              <div style={{
                backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                color: '#fca5a5', fontSize: 13, padding: '10px 14px', borderRadius: 10, marginBottom: 20,
              }}>
                {error}
              </div>
            )}

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#d1d5db', marginBottom: 8 }}>
                Habit name
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                placeholder="e.g. Run 5km, Read 30 mins, No sugar"
                autoFocus
                style={{
                  width: '100%', boxSizing: 'border-box',
                  backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 12, padding: '12px 16px',
                  fontSize: 15, color: '#fff', outline: 'none',
                  transition: 'border-color 0.15s',
                }}
                onFocus={e => e.target.style.borderColor = '#f97316'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '13px', borderRadius: 12,
                backgroundColor: loading ? 'rgba(249,115,22,0.5)' : '#f97316',
                border: 'none', color: '#fff', fontWeight: 700, fontSize: 15,
                cursor: loading ? 'default' : 'pointer',
                boxShadow: loading ? 'none' : '0 4px 18px rgba(249,115,22,0.38)',
                transition: 'background 0.15s',
              }}
            >
              {loading ? 'Adding…' : 'Add Habit'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
