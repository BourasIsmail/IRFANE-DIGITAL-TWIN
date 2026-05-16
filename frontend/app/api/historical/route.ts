import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'

const QL      = process.env.QL_URL             ?? 'http://localhost:8668'
const SERVICE = process.env.FIWARE_SERVICE     ?? 'irfane'
const SPATH   = process.env.FIWARE_SERVICEPATH ?? '/smartcity'

const H = {
  'Fiware-Service':     SERVICE,
  'Fiware-ServicePath': SPATH,
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const entityId = searchParams.get('entityId') ?? ''
  const attr     = searchParams.get('attr')     ?? ''
  const lastN    = searchParams.get('lastN')    ?? '60'

  if (!entityId || !attr) {
    return NextResponse.json({ values: [], index: [] })
  }

  try {
    const res = await fetch(
      `${QL}/v2/entities/${encodeURIComponent(entityId)}/attrs/${attr}?lastN=${lastN}`,
      { headers: H, cache: 'no-store' }
    )
    if (!res.ok) return NextResponse.json({ values: [], index: [] })
    return NextResponse.json(await res.json())
  } catch {
    return NextResponse.json({ values: [], index: [] })
  }
}