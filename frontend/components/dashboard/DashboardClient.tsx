'use client'

import useSWR from 'swr'
import Link from 'next/link'
import { useEffect, useRef } from 'react'

const fetcher = (url: string) => fetch(url).then(r => r.json())

function congestionColor(level: string) {
  const m: Record<string,string> = { free:'#16a34a',light:'#16a34a',moderate:'#d97706',heavy:'#dc2626',congested:'#dc2626' }
  return m[level] ?? '#64748b'
}
function grassColor(c: string) {
  return ({ good:'#16a34a', moderate:'#d97706', poor:'#dc2626' } as any)[c] ?? '#64748b'
}
function congestionChip(l: string) {
  return ({ free:'chip-green',light:'chip-green',moderate:'chip-amber',heavy:'chip-red',congested:'chip-red' } as any)[l] ?? 'chip-gray'
}

function SensorMap({ data }: { data: any }) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInst = useRef<any>(null)

  useEffect(() => {
    if (!mapRef.current || mapInst.current) return
    if ((mapRef.current as any)._leaflet_id) return
    let cancelled = false

    import('leaflet').then(L => {
      if (cancelled || !mapRef.current) return
      if ((mapRef.current as any)._leaflet_id) return

      const map = L.map(mapRef.current, { center: [33.993, -6.851], zoom: 14, zoomControl: true })
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
      }).addTo(map)

      const mkIcon = (color: string, label: string) => L.divIcon({
        html: `<div style="background:${color};color:#fff;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700;border:1.5px solid rgba(0,0,0,.2);white-space:nowrap">${label}</div>`,
        className: '', iconAnchor: [20, 12],
      })

      const addMarker = (entity: any, color: string, label: string, popup: string) => {
        if (!entity.location) return
        const [lat, lon] = entity.location.split(',').map(Number)
        if (isNaN(lat) || isNaN(lon)) return
        L.marker([lat, lon], { icon: mkIcon(color, label) })
          .bindPopup(popup).addTo(map)
      }

      data.traffic?.forEach((e: any) => addMarker(e, '#2563eb', 'TRF',
        `<b>${e.name}</b><br/>${e.vehicleFlowRate} veh/h · ${e.congestionLevel}`))
      data.vehicles?.forEach((e: any) => addMarker(e, '#7c3aed', 'T1',
        `<b>${e.direction}</b><br/>Next: ${e.nextStopName} · ${e.speed?.toFixed(0)} km/h`))
      data.weather?.forEach((e: any) => addMarker(e, '#d97706', 'WTH',
        `<b>${e.name}</b><br/>${e.temperature}°C · ${e.weatherType}`))
      data.green?.forEach((e: any) => addMarker(e, '#16a34a', 'GRN',
        `<b>${e.name}</b><br/>Moisture: ${e.soilMoisture}%`))
      data.parking?.forEach((e: any) => addMarker(e, '#0891b2', 'PRK',
        `<b>${e.name}</b><br/>Free: ${(e.availableSpotNumber ?? 0)}/${e.totalSpotNumber ?? '?'}`))
      data.airquality?.forEach((e: any) => addMarker(e, '#be185d', 'AIR',
        `<b>${e.name}</b><br/>PM2.5: ${e.pm25 ?? '--'} µg/m³`))
      data.noise?.forEach((e: any) => addMarker(e, '#b45309', 'NSE',
        `<b>${e.name}</b><br/>${e.noiseLevel ?? '--'} dB`))
      data.lighting?.forEach((e: any) => addMarker(e, '#4338ca', 'LIT',
        `<b>${e.name}</b><br/>Status: ${e.powerState ?? '--'}`))

      mapInst.current = map
    })

    return () => {
      cancelled = true
      if (mapInst.current) { mapInst.current.remove(); mapInst.current = null }
    }
  }, [])

  return (
    <>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <div ref={mapRef} style={{ height: 300 }} />
    </>
  )
}

export default function DashboardClient({ userEmail }: { userEmail: string }) {
  const { data, isLoading } = useSWR('/api/sensors', fetcher, {
    refreshInterval: 5000,
    revalidateOnFocus: false,
  })
  const { data: alertData } = useSWR('/api/alerts', fetcher, {
    refreshInterval: 10000,
    revalidateOnFocus: false,
  })

  const d = data ?? {}
  const traffic  = d.traffic  ?? []
  const vehicles = d.vehicles ?? []
  const weather  = d.weather  ?? []
  const green    = d.green    ?? []
  const parking  = d.parking  ?? []
  const airq     = d.airquality ?? []
  const noise    = d.noise    ?? []
  const lighting = d.lighting ?? []
  const total    = d.total    ?? 0

  const alerts  = alertData?.alerts  ?? []
  const summary = alertData?.summary ?? { total: 0, by_severity: {} }
  const critCount = (summary.by_severity?.critical ?? 0) + (summary.by_severity?.warning ?? 0)

  const avgFlow = traffic.length
    ? Math.round(traffic.reduce((s: number, e: any) => s + (e.vehicleFlowRate || 0), 0) / traffic.length) : 0
  const avgTemp = weather.length
    ? (weather.reduce((s: number, e: any) => s + (e.temperature || 0), 0) / weather.length).toFixed(1) : '--'
  const tramsRunning = vehicles.filter((v: any) => v.vehicleRunningStatus !== 'atStop').length
  const overallCongestion = avgFlow > 90 ? 'heavy' : avgFlow > 60 ? 'moderate' : avgFlow > 30 ? 'light' : 'free'

  return (
    <div className="page-content">
      {/* KPIs */}
      <div className="kpi-grid">
        <div className="kpi-card" style={{ '--accent': '#2563eb' } as any}>
          <div className="kpi-label"><i className="ti ti-traffic-lights" />Avg flow rate</div>
          <div className="kpi-value">{isLoading ? '…' : avgFlow}</div>
          <div className="kpi-sub" style={{ color: avgFlow > 70 ? '#d97706' : '#16a34a' }}>
            veh/h · {overallCongestion}
          </div>
        </div>
        <div className="kpi-card" style={{ '--accent': '#f59e0b' } as any}>
          <div className="kpi-label"><i className="ti ti-temperature" />Temperature</div>
          <div className="kpi-value">{isLoading ? '…' : `${avgTemp}°`}</div>
          <div className="kpi-sub">{weather[0]?.weatherType ?? '--'}</div>
        </div>
        <div className="kpi-card" style={{ '--accent': '#7c3aed' } as any}>
          <div className="kpi-label"><i className="ti ti-train" />Tramway T1</div>
          <div className="kpi-value">{isLoading ? '…' : `${tramsRunning} / 2`}</div>
          <div className="kpi-sub" style={{ color: '#16a34a' }}>
            {tramsRunning === 2 ? 'both in transit' : tramsRunning === 1 ? '1 in transit' : 'at stops'}
          </div>
        </div>
        <div className="kpi-card" style={{ '--accent': '#dc2626' } as any}>
          <div className="kpi-label"><i className="ti ti-bell" />Active alerts</div>
          <div className="kpi-value" style={{ color: critCount > 0 ? '#dc2626' : undefined }}>
            {isLoading ? '…' : summary.total}
          </div>
          <div className="kpi-sub" style={{ color: critCount > 0 ? '#dc2626' : '#64748b' }}>
            {critCount > 0 ? `${critCount} need attention` : 'all clear'}
          </div>
        </div>
      </div>

      {/* Extra KPIs for new sensors */}
      {(parking.length > 0 || airq.length > 0 || noise.length > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 18 }}>
          {parking.length > 0 && (
            <div className="kpi-card" style={{ '--accent': '#0891b2' } as any}>
              <div className="kpi-label"><i className="ti ti-car" />Parking</div>
              <div className="kpi-value">{parking.reduce((s: number, p: any) => s + (p.availableSpotNumber ?? 0), 0)}</div>
              <div className="kpi-sub">free spots across {parking.length} lots</div>
            </div>
          )}
          {airq.length > 0 && (
            <div className="kpi-card" style={{ '--accent': '#be185d' } as any}>
              <div className="kpi-label"><i className="ti ti-wind" />Air quality</div>
              <div className="kpi-value">{(airq.reduce((s: number, a: any) => s + (a.pm25 ?? 0), 0) / airq.length).toFixed(0)}</div>
              <div className="kpi-sub">avg PM2.5 µg/m³</div>
            </div>
          )}
          {noise.length > 0 && (
            <div className="kpi-card" style={{ '--accent': '#b45309' } as any}>
              <div className="kpi-label"><i className="ti ti-volume" />Noise level</div>
              <div className="kpi-value">{(noise.reduce((s: number, n: any) => s + (n.noiseLevel ?? 0), 0) / noise.length).toFixed(0)}</div>
              <div className="kpi-sub">avg dB across {noise.length} zones</div>
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {/* Map */}
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <div className="card-header">
            <span className="card-title"><i className="ti ti-map-pin" />Live sensor map — Irfane district</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {isLoading
                ? <span className="chip chip-gray">Loading…</span>
                : <span className="chip chip-green">{total} sensors</span>
              }
            </div>
          </div>
          {data ? <SensorMap data={d} /> : (
            <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
              <span style={{ color: '#94a3b8', fontSize: 13 }}>Loading map…</span>
            </div>
          )}
          <div style={{ padding: '8px 14px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {[['#2563eb','TRF','Traffic'],['#7c3aed','T1','Tramway'],['#d97706','WTH','Weather'],['#16a34a','GRN','Green'],
              ['#0891b2','PRK','Parking'],['#be185d','AIR','Air quality'],['#b45309','NSE','Noise'],['#4338ca','LIT','Lighting']
            ].map(([c,k,l]) => (
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: c }} />
                <span style={{ fontSize: 11, color: '#64748b' }}>{l}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Traffic */}
        <div className="card">
          <div className="card-header">
            <span className="card-title"><i className="ti ti-traffic-lights" />Traffic sensors</span>
            <Link href="/traffic" style={{ fontSize: 11, color: '#2563eb', textDecoration: 'none', fontWeight: 500 }}>View all →</Link>
          </div>
          <div className="card-body" style={{ padding: '4px 14px' }}>
            {traffic.length === 0
              ? <div style={{ padding: '12px 0', color: '#94a3b8', fontSize: 12 }}>No data</div>
              : traffic.map((e: any) => (
              <div key={e.id} className="sensor-row">
                <div>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>{e.name || e.id.split(':').pop()}</div>
                  <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 1 }}>
                    {e.vehicleFlowRate} veh/h · {e.averageVehicleSpeed?.toFixed(0)} km/h
                  </div>
                </div>
                <span className={`chip ${congestionChip(e.congestionLevel)}`}>{e.congestionLevel}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Alerts */}
        <div className="card">
          <div className="card-header">
            <span className="card-title"><i className="ti ti-bell" />Recent alerts</span>
            <Link href="/alerts" style={{ fontSize: 11, color: '#2563eb', textDecoration: 'none', fontWeight: 500 }}>All alerts →</Link>
          </div>
          <div className="card-body" style={{ padding: '4px 14px' }}>
            {alerts.length === 0
              ? <div style={{ padding: '12px 0', color: '#94a3b8', fontSize: 12 }}>No alerts yet</div>
              : alerts.slice(0, 5).map((a: any) => (
              <div key={a.id} className="sensor-row">
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>{a.message}</div>
                  <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 1 }}>{a.entity_id}</div>
                </div>
                <span className={`chip ${a.severity === 'critical' ? 'chip-red' : a.severity === 'warning' ? 'chip-amber' : 'chip-blue'}`}>
                  {a.severity}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Weather */}
        <div className="card">
          <div className="card-header">
            <span className="card-title"><i className="ti ti-cloud" />Weather stations</span>
            <Link href="/weather" style={{ fontSize: 11, color: '#2563eb', textDecoration: 'none', fontWeight: 500 }}>Details →</Link>
          </div>
          <div className="card-body" style={{ padding: '4px 14px' }}>
            {weather.length === 0
              ? <div style={{ padding: '12px 0', color: '#94a3b8', fontSize: 12 }}>No data</div>
              : weather.map((w: any) => (
              <div key={w.id} className="sensor-row">
                <div>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>{w.name}</div>
                  <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 1 }}>
                    {w.temperature}°C · {w.relativeHumidity}% RH · {w.windSpeed} km/h
                  </div>
                </div>
                <span className="chip chip-amber">{w.weatherType}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Green spaces */}
        <div className="card">
          <div className="card-header">
            <span className="card-title"><i className="ti ti-leaf" />Green spaces</span>
            <Link href="/green" style={{ fontSize: 11, color: '#2563eb', textDecoration: 'none', fontWeight: 500 }}>Details →</Link>
          </div>
          <div className="card-body">
            {green.length === 0
              ? <div style={{ color: '#94a3b8', fontSize: 12 }}>No data</div>
              : green.map((g: any) => (
              <div key={g.id} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontSize: 12, fontWeight: 500 }}>{g.name}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: grassColor(g.grassCondition) }}>{g.soilMoisture}%</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${g.soilMoisture}%`, background: grassColor(g.grassCondition) }} />
                </div>
                <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>
                  {g.grassCondition}{g.needsIrrigation ? ' · irrigation required' : ''}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}