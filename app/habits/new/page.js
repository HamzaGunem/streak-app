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
    setLoading(true)

    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.replace('/login')
      return
    }

    const { error: insertError } = await supabase
      .from('habits')
      .insert({ name: name.trim(), user_id: user.id })

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
    }

    router.replace('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors mb-8"
        >
          ← Back to dashboard
        </Link>

        <h1 className="text-3xl font-bold text-white mb-2">New habit</h1>
        <p className="text-gray-400 mb-8">What habit do you want to build?</p>

        <form onSubmit={handleSubmit} className="bg-gray-800 rounded-xl p-8 space-y-5">
          {error && (
            <div className="bg-red-900/40 border border-red-500 text-red-300 text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1.5">
              Habit name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g. Drink water, Exercise, Read 20 pages"
              className="w-full bg-gray-700 text-white rounded-lg px-4 py-2.5 text-sm border border-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent placeholder-gray-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg py-2.5 text-sm transition-colors"
          >
            {loading ? 'Saving...' : 'Add Habit'}
          </button>
        </form>
      </div>
    </div>
  )
}
