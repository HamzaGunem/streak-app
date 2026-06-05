'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    const trimmedUsername = username.trim()

    if (trimmedUsername.length < 3 || trimmedUsername.length > 20) {
      setError('Username must be between 3 and 20 characters')
      return
    }

    if (!/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) {
      setError('Username can only contain letters, numbers and underscores')
      return
    }

    setLoading(true)

    const supabase = createClient()

    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', trimmedUsername)
      .maybeSingle()

    if (existing) {
      setError('Username already taken')
      setLoading(false)
      return
    }

    const { data: signUpData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: trimmedUsername,
        },
      },
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    const user = signUpData?.user

    if (user) {
      await supabase
        .from('profiles')
        .upsert(
          { id: user.id, email: email.trim().toLowerCase(), username: trimmedUsername },
          { onConflict: 'id' }
        )
    }

    window.location.replace('/login')
  }

  return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-3">🔥 Join Streak</h1>
          <p className="text-gray-400 text-base leading-relaxed">
            Build habits. Beat your friends.
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
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="w-full bg-[#1a1a1a] text-white rounded-lg px-4 py-3 text-sm border border-white/[0.1] focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent placeholder-gray-600 transition-shadow"
            />
          </div>

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

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full bg-[#1a1a1a] text-white rounded-lg px-4 py-3 text-sm border border-white/[0.1] focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent placeholder-gray-600 transition-shadow"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl py-3 text-sm transition-colors shadow-[0_8px_28px_rgba(249,115,22,0.35)]"
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>

          <p className="text-center text-sm text-gray-400">
            Already have an account?{' '}
            <Link href="/login" className="text-orange-400 hover:text-orange-300 font-medium">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
