import { requireAuth } from '@/lib/session'
import { getAlerts, getAlertSummary, formatDateTime } from '@/lib/fiware'
import { Sidebar } from '@/components/layout/Sidebar'

export const revalidate = 5

const severityStyle: Record<string, { bg: string, color: string }> = {
  critical: { bg: '#FCEBEB', color: '#A32D2D' },
  warning:  { bg: '#FAEEDA', color: '#854F0B' },
  info:     { bg: '#E6F1FB', color: '#185FA5' },
}

const typeLabel: Record<string, string> = {
  traffic_congestion:   'Traffic congestion',
  traffic_high_flow:    'High vehicle flow',
  high_temperature:     'High temperature',
  low_humidity:         'Low humidity',
  irrigation_needed:    'Irrigation needed',
  grass_poor:           'Grass poor condition',
  tram_stopped:         'Tram stopped',
}

export default async function AlertsPage() {
  const session  = await requireAuth()
  const [data, summary] = await Promise.all([
    getAlerts({ limit: 100 }),
    getAlertSummary(),
  ])

  const alerts  = data.alerts || []
  const criticalCount = (summary.by_severity?.critical || 0) + (summary.by_severity?.warning || 0)

  return (
    <div className="dashboard-shell">
      <Sidebar alertCount={criticalCount} userEmail={session.userEmail} />

      <div className="main-content">
        <header className="topbar">
          <div style={{ fontWeight: 500 }}>Alerts</div>
          <span className="badge badge-red">{summary.total} total</span>
        </header>

        <div className="page-content">
          {/* Summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
            {Object.entries(summary.by_severity || {}).map(([sev, count]) => (
              <div key={sev} className="kpi-card">
                <div className="kpi-label">{sev}</div>
                <div className="kpi-value" style={{ color: severityStyle[sev]?.color }}>
                  {count as number}
                </div>
              </div>
            ))}
          </div>

          {/* Alert list */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Alert history</span>
              <span style={{ fontSize: 12, color: '#888780' }}>{alerts.length} shown</span>
            </div>
            <div>
              {alerts.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', color: '#888780', fontSize: 13 }}>
                  No alerts yet
                </div>
              ) : alerts.map((a: any) => (
                <div key={a.id} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  padding: '12px 16px', borderBottom: '0.5px solid rgba(0,0,0,0.05)',
                }}>
                  <span className="badge" style={severityStyle[a.severity] || severityStyle.info}>
                    {a.severity}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>
                      {typeLabel[a.alert_type] || a.alert_type}
                    </div>
                    <div style={{ fontSize: 12, color: '#888780', marginTop: 2 }}>
                      {a.entity_id} · value: {a.value}
                    </div>
                    <div style={{ fontSize: 11, color: '#B4B2A9', marginTop: 2 }}>
                      {a.message}
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: '#B4B2A9', whiteSpace: 'nowrap' }}>
                    {formatDateTime(a.timestamp)}
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