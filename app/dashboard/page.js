'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

function toDateStr(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function calculateStreak(completions) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const completedDates = new Set(completions.map(c => c.completed_date))
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
  const [habitToDelete, setHabitToDelete] = useState(null)
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
          .select('habit_id, completed_date')
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

  async function confirmDeleteHabit() {
    const habit = habitToDelete
    setHabitToDelete(null)
    const supabase = createClient()
    await supabase.from('habits').delete().eq('id', habit.id)
    setHabits(prev => prev.filter(h => h.id !== habit.id))
    setCompletions(prev => {
      const next = { ...prev }
      delete next[habit.id]
      return next
    })
  }

  async function toggleCompletion(habit) {
    if (toggling.has(habit.id)) return
    setToggling(prev => new Set(prev).add(habit.id))

    const supabase = createClient()
    const habitCompletions = completions[habit.id] ?? []
    const completedToday = habitCompletions.some(c => c.completed_date === todayStr)

    if (completedToday) {
      await supabase
        .from('completions')
        .delete()
        .eq('habit_id', habit.id)
        .eq('user_id', user.id)
        .eq('completed_date', todayStr)

      setCompletions(prev => ({
        ...prev,
        [habit.id]: prev[habit.id].filter(c => c.completed_date !== todayStr),
      }))
    } else {
      await supabase
        .from('completions')
        .insert({ habit_id: habit.id, user_id: user.id, completed_date: todayStr })

      setCompletions(prev => ({
        ...prev,
        [habit.id]: [...(prev[habit.id] ?? []), { habit_id: habit.id, completed_date: todayStr }],
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
                const completedToday = habitCompletions.some(c => c.completed_date === todayStr)
                const streak = calculateStreak(habitCompletions)
                const isToggling = toggling.has(habit.id)

                return (
                  <li
                    key={habit.id}
                    className={`group bg-gray-800 rounded-xl px-5 py-4 flex items-center justify-between transition-all ${
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
                    <div className="flex items-center gap-3">
                      <span className="text-xl font-bold text-orange-500">{streak}</span>
                      <span className="text-xl">🔥</span>
                      <button
                        onClick={() => setHabitToDelete(habit)}
                        aria-label="Delete habit"
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-400 p-1"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </main>

      {habitToDelete && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4"
          onClick={() => setHabitToDelete(null)}
        >
          <div
            className="bg-gray-800 rounded-2xl p-8 max-w-sm w-full flex flex-col items-center gap-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center">
              <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white">Delete Habit</h2>
            <p className="text-gray-400 text-center text-sm">
              Are you sure you want to delete{' '}
              <span className="text-orange-500 font-semibold">{habitToDelete.name}</span>
              ? All your streak data will be lost forever.
            </p>
            <div className="flex gap-3 w-full mt-2">
              <button
                onClick={() => setHabitToDelete(null)}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-600 text-gray-300 hover:text-white hover:border-gray-400 transition-colors text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteHabit}
                className="flex-1 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white transition-colors text-sm font-semibold"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
