'use client'

import useSWR from 'swr'
import { Sidebar } from '@/components/layout/Sidebar'

const fetcher = (url: string) => fetch(url).then(r => r.json())

function OccupancyBar({ value, total }: { value: number; total: number }) {
  const pct   = total > 0 ? Math.round((value / total) * 100) : 0
  const color  = pct > 90 ? '#dc2626' : pct > 70 ? '#d97706' : '#16a34a'
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: '#64748b' }}>{value} occupied / {total} total</span>
        <span style={{ fontSize: 11, fontWeight: 600, color }}>{pct}%</span>
      </div>
      <div style={{ height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 1s ease' }} />
      </div>
    </div>
  )
}

function statusChip(status: string) {
  if (status === 'full')       return <span className="chip chip-red">Full</span>
  if (status === 'almostFull') return <span className="chip chip-amber">Almost full</span>
  return <span className="chip chip-green">Open</span>
}

export default function ParkingPage() {
  const { data } = useSWR('/api/sensors', fetcher, { refreshInterval: 5000 })
  const parking: any[] = data?.parking ?? []

  const totalAvailable = parking.reduce((s: number, p: any) => s + (p.availableSpotNumber ?? 0), 0)
  const totalCapacity   = parking.reduce((s: number, p: any) => s + (p.totalSpotNumber ?? 0), 0)
  const fullLots        = parking.filter((p: any) => p.status === 'full').length
  const avgOccupancy    = parking.length
    ? Math.round(parking.reduce((s: number, p: any) => s + (p.occupancyRate ?? 0), 0) / parking.length * 100)
    : 0

  return (
    <div className="dashboard-shell">
      <Sidebar />
      <div className="main-content">
        <header className="topbar">
          <div style={{ fontWeight: 600, fontSize: 14 }}>Parking — Irfane district</div>
          <span className="chip chip-blue">{parking.length} lots monitored</span>
        </header>
        <div className="page-content">
          <div className="kpi-grid">
            <div className="kpi-card" style={{ '--accent': '#2563eb' } as any}>
              <div className="kpi-label"><i className="ti ti-car" />Available spots</div>
              <div className="kpi-value" style={{ color: totalAvailable < 20 ? '#dc2626' : undefined }}>{totalAvailable}</div>
              <div className="kpi-sub">of {totalCapacity} total</div>
            </div>
            <div className="kpi-card" style={{ '--accent': '#d97706' } as any}>
              <div className="kpi-label"><i className="ti ti-percentage" />Avg occupancy</div>
              <div className="kpi-value">{avgOccupancy}%</div>
              <div className="kpi-sub">across all lots</div>
            </div>
            <div className="kpi-card" style={{ '--accent': '#dc2626' } as any}>
              <div className="kpi-label"><i className="ti ti-alert-triangle" />Full lots</div>
              <div className="kpi-value" style={{ color: fullLots > 0 ? '#dc2626' : undefined }}>{fullLots}</div>
              <div className="kpi-sub">of {parking.length} lots</div>
            </div>
            <div className="kpi-card" style={{ '--accent': '#16a34a' } as any}>
              <div className="kpi-label"><i className="ti ti-check" />Open lots</div>
              <div className="kpi-value" style={{ color: '#16a34a' }}>{parking.filter((p: any) => p.status === 'open').length}</div>
              <div className="kpi-sub">accepting vehicles</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {parking.map((p: any) => (
              <div key={p.id} className="card">
                <div className="card-header">
                  <span className="card-title"><i className="ti ti-parking" />{p.name}</span>
                  {statusChip(p.status)}
                </div>
                <div className="card-body">
                  <div style={{ marginBottom: 16 }}>
                    <OccupancyBar value={p.occupiedSpotNumber ?? 0} total={p.totalSpotNumber ?? 0} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                    <div>
                      <div className="kpi-label">Available</div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: '#16a34a' }}>{p.availableSpotNumber ?? '--'}</div>
                    </div>
                    <div>
                      <div className="kpi-label">Occupied</div>
                      <div style={{ fontSize: 20, fontWeight: 700 }}>{p.occupiedSpotNumber ?? '--'}</div>
                    </div>
                    <div>
                      <div className="kpi-label">Capacity</div>
                      <div style={{ fontSize: 20, fontWeight: 700 }}>{p.totalSpotNumber ?? '--'}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {parking.length === 0 && (
            <div className="card" style={{ padding: 40, textAlign: 'center' }}>
              <i className="ti ti-car" style={{ fontSize: 32, color: '#94a3b8', display: 'block', marginBottom: 8 }} />
              <div style={{ color: '#64748b' }}>No parking data yet — simulator starting up</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}