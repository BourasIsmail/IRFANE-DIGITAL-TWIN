import { NextResponse } from 'next/server'

async function fetchType(type: string) {
  const ORION   = process.env.ORION_URL          ?? 'http://localhost:1026'
  const SERVICE = process.env.FIWARE_SERVICE     ?? 'irfane'
  const SPATH   = process.env.FIWARE_SERVICEPATH ?? '/smartcity'

  try {
    const res = await fetch(
      `${ORION}/v2/entities?type=${type}&options=keyValues&limit=100`,
      {
        headers: {
          'Fiware-Service':     SERVICE,
          'Fiware-ServicePath': SPATH,
        },
        cache: 'no-store',
      }
    )
    if (!res.ok) return []
    return res.json()
  } catch { return [] }
}

export async function GET() {
  const [traffic, vehicles, weather, green, parking, airquality, noise, lighting] =
    await Promise.all([
      fetchType('TrafficFlowObserved'),
      fetchType('Vehicle'),
      fetchType('WeatherObserved'),
      fetchType('GreenSpaceRecord'),
      fetchType('OffStreetParking'),
      fetchType('AirQualityObserved'),
      fetchType('NoisePollutionObserved'),
      fetchType('StreetlightControlCabinet'),
    ])

  return NextResponse.json(
    {
      traffic, vehicles, weather, green,
      parking, airquality, noise, lighting,
      total: traffic.length + vehicles.length + weather.length + green.length +
             parking.length + airquality.length + noise.length + lighting.length,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}