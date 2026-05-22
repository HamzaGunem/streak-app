'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'

function RespondContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const id = searchParams.get('id')

  const [status, setStatus] = useState('loading')
  const [inviterEmail, setInviterEmail] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (!id) {
      setErrorMsg('Invalid invite link.')
      setStatus('error')
      return
    }

    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.replace(`/login?redirect=/partners/respond?id=${id}`)
        return
      }

      const { data: partnership, error: pError } = await supabase
        .from('partnerships')
        .select('*')
        .eq('id', id)
        .single()

      if (pError || !partnership) {
        setErrorMsg('Invite not found or has expired.')
        setStatus('error')
        return
      }

      if (partnership.status !== 'pending') {
        setErrorMsg(`This invite has already been ${partnership.status}.`)
        setStatus('error')
        return
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', partnership.user_id)
        .single()

      if (profileError || !profile?.email) {
        setErrorMsg('Could not load invite details.')
        setStatus('error')
        return
      }

      setInviterEmail(profile.email)
      setStatus('ready')
    }

    load()
  }, [id, router])

  async function handleAction(newStatus) {
    setStatus('actioning')
    const supabase = createClient()
    const { error } = await supabase
      .from('partnerships')
      .update({ status: newStatus })
      .eq('id', id)

    if (error) {
      setErrorMsg('Something went wrong. Please try again.')
      setStatus('error')
      return
    }

    router.replace('/dashboard')
  }

  if (status === 'loading' || status === 'actioning') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
        <div className="bg-gray-800 rounded-2xl p-8 max-w-sm w-full text-center">
          <p className="text-2xl mb-4">🔥</p>
          <h1 className="text-xl font-bold text-white mb-6">Streak - Partnership Invite</h1>
          <p className="text-red-400 font-medium mb-6">{errorMsg}</p>
          <a href="/dashboard" className="text-orange-400 hover:text-orange-300 text-sm font-medium">
            Go to dashboard →
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="bg-gray-800 rounded-2xl p-8 max-w-sm w-full text-center">
        <p className="text-4xl mb-4">🔥</p>
        <h1 className="text-xl font-bold text-white mb-8">Streak - Partnership Invite</h1>

        <p className="text-white font-semibold text-lg mb-2">
          {inviterEmail} wants you to be their accountability partner
        </p>
        <p className="text-gray-400 text-sm mb-10">
          Join them on Streak and keep each other accountable every day
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => handleAction('active')}
            className="w-full px-4 py-3 rounded-lg bg-orange-500 hover:bg-orange-600 text-white transition-colors font-semibold"
          >
            Accept
          </button>
          <button
            onClick={() => handleAction('declined')}
            className="w-full px-4 py-3 rounded-lg bg-gray-600 hover:bg-gray-500 text-gray-200 transition-colors font-semibold"
          >
            Decline
          </button>
        </div>
      </div>
    </div>
  )
}

export default function RespondPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    }>
      <RespondContent />
    </Suspense>
  )
}
