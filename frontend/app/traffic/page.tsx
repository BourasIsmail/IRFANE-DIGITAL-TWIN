import { requireAuth } from '@/lib/session'
import { getEntities, getHistory, congestionColor, formatTime } from '@/lib/fiware'
import { Sidebar } from '@/components/layout/Sidebar'
import { TrafficChart } from '@/components/charts/TrafficChart'

export const revalidate = 5

export default async function TrafficPage() {
  const session = await requireAuth()
  const sensors = await getEntities('TrafficFlowObserved').catch(() => [])

  const histories = await Promise.allSettled(
    sensors.map((s: any) => getHistory(s.id, 'vehicleFlowRate', 24))
  )

  return (
    <div className="dashboard-shell">
      <Sidebar userEmail={session.userEmail} />

      <div className="main-content">
        <header className="topbar">
          <div style={{ fontWeight: 500 }}>Traffic sensors</div>
          <span style={{ fontSize: 12, color: '#888780' }}>{sensors.length} intersections</span>
        </header>

        <div className="page-content">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {sensors.map((s: any, i: number) => {
              const hist = histories[i].status === 'fulfilled' ? histories[i].value : { values: [], index: [] }
              const chartData = (hist.index || []).map((t: string, j: number) => ({
                time:  formatTime(t),
                flow:  hist.values?.[j] ?? 0,
              }))

              return (
                <div key={s.id} className="card">
                  <div className="card-header">
                    <span className="card-title">{s.name || s.id}</span>
                    <span className="badge" style={{
                      background: congestionColor(s.congestionLevel) + '22',
                      color:      congestionColor(s.congestionLevel),
                    }}>
                      {s.congestionLevel}
                    </span>
                  </div>
                  <div className="card-body">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 16 }}>
                      <div>
                        <div className="kpi-label">Flow rate</div>
                        <div style={{ fontSize: 18, fontWeight: 500 }}>{s.vehicleFlowRate}</div>
                        <div style={{ fontSize: 11, color: '#888780' }}>veh/h</div>
                      </div>
                      <div>
                        <div className="kpi-label">Avg speed</div>
                        <div style={{ fontSize: 18, fontWeight: 500 }}>{s.averageVehicleSpeed?.toFixed(0)}</div>
                        <div style={{ fontSize: 11, color: '#888780' }}>km/h</div>
                      </div>
                      <div>
                        <div className="kpi-label">Occupancy</div>
                        <div style={{ fontSize: 18, fontWeight: 500 }}>{((s.occupancy || 0) * 100).toFixed(0)}%</div>
                        <div style={{ fontSize: 11, color: '#888780' }}>of capacity</div>
                      </div>
                    </div>
                    <TrafficChart data={chartData} color="#378ADD" />
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