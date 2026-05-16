'use client'

import useSWR from 'swr'
import { Sidebar } from '@/components/layout/Sidebar'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const WHO = {
  pm25: { good: 12,  moderate: 35,  label: 'PM2.5', unit: 'µg/m³' },
  pm10: { good: 45,  moderate: 100, label: 'PM10',  unit: 'µg/m³' },
  no2:  { good: 40,  moderate: 100, label: 'NO₂',   unit: 'µg/m³' },
  o3:   { good: 60,  moderate: 120, label: 'O₃',    unit: 'µg/m³' },
  co:   { good: 1.0, moderate: 3.0, label: 'CO',    unit: 'mg/m³' },
}

function pollutantColor(key: string, value: number) {
  const t = WHO[key as keyof typeof WHO]
  if (!t) return '#64748b'
  if (value <= t.good)     return '#16a34a'
  if (value <= t.moderate) return '#d97706'
  return '#dc2626'
}

function aqiColor(aqi: string) {
  const m: Record<string,string> = {
    good: '#16a34a', moderate: '#d97706',
    unhealthySensitive: '#ea580c', unhealthy: '#dc2626',
  }
  return m[aqi] ?? '#64748b'
}

function PollutantBar({ label, value, good, moderate, unit }: any) {
  const max   = moderate * 2
  const pct   = Math.min((value / max) * 100, 100)
  const goodPct = (good / max) * 100
  const modPct  = (moderate / max) * 100
  const color   = value <= good ? '#16a34a' : value <= moderate ? '#d97706' : '#dc2626'

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 12, fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color }}>{value} {unit}</span>
      </div>
      <div style={{ position: 'relative', height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
        {/* WHO threshold markers */}
        <div style={{ position: 'absolute', left: `${goodPct}%`, top: 0, bottom: 0, width: 1, background: '#16a34a', opacity: 0.6 }} />
        <div style={{ position: 'absolute', left: `${modPct}%`, top: 0, bottom: 0, width: 1, background: '#d97706', opacity: 0.6 }} />
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 1s ease' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
        <span style={{ fontSize: 9, color: '#94a3b8' }}>0</span>
        <span style={{ fontSize: 9, color: '#16a34a' }}>WHO: {good}</span>
        <span style={{ fontSize: 9, color: '#d97706' }}>Mod: {moderate}</span>
      </div>
    </div>
  )
}

export default function AirQualityPage() {
  const { data } = useSWR('/api/sensors', fetcher, { refreshInterval: 10000 })
  const stations: any[] = data?.airquality ?? []

  const avgPM25 = stations.length
    ? (stations.reduce((s: number, a: any) => s + (a.pm25 ?? 0), 0) / stations.length).toFixed(1)
    : '--'
  const worstAqi = stations.reduce((worst: string, a: any) => {
    const order = ['good','moderate','unhealthySensitive','unhealthy']
    return order.indexOf(a.airQualityIndex) > order.indexOf(worst) ? a.airQualityIndex : worst
  }, 'good')

  return (
    <div className="dashboard-shell">
      <Sidebar />
      <div className="main-content">
        <header className="topbar">
          <div style={{ fontWeight: 600, fontSize: 14 }}>Air quality — Irfane district</div>
          <span className="chip chip-blue">{stations.length} monitoring stations</span>
        </header>
        <div className="page-content">
          <div className="kpi-grid">
            <div className="kpi-card" style={{ '--accent': '#2563eb' } as any}>
              <div className="kpi-label"><i className="ti ti-wind" />Avg PM2.5</div>
              <div className="kpi-value" style={{ color: pollutantColor('pm25', Number(avgPM25)) }}>{avgPM25}</div>
              <div className="kpi-sub">µg/m³ · WHO limit: 12</div>
            </div>
            <div className="kpi-card" style={{ '--accent': aqiColor(worstAqi) } as any}>
              <div className="kpi-label"><i className="ti ti-leaf" />Overall AQI</div>
              <div className="kpi-value" style={{ color: aqiColor(worstAqi), fontSize: 18 }}>{worstAqi}</div>
              <div className="kpi-sub">worst across stations</div>
            </div>
            <div className="kpi-card" style={{ '--accent': '#16a34a' } as any}>
              <div className="kpi-label"><i className="ti ti-check" />Stations in range</div>
              <div className="kpi-value" style={{ color: '#16a34a' }}>
                {stations.filter((a: any) => a.airQualityIndex === 'good').length}
              </div>
              <div className="kpi-sub">of {stations.length} stations</div>
            </div>
            <div className="kpi-card" style={{ '--accent': '#dc2626' } as any}>
              <div className="kpi-label"><i className="ti ti-alert-triangle" />Alerts active</div>
              <div className="kpi-value" style={{ color: '#dc2626' }}>
                {stations.filter((a: any) => ['unhealthySensitive','unhealthy'].includes(a.airQualityIndex)).length}
              </div>
              <div className="kpi-sub">unhealthy readings</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {stations.map((a: any) => (
              <div key={a.id} className="card">
                <div className="card-header">
                  <span className="card-title"><i className="ti ti-building" />{a.name}</span>
                  <span className="chip" style={{
                    background: aqiColor(a.airQualityIndex) + '18',
                    color:      aqiColor(a.airQualityIndex),
                    borderColor:aqiColor(a.airQualityIndex) + '40',
                  }}>
                    {a.airQualityIndex}
                  </span>
                </div>
                <div className="card-body">
                  <PollutantBar label="PM2.5" value={a.pm25 ?? 0}  {...WHO.pm25} />
                  <PollutantBar label="PM10"  value={a.pm10 ?? 0}  {...WHO.pm10} />
                  <PollutantBar label="NO₂"   value={a.no2  ?? 0}  {...WHO.no2}  />
                  <PollutantBar label="O₃"    value={a.o3   ?? 0}  {...WHO.o3}   />
                  <PollutantBar label="CO"     value={a.co   ?? 0}  {...WHO.co}   />
                </div>
              </div>
            ))}
          </div>

          {/* WHO legend */}
          <div className="card" style={{ marginTop: 14 }}>
            <div className="card-header">
              <span className="card-title">WHO air quality guidelines</span>
            </div>
            <div className="card-body" style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              {[
                { color: '#16a34a', label: 'Good', desc: 'Within WHO guidelines' },
                { color: '#d97706', label: 'Moderate', desc: 'Sensitive groups affected' },
                { color: '#ea580c', label: 'Unhealthy (sensitive)', desc: 'Reduce outdoor activity' },
                { color: '#dc2626', label: 'Unhealthy', desc: 'Limit outdoor exposure' },
              ].map(({ color, label, desc }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 12, height: 12, borderRadius: 3, background: color, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color }}>{label}</div>
                    <div style={{ fontSize: 10, color: '#94a3b8' }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}