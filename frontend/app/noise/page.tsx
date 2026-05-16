'use client'

import useSWR from 'swr'
import { Sidebar } from '@/components/layout/Sidebar'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer, Cell } from 'recharts'

const fetcher = (url: string) => fetch(url).then(r => r.json())

function noiseColor(db: number) {
  if (db < 45) return '#16a34a'
  if (db < 55) return '#d97706'
  if (db < 65) return '#ea580c'
  return '#dc2626'
}

function categoryChip(cat: string) {
  const map: Record<string,string> = {
    quiet: 'chip-green', moderate: 'chip-amber',
    loud: 'chip-red', veryLoud: 'chip-red',
  }
  return map[cat] ?? 'chip-gray'
}

const HOURLY_PATTERN = [
  { hour: '00', db: 38 }, { hour: '01', db: 36 }, { hour: '02', db: 35 },
  { hour: '03', db: 34 }, { hour: '04', db: 35 }, { hour: '05', db: 37 },
  { hour: '06', db: 48 }, { hour: '07', db: 56 }, { hour: '08', db: 62 },
  { hour: '09', db: 60 }, { hour: '10', db: 58 }, { hour: '11', db: 59 },
  { hour: '12', db: 63 }, { hour: '13', db: 64 }, { hour: '14', db: 60 },
  { hour: '15', db: 58 }, { hour: '16', db: 59 }, { hour: '17', db: 65 },
  { hour: '18', db: 66 }, { hour: '19', db: 62 }, { hour: '20', db: 55 },
  { hour: '21', db: 50 }, { hour: '22', db: 45 }, { hour: '23', db: 41 },
]

export default function NoisePage() {
  const { data } = useSWR('/api/sensors', fetcher, { refreshInterval: 10000 })
  const sensors: any[] = data?.noise ?? []

  const avgDb   = sensors.length
    ? (sensors.reduce((s: number, n: any) => s + (n.noiseLevel ?? 0), 0) / sensors.length).toFixed(1)
    : '--'
  const maxDb   = sensors.length ? Math.max(...sensors.map((n: any) => n.noiseLevel ?? 0)).toFixed(1) : '--'
  const loudZones = sensors.filter((n: any) => (n.noiseLevel ?? 0) > 65).length
  const currentHour = new Date().getHours()

  return (
    <div className="dashboard-shell">
      <Sidebar />
      <div className="main-content">
        <header className="topbar">
          <div style={{ fontWeight: 600, fontSize: 14 }}>Noise pollution — Irfane district</div>
          <span className="chip chip-blue">{sensors.length} monitoring zones</span>
        </header>
        <div className="page-content">
          <div className="kpi-grid">
            <div className="kpi-card" style={{ '--accent': '#2563eb' } as any}>
              <div className="kpi-label"><i className="ti ti-volume" />Avg noise level</div>
              <div className="kpi-value" style={{ color: noiseColor(Number(avgDb)) }}>{avgDb}</div>
              <div className="kpi-sub">dB across all zones</div>
            </div>
            <div className="kpi-card" style={{ '--accent': '#dc2626' } as any}>
              <div className="kpi-label"><i className="ti ti-volume-3" />Peak level</div>
              <div className="kpi-value" style={{ color: noiseColor(Number(maxDb)) }}>{maxDb}</div>
              <div className="kpi-sub">dB maximum recorded</div>
            </div>
            <div className="kpi-card" style={{ '--accent': '#d97706' } as any}>
              <div className="kpi-label"><i className="ti ti-alert-triangle" />Loud zones</div>
              <div className="kpi-value" style={{ color: loudZones > 0 ? '#dc2626' : '#1a1d23' }}>{loudZones}</div>
              <div className="kpi-sub">above 65 dB threshold</div>
            </div>
            <div className="kpi-card" style={{ '--accent': '#16a34a' } as any}>
              <div className="kpi-label"><i className="ti ti-clock" />Time of day</div>
              <div className="kpi-value" style={{ fontSize: 18 }}>
                {currentHour >= 22 || currentHour < 6 ? 'Night' : currentHour < 8 ? 'Dawn' : currentHour < 18 ? 'Day' : 'Evening'}
              </div>
              <div className="kpi-sub">{String(currentHour).padStart(2,'0')}:00 local time</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {/* Sensor cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {sensors.map((n: any) => (
                <div key={n.id} className="card">
                  <div className="card-header">
                    <span className="card-title"><i className="ti ti-ear" />{n.name}</span>
                    <span className={`chip ${categoryChip(n.noiseCategory)}`}>{n.noiseCategory}</span>
                  </div>
                  <div className="card-body">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
                      <div style={{
                        width: 64, height: 64, borderRadius: '50%',
                        border: `4px solid ${noiseColor(n.noiseLevel ?? 0)}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <div>
                          <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1, textAlign: 'center', color: noiseColor(n.noiseLevel ?? 0) }}>
                            {n.noiseLevel?.toFixed(0) ?? '--'}
                          </div>
                          <div style={{ fontSize: 10, color: '#94a3b8', textAlign: 'center' }}>dB</div>
                        </div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                          <div>
                            <div className="kpi-label">Average</div>
                            <div style={{ fontSize: 14, fontWeight: 600 }}>{n.noiseAverage?.toFixed(1) ?? '--'} dB</div>
                          </div>
                          <div>
                            <div className="kpi-label">Peak</div>
                            <div style={{ fontSize: 14, fontWeight: 600 }}>{n.noisePeak?.toFixed(1) ?? '--'} dB</div>
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* Mini level bar */}
                    <div>
                      <div style={{ height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{
                          width: `${Math.min(((n.noiseLevel ?? 0) / 90) * 100, 100)}%`,
                          height: '100%', background: noiseColor(n.noiseLevel ?? 0),
                          borderRadius: 3, transition: 'width 1s ease',
                        }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                        <span style={{ fontSize: 9, color: '#94a3b8' }}>30 dB</span>
                        <span style={{ fontSize: 9, color: '#d97706' }}>65 dB</span>
                        <span style={{ fontSize: 9, color: '#dc2626' }}>90 dB</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {sensors.length === 0 && (
                <div className="card" style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>
                  No noise data yet
                </div>
              )}
            </div>

            {/* Time-of-day pattern */}
            <div className="card">
              <div className="card-header">
                <span className="card-title"><i className="ti ti-chart-bar" />Typical 24h noise pattern</span>
                <span className="chip chip-gray">simulated average</span>
              </div>
              <div className="card-body">
                <div style={{ height: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={HOURLY_PATTERN} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                      <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} interval={2} />
                      <YAxis hide domain={[30, 75]} />
                      <Tooltip
                        contentStyle={{ fontSize: 12, border: '1px solid #e2e8ef', borderRadius: 6 }}
                        formatter={(v: any) => [`${v} dB`, 'Noise level']}
                        labelFormatter={(l) => `${l}:00`}
                      />
                      <ReferenceLine y={65} stroke="#dc2626" strokeDasharray="4 3" strokeWidth={1} />
                      <ReferenceLine y={55} stroke="#d97706" strokeDasharray="4 3" strokeWidth={1} />
                      <Bar dataKey="db" radius={[2, 2, 0, 0]}>
                        {HOURLY_PATTERN.map((entry, i) => (
                          <Cell key={i} fill={i === currentHour ? '#2563eb' : noiseColor(entry.db)} opacity={i === currentHour ? 1 : 0.7} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ display: 'flex', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#64748b' }}>
                    <div style={{ width: 8, height: 2, background: '#dc2626' }} />Loud threshold (65 dB)
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#64748b' }}>
                    <div style={{ width: 8, height: 2, background: '#d97706' }} />Moderate (55 dB)
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#64748b' }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: '#2563eb' }} />Current hour
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}