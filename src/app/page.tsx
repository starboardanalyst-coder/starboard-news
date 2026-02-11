'use client'

import { useState } from 'react'
import Image from 'next/image'

const FEEDS = [
  {
    id: 'minor_news',
    name: 'Minor News',
    description: 'Daily crypto & energy infrastructure news digest',
    schedule: 'Daily at 08:00 GMT',
    emoji: '⚡',
    tags: ['Crypto', 'Energy', 'English'],
    color: 'amber',
  },
  {
    id: 'into_crypto_en',
    name: 'Into Crypto (EN)',
    description: 'Crypto education for beginners, zero jargon',
    schedule: 'Daily at 08:00 + 13:00 GMT',
    emoji: '🪙',
    tags: ['Crypto', 'Education', 'English'],
    color: 'blue',
  },
  {
    id: 'into_crypto_cn',
    name: 'Into Crypto (CN)',
    description: '加密货币科普日报，零基础友好',
    schedule: 'Daily at 08:00 + 13:00 GMT',
    emoji: '🪙',
    tags: ['Crypto', 'Education', '中文'],
    color: 'purple',
  },
]

export default function Home() {
  const [email, setEmail] = useState('')
  const [selectedFeeds, setSelectedFeeds] = useState<string[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const toggleFeed = (feedId: string) => {
    setSelectedFeeds(prev => 
      prev.includes(feedId) 
        ? prev.filter(id => id !== feedId)
        : [...prev, feedId]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || selectedFeeds.length === 0) {
      setStatus('error')
      setMessage('Please enter your email and select at least one newsletter')
      return
    }

    setStatus('loading')
    
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, feeds: selectedFeeds }),
      })
      
      const data = await res.json()
      
      if (res.ok) {
        setStatus('success')
        setMessage('Subscribed! You\'ll receive curated news in your inbox.')
        setEmail('')
        setSelectedFeeds([])
      } else {
        setStatus('error')
        setMessage(data.error || 'Subscription failed, please try again')
      }
    } catch (err) {
      setStatus('error')
      setMessage('Network error, please try again')
    }
  }

  const getColorClasses = (color: string, isSelected: boolean) => {
    if (!isSelected) return 'border-white/10 bg-[#000C24] hover:border-white/30'
    switch (color) {
      case 'amber': return 'border-amber-500 bg-amber-500/10'
      case 'purple': return 'border-purple-500 bg-purple-500/10'
      case 'blue': return 'border-blue-500 bg-blue-500/10'
      default: return 'border-white/30 bg-white/5'
    }
  }

  const getCheckboxClasses = (color: string, isSelected: boolean) => {
    if (!isSelected) return 'border-white/30'
    switch (color) {
      case 'amber': return 'bg-amber-500 border-amber-500'
      case 'purple': return 'bg-purple-500 border-purple-500'
      case 'blue': return 'bg-blue-500 border-blue-500'
      default: return 'bg-white border-white'
    }
  }

  const getAccentColor = (color: string) => {
    switch (color) {
      case 'amber': return 'text-amber-500'
      case 'purple': return 'text-purple-400'
      case 'blue': return 'text-blue-400'
      default: return 'text-white'
    }
  }

  return (
    <main className="min-h-screen py-12 px-4 bg-black">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <Image
              src="/images/logo.svg"
              alt="Starboard"
              width={280}
              height={84}
              className="h-20 w-auto"
              priority
            />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-white">
            News
          </h1>
          <p className="text-gray-400 text-lg">
            Curated insights, delivered to your inbox
          </p>
        </div>

        {/* Subscription Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Feed Selection */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white mb-4">Select Newsletters</h2>
            
            {FEEDS.map(feed => (
              <div
                key={feed.id}
                onClick={() => toggleFeed(feed.id)}
                className={`p-6 rounded-xl border cursor-pointer transition-all duration-200 ${getColorClasses(feed.color, selectedFeeds.includes(feed.id))}`}
              >
                <div className="flex items-start gap-4">
                  <div className="text-3xl">{feed.emoji}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-white">{feed.name}</h3>
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${getCheckboxClasses(feed.color, selectedFeeds.includes(feed.id))}`}>
                        {selectedFeeds.includes(feed.id) && (
                          <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </div>
                    <p className="text-gray-400 text-sm mb-2">{feed.description}</p>
                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      <span className={getAccentColor(feed.color)}>
                        🕐 {feed.schedule}
                      </span>
                      <div className="flex gap-2">
                        {feed.tags.map(tag => (
                          <span key={tag} className="bg-white/10 px-2 py-0.5 rounded text-gray-300">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Email Input */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full px-4 py-3 rounded-lg bg-[#000C24] border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-white/30 transition-colors"
              required
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={status === 'loading'}
            className="w-full py-3 px-6 rounded-lg bg-white text-black font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {status === 'loading' ? 'Subscribing...' : 'Subscribe'}
          </button>

          {/* Status Message */}
          {message && (
            <div className={`text-center p-4 rounded-lg ${
              status === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
            }`}>
              {message}
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="mt-16 text-center text-gray-500 text-sm">
          <p>
            Powered by{' '}
            <a href="https://starboard.to" className="text-white hover:underline">
              Starboard
            </a>
          </p>
          <p className="mt-2">Unsubscribe anytime · No spam, ever</p>
        </div>
      </div>
    </main>
  )
}
