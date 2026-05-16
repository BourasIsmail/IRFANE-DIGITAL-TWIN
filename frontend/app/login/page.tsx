import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { keyrockLogin } from '@/lib/fiware'

export default async function LoginPage({ searchParams }: { searchParams: { error?: string } }) {
  const session = await getSession()
  if (session.isLoggedIn) redirect('/')

  async function login(formData: FormData) {
    'use server'
    const email    = formData.get('email')    as string
    const password = formData.get('password') as string
    try {
      const { token, user } = await keyrockLogin(email, password)
      const s = await getSession()
      s.token = token!; s.userEmail = email; s.userName = user?.username || email; s.isLoggedIn = true
      await s.save()
    } catch { redirect('/login?error=1') }
    redirect('/')
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
          {searchParams.error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', fontSize: 12, padding: '8px 12px', borderRadius: 6, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className="ti ti-alert-circle" style={{ fontSize: 14 }} />
              Invalid email or password
            </div>
          )}
          <form action={login} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 5 }}>Email address</label>
              <input name="email" type="email" defaultValue="admin@irfane.ma" required
                style={{ width: '100%', padding: '9px 11px', fontSize: 13, border: '1px solid #d1d5db', borderRadius: 6, background: '#fff', color: '#1a1d23', outline: 'none' }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 5 }}>Password</label>
              <input name="password" type="password" defaultValue="admin1234" required
                style={{ width: '100%', padding: '9px 11px', fontSize: 13, border: '1px solid #d1d5db', borderRadius: 6, background: '#fff', color: '#1a1d23', outline: 'none' }} />
            </div>
            <button type="submit" style={{ marginTop: 4, padding: '10px', fontSize: 13, fontWeight: 600, background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', letterSpacing: '0.01em' }}>
              Sign in to dashboard
            </button>
          </form>
          <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid #f1f5f9' }}>
            <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Demo accounts</div>
            <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.7 }}>
              operator@irfane.ma / operator1234<br/>
              viewer@irfane.ma / viewer1234
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}