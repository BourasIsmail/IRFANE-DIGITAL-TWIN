import { NextResponse } from 'next/server'

const WEBHOOK = process.env.WEBHOOK_URL ?? 'http://localhost:5050'

export async function GET() {
  try {
    const [alerts, summary] = await Promise.all([
      fetch(`${WEBHOOK}/alerts?limit=50`, { cache: 'no-store' }).then(r => r.ok ? r.json() : { alerts: [] }),
      fetch(`${WEBHOOK}/alerts/summary`,  { cache: 'no-store' }).then(r => r.ok ? r.json() : { total: 0, by_severity: {}, by_type: {} }),
    ])
    return NextResponse.json({ alerts: alerts.alerts || [], summary })
  } catch {
    return NextResponse.json({ alerts: [], summary: { total: 0, by_severity: {}, by_type: {} } })
  }
}