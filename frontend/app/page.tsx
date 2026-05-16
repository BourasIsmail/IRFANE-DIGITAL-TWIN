import { requireAuth } from '@/lib/session'
import { Sidebar } from '@/components/layout/Sidebar'
import DashboardClient from '@/components/dashboard/DashboardClient'

export default async function DashboardPage() {
  const session = await requireAuth()

  return (
    <div className="dashboard-shell">
      <Sidebar userEmail={session.userEmail} />
      <div className="main-content">
        <header className="topbar">
          <div style={{ fontWeight: 600, fontSize: 14 }}>District Overview — Irfane, Rabat</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 11, color: '#64748b', background: '#f1f5f9', border: '1px solid #e2e8ef', padding: '4px 10px', borderRadius: 6 }}>
              {new Date().toLocaleDateString('fr-MA', { weekday: 'short', day: '2-digit', month: 'short' })}
            </div>
          </div>
        </header>
        <DashboardClient userEmail={session.userEmail ?? ''} />
      </div>
    </div>
  )
}