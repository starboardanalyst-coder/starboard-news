'use client'

import { useState } from 'react'

const FEEDS = [
  {
    id: 'minor_news',
    name: 'Minor News',
    description: '能源、数据中心、比特币矿场每日新闻',
    schedule: '每天 08:30 GMT',
    emoji: '⚡',
    tags: ['能源', '数据中心', '矿场'],
  },
  {
    id: 'into_crypto_cn',
    name: 'Into Crypto 中文版',
    description: '加密货币科普日报，零基础友好',
    schedule: '每天 08:00 + 13:00 GMT',
    emoji: '🪙',
    tags: ['Crypto', '教育', '中文'],
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
      setMessage('请输入邮箱并至少选择一个订阅')
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
        setMessage('订阅成功！每日精选资讯将发送到您的邮箱。')
        setEmail('')
        setSelectedFeeds([])
      } else {
        setStatus('error')
        setMessage(data.error || '订阅失败，请重试')
      }
    } catch (err) {
      setStatus('error')
      setMessage('网络错误，请重试')
    }
  }

  return (
    <main className="min-h-screen py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="text-amber-500">Starboard</span> News
          </h1>
          <p className="text-gray-400 text-lg">
            订阅精选资讯，每日直达邮箱
          </p>
        </div>

        {/* Subscription Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Feed Selection */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white mb-4">选择订阅频道</h2>
            
            {FEEDS.map(feed => (
              <div
                key={feed.id}
                onClick={() => toggleFeed(feed.id)}
                className={`card cursor-pointer transition-all duration-200 ${
                  selectedFeeds.includes(feed.id) 
                    ? 'border-amber-500 bg-amber-500/10' 
                    : 'hover:border-white/30'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="text-3xl">{feed.emoji}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-white">{feed.name}</h3>
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        selectedFeeds.includes(feed.id)
                          ? 'bg-amber-500 border-amber-500'
                          : 'border-white/30'
                      }`}>
                        {selectedFeeds.includes(feed.id) && (
                          <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </div>
                    <p className="text-gray-400 text-sm mb-2">{feed.description}</p>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-amber-500">🕐 {feed.schedule}</span>
                      <div className="flex gap-2">
                        {feed.tags.map(tag => (
                          <span key={tag} className="bg-white/10 px-2 py-0.5 rounded">
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
              邮箱地址
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="input-field"
              required
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={status === 'loading'}
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {status === 'loading' ? '订阅中...' : '立即订阅'}
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
        <div className="mt-12 text-center text-gray-500 text-sm">
          <p>Powered by <a href="https://starboard.to" className="text-amber-500 hover:underline">Starboard</a></p>
          <p className="mt-2">随时可以取消订阅 · 我们不会发送垃圾邮件</p>
        </div>
      </div>
    </main>
  )
}
