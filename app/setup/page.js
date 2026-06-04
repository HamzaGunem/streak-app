'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function SetupPage() {
  const [user, setUser] = useState(null)
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function check() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.replace('/login')
        return
      }

      setUser(user)

      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .maybeSingle()

      if (profile?.username) {
        router.replace('/dashboard')
        return
      }

      setChecking(false)
    }
    check()
  }, [router])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    const trimmed = username.trim()

    if (trimmed.length < 3 || trimmed.length > 20) {
      setError('Username must be between 3 and 20 characters')
      return
    }

    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      setError('Only letters, numbers and underscores are allowed')
      return
    }

    setLoading(true)

    const supabase = createClient()

    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', trimmed)
      .maybeSingle()

    if (existing) {
      setError('Username already taken')
      setLoading(false)
      return
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ username: trimmed })
      .eq('id', user.id)

    if (updateError) {
      setError('Something went wrong. Please try again.')
      setLoading(false)
      return
    }

    router.replace('/dashboard')
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-3">🔥 Welcome to Streak</h1>
          <p className="text-gray-400 text-base leading-relaxed">
            Choose your username.<br />
            This is how your opponents will know you.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-[#111111] border border-white/[0.07] rounded-2xl p-8 space-y-5"
        >
          {error && (
            <div className="bg-red-900/30 border border-red-500/50 text-red-400 text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">
              Username
            </label>
            <div className="flex items-center bg-[#1a1a1a] border border-white/[0.1] rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-orange-500 focus-within:border-transparent transition-shadow">
              <span className="pl-4 pr-2 text-gray-500 font-medium text-sm select-none">@</span>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="your_username"
                autoComplete="off"
                className="flex-1 bg-transparent text-white py-3 pr-4 text-sm focus:outline-none placeholder-gray-600"
              />
            </div>
            <p className="mt-2 text-xs text-gray-600">
              3–20 characters. Letters, numbers and underscores only.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl py-3 text-sm transition-colors shadow-[0_8px_28px_rgba(249,115,22,0.35)]"
          >
            {loading ? 'Saving...' : "Let's Go"}
          </button>
        </form>
      </div>
    </div>
  )
}
