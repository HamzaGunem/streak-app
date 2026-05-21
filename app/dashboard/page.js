'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

function toDateStr(date) {
  return date.toISOString().split('T')[0]
}

function calculateStreak(completions) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const completedDates = new Set(completions.map(c => c.completed_at))
  const todayStr = toDateStr(today)
  const yesterdayStr = toDateStr(yesterday)

  let startDate
  if (completedDates.has(todayStr)) {
    startDate = new Date(today)
  } else if (completedDates.has(yesterdayStr)) {
    startDate = new Date(yesterday)
  } else {
    return 0
  }

  let streak = 0
  const current = new Date(startDate)
  while (completedDates.has(toDateStr(current))) {
    streak++
    current.setDate(current.getDate() - 1)
  }
  return streak
}

export default function DashboardPage() {
  const [user, setUser] = useState(null)
  const [habits, setHabits] = useState([])
  const [completions, setCompletions] = useState({})
  const [toggling, setToggling] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const todayStr = toDateStr(new Date())

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/login')
        return
      }
      setUser(user)

      const { data: habitsData } = await supabase
        .from('habits')
        .select('*')
        .order('created_at', { ascending: false })

      const habits = habitsData ?? []
      setHabits(habits)

      if (habits.length > 0) {
        const { data: completionsData } = await supabase
          .from('completions')
          .select('habit_id, completed_at')
          .eq('user_id', user.id)
          .in('habit_id', habits.map(h => h.id))

        const map = {}
        for (const h of habits) map[h.id] = []
        for (const c of completionsData ?? []) {
          if (map[c.habit_id]) map[c.habit_id].push(c)
        }
        setCompletions(map)
      }

      setLoading(false)
    }
    load()
  }, [router])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  async function toggleCompletion(habit) {
    if (toggling.has(habit.id)) return
    setToggling(prev => new Set(prev).add(habit.id))

    const supabase = createClient()
    const habitCompletions = completions[habit.id] ?? []
    const completedToday = habitCompletions.some(c => c.completed_at === todayStr)

    if (completedToday) {
      await supabase
        .from('completions')
        .delete()
        .eq('habit_id', habit.id)
        .eq('user_id', user.id)
        .eq('completed_at', todayStr)

      setCompletions(prev => ({
        ...prev,
        [habit.id]: prev[habit.id].filter(c => c.completed_at !== todayStr),
      }))
    } else {
      await supabase
        .from('completions')
        .insert({ habit_id: habit.id, user_id: user.id, completed_at: todayStr })

      setCompletions(prev => ({
        ...prev,
        [habit.id]: [...(prev[habit.id] ?? []), { habit_id: habit.id, completed_at: todayStr }],
      }))
    }

    setToggling(prev => {
      const next = new Set(prev)
      next.delete(habit.id)
      return next
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    )
  }

  const totalStreak = habits.reduce(
    (sum, habit) => sum + calculateStreak(completions[habit.id] ?? []),
    0
  )

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

        {habits.length > 0 && (
          <div className="bg-gray-800 rounded-xl px-6 py-5">
            <p className="text-gray-400 text-sm uppercase tracking-wide font-semibold mb-1">
              Total Streak Score
            </p>
            <p className="text-4xl font-bold text-orange-500">{totalStreak} 🔥</p>
          </div>
        )}

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
              {habits.map((habit) => {
                const habitCompletions = completions[habit.id] ?? []
                const completedToday = habitCompletions.some(c => c.completed_at === todayStr)
                const streak = calculateStreak(habitCompletions)
                const isToggling = toggling.has(habit.id)

                return (
                  <li
                    key={habit.id}
                    className={`bg-gray-800 rounded-xl px-5 py-4 flex items-center justify-between transition-all ${
                      completedToday ? 'border border-green-600/40' : 'border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => toggleCompletion(habit)}
                        disabled={isToggling}
                        aria-label={completedToday ? 'Mark incomplete' : 'Mark complete'}
                        className={`w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                          completedToday
                            ? 'bg-green-500 border-green-500 text-white'
                            : 'border-gray-500 hover:border-orange-500'
                        } ${isToggling ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        {completedToday && (
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={3}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                      <span className={`font-medium ${completedToday ? 'text-green-400' : 'text-white'}`}>
                        {habit.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xl font-bold text-orange-500">{streak}</span>
                      <span className="text-xl">🔥</span>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </main>
    </div>
  )
}
