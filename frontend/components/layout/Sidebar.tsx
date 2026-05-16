'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const nav = [
  { href: '/',           label: 'Overview',       icon: 'ti-layout-dashboard', section: 'Main' },
  { href: '/alerts',     label: 'Alerts',          icon: 'ti-bell',             badge: true },
  { href: '/traffic',    label: 'Traffic',         icon: 'ti-traffic-lights',   section: 'Sensors' },
  { href: '/tramway',    label: 'Tramway T1',      icon: 'ti-train' },
  { href: '/weather',    label: 'Weather',         icon: 'ti-cloud' },
  { href: '/green',      label: 'Green spaces',    icon: 'ti-leaf' },
  { href: '/parking',    label: 'Parking',         icon: 'ti-car' },
  { href: '/airquality', label: 'Air quality',     icon: 'ti-wind' },
  { href: '/noise',      label: 'Noise',           icon: 'ti-volume' },
  { href: '/lighting',   label: 'Lighting',        icon: 'ti-bulb' },
  { href: '/history',    label: 'Historical data', icon: 'ti-chart-line', section: 'Analytics' },
  { href: '/analytics',  label: 'Correlations',    icon: 'ti-chart-dots' },
]

export function Sidebar({ alertCount = 0, userEmail = '' }: { alertCount?: number; userEmail?: string }) {
  const path = usePathname()
  const initials = (userEmail || 'AD').slice(0, 2).toUpperCase()

  return (
    <aside className="sidebar">
      <div style={{ padding: '20px 18px 16px', borderBottom: '1px solid #2d3448' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 3 }}>
          <div style={{ width: 28, height: 28, background: '#2563eb', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <i className="ti ti-building-community" style={{ fontSize: 16, color: '#fff' }} />
          </div>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9', letterSpacing: '-0.01em' }}>Irfane Twin</span>
        </div>
        <div style={{ fontSize: 11, color: '#64748b', paddingLeft: 38 }}>Rabat Smart City Platform</div>
      </div>

      {nav.map((item) => (
        <div key={item.href}>
          {item.section && <div className="nav-section">{item.section}</div>}
          <Link href={item.href} className={`nav-link${path === item.href ? ' active' : ''}`}>
            <i className={`ti ${item.icon}`} />
            <span style={{ flex: 1 }}>{item.label}</span>
            {item.badge && alertCount > 0 && (
              <span style={{ fontSize: 10, background: '#dc2626', color: '#fff', padding: '1px 6px', borderRadius: 10, fontWeight: 600 }}>
                {alertCount}
              </span>
            )}
          </Link>
        </div>
      ))}

      <div style={{ flex: 1 }} />

      <div style={{ padding: '14px 18px', borderTop: '1px solid #2d3448', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#fff', fontWeight: 600, flexShrink: 0 }}>
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, color: '#e2e8f0', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {userEmail || 'admin@irfane.ma'}
          </div>
          <form action="/api/auth/logout" method="POST" style={{ margin: 0 }}>
            <button type="submit" style={{ background: 'none', border: 'none', padding: 0, fontSize: 10, color: '#64748b', cursor: 'pointer', textAlign: 'left' }}>
              Sign out
            </button>
          </form>
        </div>
      </div>
    </aside>
  )
}