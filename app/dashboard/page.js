'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

export default function DashboardPage() {
  const [user, setUser] = useState(null)
  const [habits, setHabits] = useState([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const supabase = createClient()

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/login')
        return
      }

      setUser(user)

      const { data: habits } = await supabase
        .from('habits')
        .select('*')
        .order('created_at', { ascending: false })

      setHabits(habits ?? [])
      setLoading(false)
    }

    load()
  }, [router])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">Streak</h1>
          <button
            onClick={handleSignOut}
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-10 space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-white">Welcome back</h2>
          <p className="text-gray-400 mt-1">{user.email}</p>
        </div>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">My Habits</h3>
            <Link
              href="/habits/new"
              className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              Add Habit
            </Link>
          </div>

          {habits.length === 0 ? (
            <div className="bg-gray-800 rounded-xl p-10 text-center">
              <p className="text-gray-400">No habits yet. Add your first habit!</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {habits.map((habit) => (
                <li
                  key={habit.id}
                  className="bg-gray-800 rounded-xl px-5 py-4 flex items-center justify-between"
                >
                  <span className="text-white font-medium">{habit.name}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  )
}
