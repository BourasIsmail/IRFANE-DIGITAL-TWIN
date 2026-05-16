import { requireAuth } from '@/lib/session'
import { getEntities, grassColor } from '@/lib/fiware'
import { Sidebar } from '@/components/layout/Sidebar'

export const revalidate = 5

export default async function GreenPage() {
  const session = await requireAuth()
  const spaces  = await getEntities('GreenSpaceRecord').catch(() => [])

  const needsWater = spaces.filter((g: any) => g.needsIrrigation)
  const irrigating = spaces.filter((g: any) => g.irrigationActive)

  return (
    <div className="dashboard-shell">
      <Sidebar userEmail={session.userEmail} />

      <div className="main-content">
        <header className="topbar">
          <div style={{ fontWeight: 500 }}>Green spaces</div>
          <span style={{ fontSize: 12, color: '#888780' }}>3 parks · Irfane district</span>
        </header>

        <div className="page-content">
          <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
            <div className="kpi-card">
              <div className="kpi-label">Parks monitored</div>
              <div className="kpi-value">{spaces.length}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Needs irrigation</div>
              <div className="kpi-value" style={{ color: needsWater.length > 0 ? '#E24B4A' : '#1D9E75' }}>
                {needsWater.length}
              </div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Currently irrigating</div>
              <div className="kpi-value" style={{ color: '#378ADD' }}>{irrigating.length}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
            {spaces.map((g: any) => (
              <div key={g.id} className="card">
                <div className="card-header">
                  <span className="card-title">{g.name}</span>
                  <span className="badge" style={{
                    background: grassColor(g.grassCondition) + '22',
                    color:      grassColor(g.grassCondition),
                  }}>
                    {g.grassCondition}
                  </span>
                </div>
                <div className="card-body">
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, color: '#888780' }}>Soil moisture</span>
                      <span style={{ fontSize: 12, fontWeight: 500, color: grassColor(g.grassCondition) }}>
                        {g.soilMoisture}%
                      </span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{
                        width: `${g.soilMoisture}%`,
                        background: grassColor(g.grassCondition),
                      }} />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div>
                      <div className="kpi-label">NDVI index</div>
                      <div style={{ fontSize: 16, fontWeight: 500 }}>{g.ndviIndex?.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="kpi-label">Soil temp</div>
                      <div style={{ fontSize: 16, fontWeight: 500 }}>{g.soilTemperature}°C</div>
                    </div>
                    <div>
                      <div className="kpi-label">Area</div>
                      <div style={{ fontSize: 16, fontWeight: 500 }}>
                        {(g.areaServed / 1000).toFixed(1)}k m²
                      </div>
                    </div>
                    <div>
                      <div className="kpi-label">Last irrigation</div>
                      <div style={{ fontSize: 16, fontWeight: 500 }}>
                        {g.hoursSinceLastIrrigation?.toFixed(0)}h ago
                      </div>
                    </div>
                  </div>

                  {g.needsIrrigation && (
                    <div style={{
                      marginTop: 12, padding: '8px 10px', background: '#FAEEDA',
                      borderRadius: 6, fontSize: 12, color: '#854F0B',
                    }}>
                      Irrigation required — moisture below 30%
                    </div>
                  )}
                  {g.irrigationActive && (
                    <div style={{
                      marginTop: 12, padding: '8px 10px', background: '#E6F1FB',
                      borderRadius: 6, fontSize: 12, color: '#185FA5',
                    }}>
                      Irrigation active
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}