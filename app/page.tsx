import Link from 'next/link'

export default function Home() {
  const checkmarks = (count: number, total: number) =>
    Array.from({ length: total }, (_, i) => (
      <span key={i} className={i < count ? 'text-green-400' : 'text-red-500'}>
        {i < count ? '✅' : '❌'}
      </span>
    ))

  return (
    <div className="min-h-screen text-white" style={{ backgroundColor: '#0a0a0a' }}>

      {/* ── NAVBAR ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 backdrop-blur-md"
        style={{ backgroundColor: 'rgba(10,10,10,0.85)' }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="text-2xl font-extrabold tracking-tight text-orange-500">
            Streak 🔥
          </span>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm text-gray-300 hover:text-white transition-colors px-4 py-2 rounded-lg border border-transparent hover:border-white/10"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="text-sm bg-orange-500 hover:bg-orange-400 text-white font-bold px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="pt-40 pb-28 px-6 text-center relative overflow-hidden">
        {/* background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full opacity-10 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at center, #f97316 0%, transparent 70%)' }} />

        <div className="relative max-w-4xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 text-orange-400 text-sm font-medium px-4 py-1.5 rounded-full mb-4">
            🔥 2,847 active challenges today
          </div>

          <h1 className="text-6xl sm:text-7xl md:text-8xl font-black leading-none tracking-tight">
            Challenge your friends.
            <br />
            <span className="text-orange-500">Build habits together.</span>
          </h1>

          <p className="text-xl sm:text-2xl text-gray-400 max-w-2xl mx-auto leading-relaxed pt-2">
            Pick a habit, challenge a friend, check in every day.
            <br className="hidden sm:block" />
            Miss a day and they win. Simple as that.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
            <Link
              href="/signup"
              className="w-full sm:w-auto text-base bg-orange-500 hover:bg-orange-400 text-white font-bold px-8 py-4 rounded-2xl transition-all shadow-xl shadow-orange-500/30 hover:shadow-orange-500/50 hover:-translate-y-0.5"
            >
              Start a Challenge
            </Link>
            <Link
              href="#how-it-works"
              className="w-full sm:w-auto text-base border border-white/15 hover:border-white/30 text-white font-semibold px-8 py-4 rounded-2xl transition-all hover:bg-white/5"
            >
              See how it works
            </Link>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="py-24 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl sm:text-5xl font-black text-center mb-16 tracking-tight">
            How it works
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                num: '1',
                title: 'Pick a habit',
                body: 'Choose anything — running, reading, no junk food. Your habit, your rules.',
              },
              {
                num: '2',
                title: 'Challenge a friend',
                body: 'Invite anyone by email. They accept, you both commit. The clock starts.',
              },
              {
                num: '3',
                title: 'Check in daily',
                body: 'Both of you check in every day. Miss a day and your opponent wins. No excuses.',
              },
            ].map(({ num, title, body }) => (
              <div
                key={num}
                className="relative rounded-3xl p-8 border border-white/8 overflow-hidden group hover:border-orange-500/30 transition-colors"
                style={{ backgroundColor: '#111111' }}
              >
                <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                  style={{ background: 'radial-gradient(ellipse at top right, rgba(249,115,22,0.12) 0%, transparent 70%)' }} />
                <div className="text-5xl font-black text-orange-500/20 mb-4 leading-none">{num}</div>
                <h3 className="text-xl font-bold mb-3">{title}</h3>
                <p className="text-gray-400 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CHALLENGE PREVIEW ── */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl sm:text-5xl font-black text-center mb-16 tracking-tight">
            See what a challenge looks like
          </h2>

          <div className="max-w-2xl mx-auto rounded-3xl border border-white/10 overflow-hidden"
            style={{ backgroundColor: '#111111' }}>
            {/* card header */}
            <div className="px-8 pt-8 pb-6 border-b border-white/8">
              <div className="flex items-center justify-between mb-5">
                <span className="text-2xl font-bold">🏃 Running — 30 Day Challenge</span>
                <span className="text-sm text-orange-400 font-semibold bg-orange-500/10 border border-orange-500/20 px-3 py-1 rounded-full">
                  Active
                </span>
              </div>

              {/* progress bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-gray-400">
                  <span>Day 12 of 30</span>
                  <span>40%</span>
                </div>
                <div className="h-2.5 rounded-full bg-white/8 overflow-hidden">
                  <div className="h-full rounded-full bg-orange-500 transition-all"
                    style={{ width: '40%', boxShadow: '0 0 12px rgba(249,115,22,0.6)' }} />
                </div>
              </div>
            </div>

            {/* participants */}
            <div className="px-8 py-6 space-y-5">
              {/* You */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold">You <span className="text-gray-500 font-normal">(hamza@email.com)</span></span>
                  <span className="font-bold text-orange-400">12 🔥</span>
                </div>
                <div className="flex gap-1 flex-wrap">
                  {checkmarks(12, 12)}
                </div>
              </div>

              <div className="border-t border-white/5" />

              {/* John */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold">John <span className="text-gray-500 font-normal">(john@email.com)</span></span>
                  <span className="font-bold text-orange-400">11 🔥</span>
                </div>
                <div className="flex gap-1 flex-wrap">
                  {checkmarks(11, 12)}
                </div>
              </div>
            </div>

            {/* status banner */}
            <div className="mx-8 mb-8 bg-orange-500/10 border border-orange-500/20 rounded-2xl px-5 py-3 text-orange-300 text-sm font-semibold text-center">
              John missed yesterday! You&apos;re winning 🏆
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: '🏆',
                title: 'Real Stakes',
                body: "When your streak is on the line you actually show up. Nobody wants to lose to their friend.",
              },
              {
                icon: '📊',
                title: 'Track Everything',
                body: 'See your full history, win rate, longest streaks and how you stack up against your rivals.',
              },
              {
                icon: '🔔',
                title: 'Daily Reminders',
                body: "Never forget to check in. We remind you before midnight so you never lose on a technicality.",
              },
            ].map(({ icon, title, body }) => (
              <div
                key={title}
                className="rounded-3xl p-8 border border-white/8 hover:border-orange-500/25 transition-colors group"
                style={{ backgroundColor: '#111111' }}
              >
                <div className="text-4xl mb-5">{icon}</div>
                <h3 className="text-xl font-bold mb-3 group-hover:text-orange-400 transition-colors">{title}</h3>
                <p className="text-gray-400 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-2xl mx-auto">
          <div className="relative rounded-3xl p-12 text-center overflow-hidden border border-orange-500/20"
            style={{ backgroundColor: '#111111' }}>
            {/* gradient border glow */}
            <div className="absolute inset-0 rounded-3xl pointer-events-none"
              style={{ background: 'radial-gradient(ellipse at center, rgba(249,115,22,0.08) 0%, transparent 70%)' }} />
            <div className="absolute -inset-px rounded-3xl pointer-events-none opacity-40"
              style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.3) 0%, transparent 50%, rgba(249,115,22,0.3) 100%)' }} />

            <div className="relative space-y-5">
              <h2 className="text-4xl sm:text-5xl font-black tracking-tight">
                Ready to challenge someone?
              </h2>
              <p className="text-xl text-gray-400 leading-relaxed">
                Pick a friend. Pick a habit.
                <br />
                See who actually has the discipline.
              </p>
              <div className="pt-4">
                <Link
                  href="/signup"
                  className="inline-block text-lg bg-orange-500 hover:bg-orange-400 text-white font-bold px-10 py-4 rounded-2xl transition-all shadow-2xl shadow-orange-500/40 hover:shadow-orange-500/60 hover:-translate-y-0.5"
                >
                  Create Your First Challenge
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/5 px-6 py-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-600">
          <span>© 2026 Streak. Build better habits.</span>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-gray-400 transition-colors">Privacy</Link>
            <span>·</span>
            <Link href="/terms" className="hover:text-gray-400 transition-colors">Terms</span>
          </div>
        </div>
      </footer>

    </div>
  )
}
