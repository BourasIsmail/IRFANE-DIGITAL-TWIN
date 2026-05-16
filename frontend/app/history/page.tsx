'use client'

import useSWR from 'swr'
import { useState } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { HistoryChart } from '@/components/charts/HistoryChart'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const SENSORS = [
  // Traffic
  { id: 'TrafficSensor:Irfane:001', label: 'Traffic — Allal Al Fassi',     attr: 'vehicleFlowRate',  unit: 'veh/h',  color: '#2563eb', group: 'Traffic' },
  { id: 'TrafficSensor:Irfane:002', label: 'Traffic — Mehdi Ben Barka',    attr: 'vehicleFlowRate',  unit: 'veh/h',  color: '#2563eb', group: 'Traffic' },
  { id: 'TrafficSensor:Irfane:003', label: 'Traffic — Rondpoint Ambassadeurs', attr: 'vehicleFlowRate', unit: 'veh/h', color: '#2563eb', group: 'Traffic' },
  { id: 'TrafficSensor:Irfane:004', label: 'Traffic — Bouabid Palestine',  attr: 'vehicleFlowRate',  unit: 'veh/h',  color: '#2563eb', group: 'Traffic' },
  // Tramway
  { id: 'Tramway:Rabat:T1:001',     label: 'Tram T1 → Agdal — speed',     attr: 'speed',            unit: 'km/h',   color: '#7c3aed', group: 'Tramway' },
  { id: 'Tramway:Rabat:T1:002',     label: 'Tram T1 → Hay Karima — speed',attr: 'speed',            unit: 'km/h',   color: '#7c3aed', group: 'Tramway' },
  // Weather
  { id: 'WeatherStation:Irfane:001',label: 'Weather — Parc Irfane — temp',attr: 'temperature',      unit: '°C',     color: '#d97706', group: 'Weather' },
  { id: 'WeatherStation:Irfane:002',label: 'Weather — Allal Al Fassi — temp', attr: 'temperature',  unit: '°C',     color: '#d97706', group: 'Weather' },
  { id: 'WeatherStation:Irfane:001',label: 'Weather — humidity',           attr: 'relativeHumidity', unit: '%',      color: '#0891b2', group: 'Weather' },
  { id: 'WeatherStation:Irfane:001',label: 'Weather — wind speed',         attr: 'windSpeed',        unit: 'km/h',   color: '#0ea5e9', group: 'Weather' },
  // Green spaces
  { id: 'GreenSpace:Irfane:001',    label: 'Green — Jardin Irfane Nord',   attr: 'soilMoisture',     unit: '%',      color: '#16a34a', group: 'Green' },
  { id: 'GreenSpace:Irfane:002',    label: 'Green — Square Hay Riad',      attr: 'soilMoisture',     unit: '%',      color: '#16a34a', group: 'Green' },
  { id: 'GreenSpace:Irfane:003',    label: 'Green — Bande Verte Ibn Sina', attr: 'soilMoisture',     unit: '%',      color: '#16a34a', group: 'Green' },
  // Parking
  { id: 'Parking:Irfane:001',       label: 'Parking — Allal Al Fassi',     attr: 'availableSpotNumber', unit: 'spots', color: '#0891b2', group: 'Parking' },
  { id: 'Parking:Irfane:002',       label: 'Parking — Ibn Sina',           attr: 'availableSpotNumber', unit: 'spots', color: '#0891b2', group: 'Parking' },
  { id: 'Parking:Irfane:003',       label: 'Parking — Hay Riad Centre',    attr: 'availableSpotNumber', unit: 'spots', color: '#0891b2', group: 'Parking' },
  { id: 'Parking:Irfane:004',       label: 'Parking — Ambassadeurs',       attr: 'availableSpotNumber', unit: 'spots', color: '#0891b2', group: 'Parking' },
  // Air quality
  { id: 'AirQuality:Irfane:001',    label: 'Air — Irfane Centre — PM2.5',  attr: 'pm25',             unit: 'µg/m³',  color: '#be185d', group: 'Air' },
  { id: 'AirQuality:Irfane:002',    label: 'Air — Ibn Sina — PM2.5',       attr: 'pm25',             unit: 'µg/m³',  color: '#be185d', group: 'Air' },
  // Noise
  { id: 'Noise:Irfane:001',         label: 'Noise — Zone Commerciale',     attr: 'noiseLevel',       unit: 'dB',     color: '#b45309', group: 'Noise' },
  { id: 'Noise:Irfane:002',         label: 'Noise — Zone Résidentielle',   attr: 'noiseLevel',       unit: 'dB',     color: '#b45309', group: 'Noise' },
  { id: 'Noise:Irfane:003',         label: 'Noise — Ibn Sina Carrefour',   attr: 'noiseLevel',       unit: 'dB',     color: '#b45309', group: 'Noise' },
  // Lighting
  { id: 'Lighting:Irfane:001',      label: 'Lighting — Cabinet 1',         attr: 'energyConsumed',   unit: 'kWh',    color: '#f59e0b', group: 'Lighting' },
]

const GROUPS = ['All', 'Traffic', 'Tramway', 'Weather', 'Green', 'Parking', 'Air', 'Noise', 'Lighting']
const RANGES = [
  { label: 'Last 1h',  lastN: 12  },
  { label: 'Last 6h',  lastN: 72  },
  { label: 'Last 24h', lastN: 288 },
]

function SensorChart({ sensor, lastN }: { sensor: typeof SENSORS[0]; lastN: number }) {
  const url = `/api/historical?entityId=${encodeURIComponent(sensor.id)}&attr=${sensor.attr}&lastN=${lastN}`
  const { data, isLoading } = useSWR(url, fetcher, { revalidateOnFocus: false })

  const chartData = (data?.index ?? []).map((t: string, i: number) => ({
    time:  new Date(t).toLocaleTimeString('fr-MA', { hour: '2-digit', minute: '2-digit' }),
    value: data?.values?.[i] ?? 0,
  }))

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">{sensor.label}</span>
        <span className="chip chip-gray">{chartData.length} pts</span>
      </div>
      <div className="card-body">
        {isLoading ? (
          <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 12 }}>
            Loading...
          </div>
        ) : (
          <HistoryChart data={chartData} color={sensor.color} unit={sensor.unit} label={sensor.attr} />
        )}
      </div>
    </div>
  )
}

export default function HistoryPage() {
  const [group, setGroup]   = useState('All')
  const [rangeIdx, setRange] = useState(1)

  const filtered = group === 'All' ? SENSORS : SENSORS.filter(s => s.group === group)
  const { lastN } = RANGES[rangeIdx]

  return (
    <div className="dashboard-shell">
      <Sidebar />
      <div className="main-content">
        <header className="topbar">
          <div style={{ fontWeight: 600, fontSize: 14 }}>Historical data — all sensors</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: '#64748b' }}>
              {filtered.length} sensors
            </span>
          </div>
        </header>

        <div className="page-content">
          {/* Filters */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Group filter */}
            <div style={{ display: 'flex', gap: 4 }}>
              {GROUPS.map(g => (
                <button key={g} onClick={() => setGroup(g)} style={{
                  padding: '4px 10px', fontSize: 11, fontWeight: 500,
                  border: '1px solid',
                  borderColor: group === g ? '#2563eb' : '#e2e8ef',
                  borderRadius: 5,
                  background: group === g ? '#eff6ff' : '#fff',
                  color: group === g ? '#1d4ed8' : '#64748b',
                  cursor: 'pointer',
                }}>
                  {g}
                </button>
              ))}
            </div>

            <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
              {RANGES.map((r, i) => (
                <button key={r.label} onClick={() => setRange(i)} style={{
                  padding: '4px 10px', fontSize: 11, fontWeight: 500,
                  border: '1px solid',
                  borderColor: rangeIdx === i ? '#2563eb' : '#e2e8ef',
                  borderRadius: 5,
                  background: rangeIdx === i ? '#eff6ff' : '#fff',
                  color: rangeIdx === i ? '#1d4ed8' : '#64748b',
                  cursor: 'pointer',
                }}>
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Charts grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {filtered.map((sensor, i) => (
              <SensorChart key={`${sensor.id}-${sensor.attr}-${i}`} sensor={sensor} lastN={lastN} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}