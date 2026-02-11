'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function UnsubscribeContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('Invalid unsubscribe link.')
      return
    }

    fetch(`/api/unsubscribe?token=${token}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setStatus('success')
          setMessage(`${data.email} has been unsubscribed.`)
        } else {
          setStatus('error')
          setMessage(data.error || 'Failed to unsubscribe.')
        }
      })
      .catch(() => {
        setStatus('error')
        setMessage('Network error. Please try again.')
      })
  }, [token])

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-black">
      <div className="max-w-md w-full text-center">
        <div className="text-5xl mb-6">
          {status === 'loading' ? '...' : status === 'success' ? '👋' : '⚠️'}
        </div>
        <h1 className="text-2xl font-bold text-white mb-4">
          {status === 'loading'
            ? 'Processing...'
            : status === 'success'
              ? 'Unsubscribed'
              : 'Error'}
        </h1>
        <p className="text-gray-400 mb-8">{message}</p>
        {status === 'success' && (
          <a
            href="/"
            className="inline-block px-6 py-3 bg-white text-black rounded-lg font-semibold hover:bg-gray-200 transition-colors"
          >
            Re-subscribe
          </a>
        )}
      </div>
    </main>
  )
}

export default function UnsubscribePage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center bg-black">
          <p className="text-gray-400">Loading...</p>
        </main>
      }
    >
      <UnsubscribeContent />
    </Suspense>
  )
}
