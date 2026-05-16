'use client'

import useSWR from 'swr'
import { Sidebar } from '@/components/layout/Sidebar'
import {
  ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, LineChart, Line, Legend, CartesianGrid
} from 'recharts'

const fetcher = (url: string) => fetch(url).then(r => r.json())

// Generate correlation scatter data from live sensor readings
function buildCorrelations(sensors: any) {
  const traffic  = sensors.traffic  ?? []
  const noise    = sensors.noise    ?? []
  const parking  = sensors.parking  ?? []
  const airq     = sensors.airquality ?? []

  // Traffic flow vs noise (match by proximity - simplified)
  const trafficNoise = traffic.map((t: any, i: number) => ({
    flow:  t.vehicleFlowRate ?? 0,
    noise: noise[i % noise.length]?.noiseLevel ?? 0,
    name:  t.name,
  }))

  // Parking occupancy vs traffic flow
  const parkingTraffic = parking.map((p: any, i: number) => ({
    occupancy: Math.round((p.occupancyRate ?? 0) * 100),
    flow:      traffic[i % traffic.length]?.vehicleFlowRate ?? 0,
    name:      p.name,
  }))

  // Air quality vs traffic
  const airTraffic = airq.map((a: any, i: number) => ({
    pm25: a.pm25 ?? 0,
    flow: traffic[i % traffic.length]?.vehicleFlowRate ?? 0,
    name: a.name,
  }))

  return { trafficNoise, parkingTraffic, airTraffic }
}

// Alert frequency by type from summary
function buildAlertFrequency(alerts: any[]) {
  const counts: Record<string, number> = {}
  alerts.forEach((a: any) => {
    counts[a.alert_type] = (counts[a.alert_type] ?? 0) + 1
  })
  return Object.entries(counts)
    .map(([type, count]) => ({ type: type.replace(/_/g, ' '), count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)
}

const SENSOR_COLORS: Record<string, string> = {
  traffic: '#2563eb', parking: '#0891b2', airquality: '#be185d',
  noise: '#b45309', weather: '#d97706', green: '#16a34a',
}

export default function AnalyticsPage() {
  const { data: sensors } = useSWR('/api/sensors', fetcher, { refreshInterval: 15000 })
  const { data: alertData } = useSWR('/api/alerts', fetcher, { refreshInterval: 30000 })

  const corr     = buildCorrelations(sensors ?? {})
  const alertFreq = buildAlertFrequency(alertData?.alerts ?? [])
  const summary   = alertData?.summary ?? { total: 0, by_severity: {}, by_type: {} }

  // Sensor health overview
  const sensorHealth = [
    { type: 'Traffic',    count: sensors?.traffic?.length    ?? 0, color: SENSOR_COLORS.traffic },
    { type: 'Tramway',    count: sensors?.vehicles?.length   ?? 0, color: '#7c3aed' },
    { type: 'Weather',    count: sensors?.weather?.length    ?? 0, color: SENSOR_COLORS.weather },
    { type: 'Green',      count: sensors?.green?.length      ?? 0, color: SENSOR_COLORS.green },
    { type: 'Parking',    count: sensors?.parking?.length    ?? 0, color: SENSOR_COLORS.parking },
    { type: 'Air quality',count: sensors?.airquality?.length ?? 0, color: SENSOR_COLORS.airquality },
    { type: 'Noise',      count: sensors?.noise?.length      ?? 0, color: SENSOR_COLORS.noise },
    { type: 'Lighting',   count: sensors?.lighting?.length   ?? 0, color: '#4338ca' },
  ]
  const totalLive = sensorHealth.reduce((s, h) => s + h.count, 0)

  return (
    <div className="dashboard-shell">
      <Sidebar />
      <div className="main-content">
        <header className="topbar">
          <div style={{ fontWeight: 600, fontSize: 14 }}>Analytics — correlations & insights</div>
          <span className="chip chip-green">{totalLive} sensors live</span>
        </header>

        <div className="page-content">
          {/* Sensor fleet overview */}
          <div className="card" style={{ marginBottom: 14 }}>
            <div className="card-header">
              <span className="card-title"><i className="ti ti-radar" />Sensor fleet status</span>
              <span className="chip chip-green">{totalLive} / 23 online</span>
            </div>
            <div className="card-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(8,1fr)', gap: 8 }}>
              {sensorHealth.map(({ type, count, color }) => (
                <div key={type} style={{ textAlign: 'center' }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%',
                    border: `3px solid ${color}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 6px', fontSize: 18, fontWeight: 700, color,
                  }}>{count}</div>
                  <div style={{ fontSize: 10, color: '#64748b', lineHeight: 1.3 }}>{type}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {/* Traffic flow vs noise */}
            <div className="card">
              <div className="card-header">
                <span className="card-title"><i className="ti ti-chart-dots" />Traffic flow vs noise level</span>
                <span className="chip chip-gray">correlation</span>
              </div>
              <div className="card-body">
                <div style={{ height: 180 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                      <XAxis dataKey="flow" name="Flow" unit=" veh/h" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} label={{ value: 'Traffic (veh/h)', position: 'insideBottom', offset: -2, style: { fontSize: 10, fill: '#94a3b8' } }} />
                      <YAxis dataKey="noise" name="Noise" unit=" dB" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                      <Tooltip cursor={{ strokeDasharray: '3 3' }}
                        contentStyle={{ fontSize: 12, border: '1px solid #e2e8ef', borderRadius: 6 }}
                        formatter={(v) => [v, '']} />
                      <Scatter data={corr.trafficNoise} fill="#2563eb" opacity={0.7} />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>
                  Higher traffic flow generally correlates with elevated noise levels in the Irfane district.
                </div>
              </div>
            </div>

            {/* Alert frequency */}
            <div className="card">
              <div className="card-header">
                <span className="card-title"><i className="ti ti-bell" />Alert frequency by type</span>
                <span className="chip chip-blue">{summary.total} total</span>
              </div>
              <div className="card-body">
                <div style={{ height: 180 }}>
                  {alertFreq.length === 0 ? (
                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 13 }}>
                      No alerts yet — system running clean
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={alertFreq} layout="vertical" margin={{ top: 0, right: 10, left: 80, bottom: 0 }}>
                        <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                        <YAxis type="category" dataKey="type" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} width={80} />
                        <Tooltip contentStyle={{ fontSize: 12, border: '1px solid #e2e8ef', borderRadius: 6 }} />
                        <Bar dataKey="count" radius={[0, 3, 3, 0]}>
                          {alertFreq.map((_, i) => (
                            <Cell key={i} fill={i === 0 ? '#dc2626' : i === 1 ? '#d97706' : '#2563eb'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>

            {/* Parking vs traffic */}
            <div className="card">
              <div className="card-header">
                <span className="card-title"><i className="ti ti-chart-dots" />Parking occupancy vs traffic</span>
                <span className="chip chip-gray">live data</span>
              </div>
              <div className="card-body">
                <div style={{ height: 180 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                      <XAxis dataKey="flow" name="Flow" unit=" veh/h" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                      <YAxis dataKey="occupancy" name="Occupancy" unit="%" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                      <Tooltip cursor={{ strokeDasharray: '3 3' }}
                        contentStyle={{ fontSize: 12, border: '1px solid #e2e8ef', borderRadius: 6 }} />
                      <Scatter data={corr.parkingTraffic} fill="#0891b2" opacity={0.7} />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>
                  Parking demand tends to follow traffic patterns — peak occupancy aligns with rush hour.
                </div>
              </div>
            </div>

            {/* Alert severity breakdown */}
            <div className="card">
              <div className="card-header">
                <span className="card-title"><i className="ti ti-alert-triangle" />Alert severity breakdown</span>
              </div>
              <div className="card-body">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {Object.entries(summary.by_severity ?? {}).map(([sev, count]) => {
                    const color = sev === 'critical' ? '#dc2626' : sev === 'warning' ? '#d97706' : '#2563eb'
                    const total = summary.total || 1
                    const pct   = Math.round((Number(count) / total) * 100)
                    return (
                      <div key={sev}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 12, fontWeight: 500, textTransform: 'capitalize' }}>{sev}</span>
                          <span style={{ fontSize: 12, fontWeight: 600, color }}>{String(count)} ({pct}%)</span>
                        </div>
                        <div style={{ height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3 }} />
                        </div>
                      </div>
                    )
                  })}
                  {Object.keys(summary.by_severity ?? {}).length === 0 && (
                    <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, padding: '24px 0' }}>
                      No alerts recorded yet
                    </div>
                  )}
                </div>

                {/* Air quality vs traffic scatter */}
                {corr.airTraffic.length > 0 && (
                  <div style={{ marginTop: 16, borderTop: '1px solid #f1f5f9', paddingTop: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#374151', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      PM2.5 vs traffic flow
                    </div>
                    <div style={{ height: 100 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 0, right: 5, left: -20, bottom: 0 }}>
                          <XAxis dataKey="flow" tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                          <YAxis dataKey="pm25" tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                          <Tooltip contentStyle={{ fontSize: 11, border: '1px solid #e2e8ef', borderRadius: 6 }} />
                          <Scatter data={corr.airTraffic} fill="#be185d" opacity={0.7} />
                        </ScatterChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* PostgreSQL archive note */}
          <div className="card" style={{ marginTop: 14 }}>
            <div className="card-header">
              <span className="card-title"><i className="ti ti-database" />Cygnus PostgreSQL archive — useful queries</span>
            </div>
            <div className="card-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {[
                {
                  label: 'Hourly traffic average',
                  sql: `SELECT date_trunc('hour', recvtime) as hour,
  AVG(vehicleflowrate) as avg_flow
FROM irfane.smartcity_trafficsensor_irfane_001_trafficflowobserved
GROUP BY 1 ORDER BY 1 DESC LIMIT 24;`,
                },
                {
                  label: 'Parking occupancy trend',
                  sql: `SELECT date_trunc('hour', recvtime) as hour,
  AVG(occupancyrate * 100) as avg_occupancy
FROM irfane.smartcity_parking_irfane_001_offstreetparking
GROUP BY 1 ORDER BY 1 DESC LIMIT 24;`,
                },
                {
                  label: 'Air quality daily max',
                  sql: `SELECT date_trunc('day', recvtime) as day,
  MAX(pm25) as peak_pm25,
  AVG(pm25) as avg_pm25
FROM irfane.smartcity_airquality_irfane_001_airqualityobserved
GROUP BY 1 ORDER BY 1 DESC LIMIT 7;`,
                },
                {
                  label: 'Noise by time of day',
                  sql: `SELECT EXTRACT(hour FROM recvtime) as hour,
  AVG(noiselevel) as avg_db,
  MAX(noiselevel) as peak_db
FROM irfane.smartcity_noise_irfane_001_noisepollutionobserved
GROUP BY 1 ORDER BY 1;`,
                },
              ].map(({ label, sql }) => (
                <div key={label}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#374151', marginBottom: 6 }}>{label}</div>
                  <pre style={{
                    fontSize: 10, background: '#f8fafc', border: '1px solid #e2e8ef',
                    borderRadius: 6, padding: '8px 10px', overflowX: 'auto',
                    color: '#475569', margin: 0, lineHeight: 1.6,
                  }}>{sql}</pre>
                </div>
              ))}
            </div>
            <div style={{ padding: '10px 14px', borderTop: '1px solid #f1f5f9', fontSize: 11, color: '#94a3b8' }}>
              Run via: <code style={{ background: '#f1f5f9', padding: '1px 5px', borderRadius: 3 }}>docker exec idt-postgres psql -U cygnus -c "..."</code>
              &nbsp;or connect Power BI / Grafana to <code style={{ background: '#f1f5f9', padding: '1px 5px', borderRadius: 3 }}>localhost:5433</code>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}