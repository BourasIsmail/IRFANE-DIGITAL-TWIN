'use client'

import useSWR from 'swr'
import { Sidebar } from '@/components/layout/Sidebar'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const DIMMING_SCHEDULE = [
  { hour: '19:00', intensity: 100 }, { hour: '20:00', intensity: 100 },
  { hour: '21:00', intensity: 100 }, { hour: '22:00', intensity: 100 },
  { hour: '23:00', intensity: 100 }, { hour: '00:00', intensity: 40  },
  { hour: '01:00', intensity: 40  }, { hour: '02:00', intensity: 40  },
  { hour: '03:00', intensity: 40  }, { hour: '04:00', intensity: 40  },
  { hour: '05:00', intensity: 40  }, { hour: '06:00', intensity: 100 },
  { hour: '07:00', intensity: 0   },
]

export default function LightingPage() {
  const { data } = useSWR('/api/sensors', fetcher, { refreshInterval: 10000 })
  const cabinets: any[] = data?.lighting ?? []

  const onCount      = cabinets.filter((c: any) => c.powerState === 'on').length
  const dimmedCount  = cabinets.filter((c: any) => c.powerState === 'on' && (c.intensity ?? 100) < 100).length
  const totalLamps   = cabinets.reduce((s: number, c: any) => s + (c.totalLamps ?? 0), 0)
  const activeLamps  = cabinets.reduce((s: number, c: any) => s + (c.activeLamps ?? 0), 0)
  const totalEnergy  = cabinets.reduce((s: number, c: any) => s + (c.energyConsumed ?? 0), 0)

  return (
    <div className="dashboard-shell">
      <Sidebar />
      <div className="main-content">
        <header className="topbar">
          <div style={{ fontWeight: 600, fontSize: 14 }}>Street lighting — Irfane district</div>
          <span className="chip chip-blue">{cabinets.length} control cabinets</span>
        </header>
        <div className="page-content">
          <div className="kpi-grid">
            <div className="kpi-card" style={{ '--accent': '#2563eb' } as any}>
              <div className="kpi-label"><i className="ti ti-bulb" />Active cabinets</div>
              <div className="kpi-value">{onCount} / {cabinets.length}</div>
              <div className="kpi-sub" style={{ color: '#16a34a' }}>{dimmedCount} dimmed to 40%</div>
            </div>
            <div className="kpi-card" style={{ '--accent': '#f59e0b' } as any}>
              <div className="kpi-label"><i className="ti ti-lamp" />Active lamps</div>
              <div className="kpi-value">{activeLamps}</div>
              <div className="kpi-sub">of {totalLamps} total poles</div>
            </div>
            <div className="kpi-card" style={{ '--accent': '#16a34a' } as any}>
              <div className="kpi-label"><i className="ti ti-bolt" />Energy now</div>
              <div className="kpi-value">{totalEnergy.toFixed(1)}</div>
              <div className="kpi-sub">kWh consumption</div>
            </div>
            <div className="kpi-card" style={{ '--accent': '#7c3aed' } as any}>
              <div className="kpi-label"><i className="ti ti-clock" />Current mode</div>
              <div className="kpi-value" style={{ fontSize: 18 }}>
                {(() => {
                  const h = new Date().getHours()
                  if (h >= 19 || h < 1) return 'Full'
                  if (h < 7)            return 'Dimmed'
                  return 'Off'
                })()}
              </div>
              <div className="kpi-sub">lighting mode</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {/* Cabinet cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {cabinets.map((c: any) => {
                const on      = c.powerState === 'on'
                const dimmed  = on && (c.intensity ?? 100) < 100
                const color   = !on ? '#94a3b8' : dimmed ? '#d97706' : '#16a34a'
                const label   = !on ? 'Off' : dimmed ? 'Dimmed' : 'Full'
                return (
                  <div key={c.id} className="card">
                    <div className="card-header">
                      <span className="card-title">
                        <i className="ti ti-bulb" style={{ color }} />{c.name}
                      </span>
                      <span className="chip" style={{
                        background: color + '18', color, borderColor: color + '40',
                      }}>{label}</span>
                    </div>
                    <div className="card-body">
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                        <div>
                          <div className="kpi-label">Intensity</div>
                          <div style={{ fontSize: 16, fontWeight: 600, color }}>{c.intensity ?? 0}%</div>
                        </div>
                        <div>
                          <div className="kpi-label">Active</div>
                          <div style={{ fontSize: 16, fontWeight: 600 }}>{c.activeLamps ?? 0}/{c.totalLamps ?? 0}</div>
                        </div>
                        <div>
                          <div className="kpi-label">Energy</div>
                          <div style={{ fontSize: 16, fontWeight: 600 }}>{(c.energyConsumed ?? 0).toFixed(2)} kWh</div>
                        </div>
                        <div>
                          <div className="kpi-label">Power factor</div>
                          <div style={{ fontSize: 16, fontWeight: 600 }}>{c.powerFactor ?? '--'}</div>
                        </div>
                      </div>
                      {/* Intensity bar */}
                      <div style={{ marginTop: 10 }}>
                        <div style={{ height: 5, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{
                            width: `${c.intensity ?? 0}%`, height: '100%',
                            background: color, borderRadius: 3, transition: 'width 1s ease',
                          }} />
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
              {cabinets.length === 0 && (
                <div className="card" style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>
                  No lighting data yet
                </div>
              )}
            </div>

            {/* Dimming schedule */}
            <div className="card">
              <div className="card-header">
                <span className="card-title"><i className="ti ti-clock" />Dimming schedule</span>
                <span className="chip chip-gray">configured</span>
              </div>
              <div className="card-body">
                <div style={{ height: 200, marginBottom: 16 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={DIMMING_SCHEDULE} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="lightGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} interval={2} />
                      <YAxis hide domain={[0, 110]} />
                      <Tooltip
                        contentStyle={{ fontSize: 12, border: '1px solid #e2e8ef', borderRadius: 6 }}
                        formatter={(v: any) => [`${v}%`, 'Intensity']}
                      />
                      <Area type="stepAfter" dataKey="intensity" stroke="#f59e0b" strokeWidth={2} fill="url(#lightGrad)" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[
                    { time: '19:00 – 00:00', level: '100%', label: 'Full brightness', color: '#f59e0b' },
                    { time: '00:00 – 06:00', level: '40%',  label: 'Night dimming',   color: '#d97706' },
                    { time: '07:00 – 19:00', level: '0%',   label: 'Daylight off',    color: '#94a3b8' },
                  ].map(({ time, level, label, color }) => (
                    <div key={time} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '7px 10px', background: '#fafbfc', borderRadius: 6,
                      border: '1px solid #f1f5f9',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
                        <span style={{ fontSize: 12, fontWeight: 500 }}>{time}</span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color }}>{level}</div>
                        <div style={{ fontSize: 10, color: '#94a3b8' }}>{label}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}