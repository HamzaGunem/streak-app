import Link from 'next/link'
import { Bebas_Neue, Outfit } from 'next/font/google'

const display = Bebas_Neue({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
})

const body = Outfit({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
})

export default function Home() {
  return (
    <div
      className={`${display.variable} ${body.variable}`}
      style={{
        minHeight: '100vh',
        width: '100%',
        backgroundColor: '#080808',
        color: '#fff',
        fontFamily: 'var(--font-body), sans-serif',
        overflowX: 'hidden',
        position: 'relative',
      }}
    >
      <style>{`
        *, *::before, *::after { box-sizing: border-box; }

        .f-display { font-family: var(--font-display), sans-serif; letter-spacing: 0.02em; }

        /* ── animations ── */
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.4; transform: scale(0.8); }
        }
        @keyframes shimmer {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(350%); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33%       { transform: translateY(-10px) rotate(0.3deg); }
          66%       { transform: translateY(-4px) rotate(-0.2deg); }
        }
        @keyframes glow-breathe {
          0%, 100% { opacity: 0.10; }
          50%       { opacity: 0.20; }
        }
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0);    }
        }

        /* ── hero ghost word ── */
        .ghost-word {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-family: var(--font-display), sans-serif;
          font-size: clamp(180px, 38vw, 540px);
          line-height: 1;
          white-space: nowrap;
          color: transparent;
          -webkit-text-stroke: 1.5px rgba(249,115,22,0.07);
          pointer-events: none;
          user-select: none;
          animation: glow-breathe 5s ease-in-out infinite;
        }

        /* ── hero glow orb ── */
        .hero-orb {
          position: absolute;
          top: -20%;
          left: 50%;
          transform: translateX(-50%);
          width: clamp(500px, 80vw, 900px);
          height: 600px;
          border-radius: 50%;
          background: radial-gradient(ellipse, rgba(249,115,22,0.18) 0%, transparent 68%);
          filter: blur(40px);
          pointer-events: none;
          animation: glow-breathe 6s ease-in-out infinite;
        }

        /* ── pulsing badge dot ── */
        .pulse-dot {
          display: inline-block;
          width: 7px; height: 7px;
          border-radius: 50%;
          background: #f97316;
          flex-shrink: 0;
          animation: pulse-dot 1.8s ease-in-out infinite;
        }

        /* ── section label ── */
        .label {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: #f97316;
        }

        /* ── buttons ── */
        .btn-orange {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          font-weight: 700;
          border-radius: 14px;
          background: #f97316;
          color: #fff;
          transition: background 0.18s, transform 0.18s, box-shadow 0.18s;
          box-shadow: 0 8px 28px rgba(249,115,22,0.38), 0 2px 8px rgba(249,115,22,0.18);
        }
        .btn-orange:hover {
          background: #fb923c;
          transform: translateY(-2px);
          box-shadow: 0 14px 40px rgba(249,115,22,0.52);
        }

        .btn-ghost {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          font-weight: 600;
          border-radius: 14px;
          border: 1.5px solid rgba(255,255,255,0.12);
          color: #fff;
          background: transparent;
          transition: border-color 0.18s, background 0.18s, transform 0.18s;
        }
        .btn-ghost:hover {
          border-color: rgba(255,255,255,0.28);
          background: rgba(255,255,255,0.04);
          transform: translateY(-2px);
        }

        /* ── nav link ── */
        .nav-link {
          color: #9ca3af;
          text-decoration: none;
          font-size: 14px;
          font-weight: 500;
          padding: 8px 14px;
          border-radius: 10px;
          transition: color 0.15s, background 0.15s;
        }
        .nav-link:hover { color: #fff; background: rgba(255,255,255,0.05); }

        /* ── step cards ── */
        .step-card {
          position: relative;
          background: #0f0f0f;
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 24px;
          padding: 36px 32px 32px;
          overflow: hidden;
          transition: border-color 0.22s, transform 0.22s, box-shadow 0.22s;
        }
        .step-card:hover {
          border-color: rgba(249,115,22,0.22);
          transform: translateY(-4px);
          box-shadow: 0 24px 64px rgba(249,115,22,0.07);
        }
        .step-card::after {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse at top right, rgba(249,115,22,0.06) 0%, transparent 60%);
          opacity: 0;
          transition: opacity 0.22s;
          pointer-events: none;
          border-radius: 24px;
        }
        .step-card:hover::after { opacity: 1; }

        .step-num {
          position: absolute;
          top: -8px;
          right: 20px;
          font-family: var(--font-display), sans-serif;
          font-size: 110px;
          line-height: 1;
          color: transparent;
          -webkit-text-stroke: 1px rgba(249,115,22,0.15);
          pointer-events: none;
          user-select: none;
        }

        /* ── feature cards ── */
        .feat-card {
          background: #0f0f0f;
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 24px;
          padding: 36px 32px;
          transition: border-color 0.22s, transform 0.22s, box-shadow 0.22s;
        }
        .feat-card:hover {
          border-color: rgba(249,115,22,0.22);
          transform: translateY(-4px);
          box-shadow: 0 24px 64px rgba(249,115,22,0.07);
        }
        .feat-card:hover .feat-title { color: #fb923c; }
        .feat-title { transition: color 0.18s; }

        /* ── progress shimmer ── */
        .prog-bar {
          position: relative;
          overflow: hidden;
        }
        .prog-bar::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.28) 50%, transparent 100%);
          animation: shimmer 2.8s ease-in-out infinite;
        }

        /* ── floating mock card ── */
        .mock-float { animation: float 7s ease-in-out infinite; }

        /* ── gradient border CTA ── */
        .cta-border-wrap {
          padding: 1px;
          border-radius: 28px;
          background: linear-gradient(
            130deg,
            rgba(249,115,22,0.65) 0%,
            rgba(249,115,22,0.05) 40%,
            rgba(249,115,22,0.65) 100%
          );
        }

        /* ── footer links ── */
        .footer-link {
          color: #374151;
          text-decoration: none;
          transition: color 0.15s;
        }
        .footer-link:hover { color: #9ca3af; }

        /* ── divider ── */
        .section-divider { border: 0; border-top: 1px solid rgba(255,255,255,0.05); }
      `}</style>

      {/* ─── NAVBAR ─── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        backgroundColor: 'rgba(8,8,8,0.82)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}>
        <div style={{
          maxWidth: 1200, margin: '0 auto',
          padding: '0 24px', height: 68,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span className="f-display" style={{ fontSize: 30, color: '#f97316', letterSpacing: '0.05em' }}>
            Streak 🔥
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Link href="/login" className="nav-link">Sign in</Link>
            <Link href="/signup" className="btn-orange" style={{ fontSize: 14, padding: '9px 20px' }}>
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── HERO ─── */}
      <section style={{
        position: 'relative',
        paddingTop: 'clamp(150px, 22vh, 200px)',
        paddingBottom: 'clamp(80px, 14vh, 160px)',
        paddingLeft: 24, paddingRight: 24,
        textAlign: 'center',
        overflow: 'hidden',
      }}>
        <div className="hero-orb" />
        <div className="ghost-word" aria-hidden="true">STREAK</div>

        <div style={{ position: 'relative', maxWidth: 960, margin: '0 auto' }}>
          {/* social proof badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            backgroundColor: 'rgba(249,115,22,0.08)',
            border: '1px solid rgba(249,115,22,0.2)',
            color: '#fb923c',
            fontSize: 13, fontWeight: 600,
            padding: '7px 16px 7px 12px',
            borderRadius: 100,
            marginBottom: 36,
          }}>
            <span className="pulse-dot" />
            2,847 active challenges today
          </div>

          {/* headline */}
          <h1
            className="f-display"
            style={{
              fontSize: 'clamp(80px, 13vw, 160px)',
              lineHeight: 0.90,
              margin: '0 0 28px',
            }}
          >
            Challenge<br />your friends.
            <br />
            <span style={{ color: '#f97316' }}>
              Build habits<br />together.
            </span>
          </h1>

          <p style={{
            fontSize: 'clamp(17px, 2.4vw, 22px)',
            color: '#9ca3af',
            maxWidth: 520,
            margin: '0 auto 44px',
            lineHeight: 1.65,
          }}>
            Pick a habit, challenge a friend, check in every day.
            Miss a day and they win. Simple as that.
          </p>

          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: 14,
            justifyContent: 'center',
          }}>
            <Link href="/signup" className="btn-orange" style={{ fontSize: 17, padding: '16px 38px' }}>
              Start a Challenge
            </Link>
            <Link href="#how-it-works" className="btn-ghost" style={{ fontSize: 17, padding: '16px 38px' }}>
              See how it works
            </Link>
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section id="how-it-works" style={{ padding: 'clamp(72px, 12vw, 140px) 24px' }}>
        <hr className="section-divider" style={{ marginBottom: 'clamp(72px, 12vw, 140px)', marginTop: 0 }} />
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <p className="label" style={{ marginBottom: 14 }}>The system</p>
            <h2
              className="f-display"
              style={{ fontSize: 'clamp(52px, 9vw, 108px)', lineHeight: 0.92, margin: 0 }}
            >
              How it works
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
            {[
              {
                num: '01',
                title: 'Pick a habit',
                body: 'Choose anything — running, reading, no junk food. Your habit, your rules.',
              },
              {
                num: '02',
                title: 'Challenge a friend',
                body: 'Invite anyone by email. They accept, you both commit. The clock starts.',
              },
              {
                num: '03',
                title: 'Check in daily',
                body: 'Both of you check in every day. Miss a day and your opponent wins. No excuses.',
              },
            ].map(({ num, title, body }) => (
              <div key={num} className="step-card">
                <span className="step-num" aria-hidden="true">{num}</span>
                <h3 className="f-display" style={{ fontSize: 36, margin: '0 0 14px', lineHeight: 1 }}>
                  {title}
                </h3>
                <p style={{ color: '#9ca3af', lineHeight: 1.7, margin: 0, fontSize: 16 }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CHALLENGE PREVIEW ─── */}
      <section style={{ padding: 'clamp(72px, 12vw, 140px) 24px' }}>
        <hr className="section-divider" style={{ marginBottom: 'clamp(72px, 12vw, 140px)', marginTop: 0 }} />
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <p className="label" style={{ marginBottom: 14 }}>Live demo</p>
            <h2
              className="f-display"
              style={{ fontSize: 'clamp(52px, 9vw, 108px)', lineHeight: 0.92, margin: 0 }}
            >
              See what a<br />challenge looks like
            </h2>
          </div>

          <div className="mock-float" style={{ maxWidth: 660, margin: '0 auto' }}>
            <div style={{
              backgroundColor: '#0f0f0f',
              border: '1px solid rgba(255,255,255,0.09)',
              borderRadius: 28,
              overflow: 'hidden',
              boxShadow: '0 48px 120px rgba(0,0,0,0.55), 0 0 0 1px rgba(249,115,22,0.07), 0 0 80px rgba(249,115,22,0.04)',
            }}>
              {/* card header */}
              <div style={{
                padding: '28px 32px 24px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
              }}>
                <div style={{
                  display: 'flex', alignItems: 'flex-start',
                  justifyContent: 'space-between', gap: 12, marginBottom: 22,
                }}>
                  <span style={{ fontSize: 19, fontWeight: 700, lineHeight: 1.3 }}>
                    🏃 Running — 30 Day Challenge
                  </span>
                  <span style={{
                    fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
                    textTransform: 'uppercase', color: '#f97316',
                    backgroundColor: 'rgba(249,115,22,0.1)',
                    border: '1px solid rgba(249,115,22,0.2)',
                    padding: '4px 12px', borderRadius: 100,
                    whiteSpace: 'nowrap', flexShrink: 0,
                  }}>
                    Active
                  </span>
                </div>

                {/* progress */}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#6b7280', marginBottom: 10 }}>
                  <span>Day 12 of 30</span>
                  <span style={{ color: '#f97316', fontWeight: 600 }}>40%</span>
                </div>
                <div style={{
                  height: 8, backgroundColor: 'rgba(255,255,255,0.06)',
                  borderRadius: 100, overflow: 'hidden',
                }}>
                  <div
                    className="prog-bar"
                    style={{
                      height: '100%', width: '40%',
                      backgroundColor: '#f97316', borderRadius: 100,
                      boxShadow: '0 0 18px rgba(249,115,22,0.7)',
                    }}
                  />
                </div>
              </div>

              {/* participants */}
              <div style={{ padding: '24px 32px 28px' }}>
                {[
                  { label: 'You', email: 'hamza@email.com', checked: 12, total: 12, streak: 12 },
                  { label: 'John', email: 'john@email.com', checked: 11, total: 12, streak: 11 },
                ].map(({ label, email, checked, total, streak }, idx) => (
                  <div key={label}>
                    {idx > 0 && (
                      <div style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.05)', margin: '20px 0' }} />
                    )}
                    <div style={{
                      display: 'flex', alignItems: 'center',
                      justifyContent: 'space-between', marginBottom: 10,
                    }}>
                      <span style={{ fontSize: 14, fontWeight: 600 }}>
                        {label}&nbsp;
                        <span style={{ color: '#4b5563', fontWeight: 400 }}>({email})</span>
                      </span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#f97316' }}>
                        {streak} 🔥
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                      {Array.from({ length: total }, (_, i) => (
                        <span key={i} style={{ fontSize: 14 }}>
                          {i < checked ? '✅' : '❌'}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}

                {/* status banner */}
                <div style={{
                  marginTop: 24,
                  backgroundColor: 'rgba(249,115,22,0.08)',
                  border: '1px solid rgba(249,115,22,0.18)',
                  borderRadius: 16,
                  padding: '13px 20px',
                  fontSize: 14, fontWeight: 600,
                  color: '#fb923c',
                  textAlign: 'center',
                  letterSpacing: '0.01em',
                }}>
                  John missed yesterday! You&apos;re winning 🏆
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section style={{ padding: 'clamp(72px, 12vw, 140px) 24px' }}>
        <hr className="section-divider" style={{ marginBottom: 'clamp(72px, 12vw, 140px)', marginTop: 0 }} />
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <p className="label" style={{ marginBottom: 14 }}>Why it works</p>
            <h2
              className="f-display"
              style={{ fontSize: 'clamp(52px, 9vw, 108px)', lineHeight: 0.92, margin: 0 }}
            >
              Built for<br />accountability
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
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
              <div key={title} className="feat-card">
                <div style={{ fontSize: 42, marginBottom: 22, lineHeight: 1 }}>{icon}</div>
                <h3 className="f-display feat-title" style={{ fontSize: 34, margin: '0 0 12px', lineHeight: 1 }}>
                  {title}
                </h3>
                <p style={{ color: '#9ca3af', lineHeight: 1.7, margin: 0, fontSize: 16 }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section style={{ padding: 'clamp(72px, 12vw, 140px) 24px' }}>
        <hr className="section-divider" style={{ marginBottom: 'clamp(72px, 12vw, 140px)', marginTop: 0 }} />
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div className="cta-border-wrap">
            <div style={{
              position: 'relative',
              backgroundColor: '#0c0c0c',
              borderRadius: 27,
              padding: 'clamp(52px, 9vw, 90px) clamp(32px, 6vw, 64px)',
              textAlign: 'center',
              overflow: 'hidden',
            }}>
              {/* inner glow */}
              <div style={{
                position: 'absolute',
                top: 0, left: '50%',
                transform: 'translateX(-50%)',
                width: 600, height: 350,
                background: 'radial-gradient(ellipse at top, rgba(249,115,22,0.12) 0%, transparent 68%)',
                pointerEvents: 'none',
              }} />
              {/* bottom glow */}
              <div style={{
                position: 'absolute',
                bottom: -60, left: '50%',
                transform: 'translateX(-50%)',
                width: 400, height: 200,
                background: 'radial-gradient(ellipse, rgba(249,115,22,0.06) 0%, transparent 70%)',
                pointerEvents: 'none',
              }} />

              <div style={{ position: 'relative' }}>
                <h2
                  className="f-display"
                  style={{ fontSize: 'clamp(52px, 9vw, 100px)', lineHeight: 0.92, marginBottom: 20 }}
                >
                  Ready to challenge someone?
                </h2>
                <p style={{
                  fontSize: 'clamp(17px, 2.4vw, 21px)',
                  color: '#9ca3af', lineHeight: 1.6,
                  marginBottom: 44,
                }}>
                  Pick a friend. Pick a habit.<br />
                  See who actually has the discipline.
                </p>
                <Link href="/signup" className="btn-orange" style={{ fontSize: 18, padding: '18px 48px' }}>
                  Create Your First Challenge
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '32px 24px' }}>
        <div style={{
          maxWidth: 1200, margin: '0 auto',
          display: 'flex', flexWrap: 'wrap', gap: 16,
          alignItems: 'center', justifyContent: 'space-between',
          fontSize: 14, color: '#374151',
        }}>
          <span>© 2026 Streak. Build better habits.</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Link href="/privacy" className="footer-link">Privacy</Link>
            <span style={{ color: '#1f2937' }}>·</span>
            <Link href="/terms" className="footer-link">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
