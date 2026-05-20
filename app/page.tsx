import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <nav className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <span className="text-xl font-bold tracking-tight">🔥 Streak</span>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="text-sm text-gray-300 hover:text-white transition-colors px-4 py-2 rounded-lg"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="text-sm bg-orange-500 hover:bg-orange-600 text-white font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      <main className="flex-1 flex items-center justify-center px-6 py-28 text-center">
        <div className="max-w-2xl space-y-7">
          <h1 className="text-5xl sm:text-6xl font-extrabold leading-tight tracking-tight">
            Build habits that stick&nbsp;🔥
          </h1>
          <p className="text-lg sm:text-xl text-gray-400 leading-relaxed">
            Track your daily habits and stay accountable with a partner.
            <br className="hidden sm:block" />
            Never break the streak.
          </p>
          <div className="flex items-center justify-center gap-4 pt-2">
            <Link
              href="/signup"
              className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-7 py-3 rounded-xl transition-colors text-sm"
            >
              Get Started Free
            </Link>
            <Link
              href="/login"
              className="border border-gray-700 hover:border-gray-500 text-white font-semibold px-7 py-3 rounded-xl transition-colors text-sm"
            >
              Sign in
            </Link>
          </div>
        </div>
      </main>

      <section className="border-t border-gray-800 px-6 py-20">
        <div className="max-w-5xl mx-auto grid sm:grid-cols-3 gap-5">
          {[
            {
              icon: '🎯',
              title: 'Track Daily Habits',
              body: 'Check off habits every day and watch your streak grow.',
            },
            {
              icon: '🤝',
              title: 'Accountability Partner',
              body: 'Invite a friend to keep each other on track.',
            },
            {
              icon: '📈',
              title: 'Watch Your Progress',
              body: 'Visualize your consistency over time.',
            },
          ].map(({ icon, title, body }) => (
            <div
              key={title}
              className="bg-gray-900 border border-gray-800 rounded-2xl p-7 space-y-3"
            >
              <div className="text-3xl">{icon}</div>
              <h3 className="text-base font-semibold">{title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-gray-800 px-6 py-6 text-center text-sm text-gray-600">
        © 2026 Streak. Build better habits.
      </footer>
    </div>
  )
}