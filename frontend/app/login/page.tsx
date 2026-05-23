'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const form     = new FormData(e.currentTarget)
    const email    = form.get('email')    as string
    const password = form.get('password') as string

    try {
      const res = await fetch('/api/auth/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, password }),
      })

      if (res.ok) {
        router.push('/')
        router.refresh()
      } else {
        const data = await res.json()
        setError(data.error || 'Invalid credentials')
      }
    } catch (e: any) {
      setError('Connection error: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f4f5f7' }}>
      <div style={{ width: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 48, height: 48, background: '#2563eb', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <i className="ti ti-building-community" style={{ fontSize: 24, color: '#fff' }} />
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#1a1d23', letterSpacing: '-0.02em' }}>Irfane Digital Twin</div>
          <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>Rabat Smart City Platform</div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e2e8ef', borderRadius: 10, padding: '28px 32px' }}>
          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', fontSize: 12, padding: '8px 12px', borderRadius: 6, marginBottom: 16 }}>
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 5 }}>Email address</label>
              <input name="email" type="email" defaultValue="admin@irfane.ma" required
                style={{ width: '100%', padding: '9px 11px', fontSize: 13, border: '1px solid #d1d5db', borderRadius: 6, outline: 'none', color: '#1a1d23' }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 5 }}>Password</label>
              <input name="password" type="password" defaultValue="admin1234" required
                style={{ width: '100%', padding: '9px 11px', fontSize: 13, border: '1px solid #d1d5db', borderRadius: 6, outline: 'none', color: '#1a1d23' }} />
            </div>
            <button type="submit" disabled={loading} style={{
              marginTop: 4, padding: '10px', fontSize: 13, fontWeight: 600,
              background: loading ? '#93c5fd' : '#2563eb', color: '#fff',
              border: 'none', borderRadius: 6, cursor: loading ? 'not-allowed' : 'pointer',
            }}>
              {loading ? 'Signing in...' : 'Sign in to dashboard'}
            </button>
          </form>
          <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid #f1f5f9', fontSize: 11, color: '#64748b', lineHeight: 1.8 }}>
            operator@irfane.ma / operator1234<br/>
            viewer@irfane.ma / viewer1234
          </div>
        </div>
      </div>
    </div>
  )
}