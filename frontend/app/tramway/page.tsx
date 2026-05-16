import { requireAuth } from '@/lib/session'
import { getEntities } from '@/lib/fiware'
import { Sidebar } from '@/components/layout/Sidebar'
import { TramwayMap } from '@/components/map/TramwayMap'

export default async function TramwayPage() {
  const session  = await requireAuth()
  const vehicles = await getEntities('Vehicle').catch(() => [])

  return (
    <div className="dashboard-shell">
      <Sidebar userEmail={session.userEmail} />
      <div className="main-content">
        <header className="topbar">
          <div style={{ fontWeight: 600, fontSize: 14 }}>Tramway T1 — live positions</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="live-dot" />
            <span style={{ fontSize: 12, color: '#64748b' }}>Updates every 3 seconds</span>
            <span className="chip chip-green">{vehicles.length} vehicles tracked</span>
          </div>
        </header>

        <div className="page-content">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16 }}>
            {/* Live map */}
            <div className="card" style={{ overflow: 'hidden' }}>
              <div className="card-header">
                <span className="card-title"><i className="ti ti-map-pin" />Live map</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#16a34a' }}>
                  <span className="live-dot" />
                  Live · 3s refresh
                </div>
              </div>
              <TramwayMap initialVehicles={vehicles} />
            </div>

            {/* Vehicle details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {vehicles.map((v: any) => {
                const [lat, lon] = (v.location || '0,0').split(',').map(Number)
                const statusColor = v.vehicleRunningStatus === 'inTransit' ? '#16a34a'
                  : v.vehicleRunningStatus === 'atStop' ? '#d97706' : '#64748b'
                return (
                  <div key={v.id} className="card">
                    <div className="card-header">
                      <span className="card-title"><i className="ti ti-train" />T1</span>
                      <span className="chip" style={{
                        background: statusColor + '15',
                        color: statusColor,
                        borderColor: statusColor + '40',
                      }}>
                        {v.vehicleRunningStatus}
                      </span>
                    </div>
                    <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: '#374151' }}>{v.direction}</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                        {[
                          ['Next stop', v.nextStopName],
                          ['Speed',     `${v.speed?.toFixed(0)} km/h`],
                          ['Passengers',v.passengerCount],
                          ['Heading',   `${v.heading}°`],
                        ].map(([label, val]) => (
                          <div key={label as string}>
                            <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                            <div style={{ fontSize: 12, fontWeight: 500, marginTop: 1 }}>{val}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{ fontSize: 10, color: '#b0bec5', marginTop: 2 }}>
                        {lat.toFixed(5)}°N, {Math.abs(lon).toFixed(5)}°W
                      </div>
                    </div>
                  </div>
                )
              })}

              {/* T1 stops legend */}
              <div className="card">
                <div className="card-header">
                  <span className="card-title"><i className="ti ti-route" />T1 line</span>
                </div>
                <div style={{ padding: '8px 14px' }}>
                  {['Hay Karima','Bab Lamrissa','Gare Sale Ville','Pont Hassan II',
                    'Bab Chellah','Gare Rabat Ville','Ibn Sina','Facultes','Agdal'
                  ].map((stop, i, arr) => (
                    <div key={stop} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: i < arr.length - 1 ? 0 : 0 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', border: '2px solid #7c3aed', background: '#fff' }} />
                        {i < arr.length - 1 && <div style={{ width: 2, height: 14, background: '#ddd6fe' }} />}
                      </div>
                      <div style={{ fontSize: 11, color: '#374151', paddingBottom: i < arr.length - 1 ? 0 : 0, lineHeight: 2 }}>{stop}</div>
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