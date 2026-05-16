import { requireAuth } from '@/lib/session'
import { getEntities, getHistory, formatTime } from '@/lib/fiware'
import { Sidebar } from '@/components/layout/Sidebar'
import { WeatherChart } from '@/components/charts/WeatherChart'

export const revalidate = 5

export default async function WeatherPage() {
  const session  = await requireAuth()
  const stations = await getEntities('WeatherObserved').catch(() => [])

  const histories = await Promise.allSettled(
    stations.map((s: any) => getHistory(s.id, 'temperature', 48))
  )

  return (
    <div className="dashboard-shell">
      <Sidebar userEmail={session.userEmail} />

      <div className="main-content">
        <header className="topbar">
          <div style={{ fontWeight: 500 }}>Weather stations</div>
          <span style={{ fontSize: 12, color: '#888780' }}>Irfane district · Rabat</span>
        </header>

        <div className="page-content">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {stations.map((w: any, i: number) => {
              const hist = histories[i].status === 'fulfilled' ? histories[i].value : { values: [], index: [] }
              const chartData = (hist.index || []).map((t: string, j: number) => ({
                time: formatTime(t),
                temp: hist.values?.[j] ?? 0,
              }))

              return (
                <div key={w.id} className="card">
                  <div className="card-header">
                    <span className="card-title">{w.name}</span>
                    <span className="badge badge-amber">{w.weatherType}</span>
                  </div>
                  <div className="card-body">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 16 }}>
                      <div>
                        <div className="kpi-label">Temperature</div>
                        <div style={{ fontSize: 20, fontWeight: 500 }}>{w.temperature}°</div>
                      </div>
                      <div>
                        <div className="kpi-label">Humidity</div>
                        <div style={{ fontSize: 20, fontWeight: 500 }}>{w.relativeHumidity}%</div>
                      </div>
                      <div>
                        <div className="kpi-label">Wind</div>
                        <div style={{ fontSize: 20, fontWeight: 500 }}>{w.windSpeed?.toFixed(0)}</div>
                        <div style={{ fontSize: 11, color: '#888780' }}>km/h · {w.windDirection}°</div>
                      </div>
                      <div>
                        <div className="kpi-label">Pressure</div>
                        <div style={{ fontSize: 20, fontWeight: 500 }}>{w.atmosphericPressure?.toFixed(0)}</div>
                        <div style={{ fontSize: 11, color: '#888780' }}>hPa</div>
                      </div>
                    </div>
                    <WeatherChart data={chartData} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}