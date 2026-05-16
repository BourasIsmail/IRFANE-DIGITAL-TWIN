'use client'

import { useEffect, useRef, useCallback } from 'react'
import useSWR from 'swr'

interface Vehicle {
  id:                   string
  location:             string
  direction:            string
  speed:                number
  nextStopName:         string
  vehicleRunningStatus: string
  passengerCount:       number
  heading:              number
}

const T1_STOPS = [
  { name: 'Hay Karima',       lat: 34.0400, lon: -6.7700 },
  { name: 'Bab Lamrissa',     lat: 34.0370, lon: -6.8160 },
  { name: 'Gare Sale Ville',  lat: 34.0375, lon: -6.8340 },
  { name: 'Pont Hassan II',   lat: 34.0295, lon: -6.8355 },
  { name: 'Bab Chellah',      lat: 34.0228, lon: -6.8330 },
  { name: 'Gare Rabat Ville', lat: 34.0205, lon: -6.8335 },
  { name: 'Ibn Sina',         lat: 33.9905, lon: -6.8520 },
  { name: 'Facultes',         lat: 33.9890, lon: -6.8540 },
  { name: 'Agdal',            lat: 33.9940, lon: -6.8600 },
]

const fetcher = (url: string) => fetch(url).then(r => r.json())

function statusColor(s: string) {
  if (s === 'inTransit')  return '#1d4ed8'
  if (s === 'atStop')     return '#16a34a'
  if (s === 'departing')  return '#d97706'
  return '#64748b'
}

export function TramwayMap({ initialVehicles }: { initialVehicles: Vehicle[] }) {
  const mapRef      = useRef<HTMLDivElement>(null)
  const mapInst     = useRef<any>(null)
  const markersRef  = useRef<Record<string, any>>({})
  const popupsRef   = useRef<Record<string, string>>({})
  const LRef        = useRef<any>(null)

  // SWR polling every 3 seconds
  const { data: vehicles = initialVehicles } = useSWR(
    '/api/vehicles',
    fetcher,
    { refreshInterval: 3000, revalidateOnFocus: false }
  )

  // Parse location string "lat,lon" → [lat, lon]
  const parseLocation = (loc: string): [number, number] | null => {
    const parts = (loc || '').split(',').map(Number)
    if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return null
    return [parts[0], parts[1]]
  }

  // Build popup HTML for a vehicle
  const buildPopup = (v: Vehicle) => `
    <div style="font-family:system-ui;font-size:12px;min-width:160px">
      <div style="font-weight:600;margin-bottom:4px;color:#1e293b">Tramway T1</div>
      <div style="color:#475569">${v.direction}</div>
      <hr style="border:none;border-top:1px solid #e2e8ef;margin:6px 0"/>
      <div style="display:flex;flex-direction:column;gap:3px">
        <div><span style="color:#94a3b8">Next stop:</span> <b>${v.nextStopName}</b></div>
        <div><span style="color:#94a3b8">Speed:</span> ${v.speed?.toFixed(0)} km/h</div>
        <div><span style="color:#94a3b8">Passengers:</span> ${v.passengerCount}</div>
        <div><span style="color:#94a3b8">Status:</span> 
          <span style="color:${statusColor(v.vehicleRunningStatus)};font-weight:500">${v.vehicleRunningStatus}</span>
        </div>
      </div>
    </div>
  `

  // Build marker icon HTML
  const buildIcon = useCallback((v: Vehicle, L: any) => {
    const color  = statusColor(v.vehicleRunningStatus)
    const speed  = v.speed?.toFixed(0) ?? '0'
    return L.divIcon({
      html: `
        <div style="
          background:${color};color:#fff;
          padding:4px 9px;border-radius:5px;
          font-size:11px;font-weight:700;
          border:2px solid rgba(255,255,255,.6);
          box-shadow:0 2px 6px rgba(0,0,0,.25);
          white-space:nowrap;
          transition:background .5s;
        ">
          T1 · ${speed} km/h
        </div>
        <div style="
          position:absolute;top:100%;left:50%;
          transform:translateX(-50%);
          width:0;height:0;
          border-left:5px solid transparent;
          border-right:5px solid transparent;
          border-top:6px solid ${color};
          margin-top:-1px;
        "></div>
      `,
      className: '',
      iconAnchor: [35, 28],
    })
  }, [])

  // Initialize map once
  useEffect(() => {
    if (!mapRef.current || mapInst.current) return
    if ((mapRef.current as any)._leaflet_id) return
    let cancelled = false

    import('leaflet').then(L => {
      if (cancelled || !mapRef.current) return
      if ((mapRef.current as any)._leaflet_id) return

      LRef.current = L

      const map = L.map(mapRef.current, {
        center: [34.015, -6.82],
        zoom: 13,
        zoomControl: true,
      })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
      }).addTo(map)

      // Draw T1 route line with animated dash
      const routeCoords = T1_STOPS.map(s => [s.lat, s.lon] as [number, number])
      L.polyline(routeCoords, {
        color: '#7c3aed', weight: 4, opacity: 0.5,
        dashArray: '10 6',
      }).addTo(map)

      // Add stop markers
      T1_STOPS.forEach((stop, i) => {
        L.circleMarker([stop.lat, stop.lon], {
          radius: 6, color: '#7c3aed', fillColor: '#fff',
          fillOpacity: 1, weight: 2.5,
        })
          .bindTooltip(`<b>${stop.name}</b><br/><span style="color:#94a3b8">Stop ${i + 1} of ${T1_STOPS.length}</span>`, {
            direction: 'top', offset: [0, -8],
          })
          .addTo(map)
      })

      // Add initial vehicle markers
      vehicles.forEach(v => {
        const pos = parseLocation(v.location)
        if (!pos) return
        const marker = L.marker(pos, {
          icon: buildIcon(v, L),
          zIndexOffset: 1000,
        })
          .bindPopup(buildPopup(v), { maxWidth: 220 })
          .addTo(map)
        markersRef.current[v.id] = marker
        popupsRef.current[v.id]  = buildPopup(v)
      })

      mapInst.current = map
    })

    return () => {
      cancelled = true
      if (mapInst.current) { mapInst.current.remove(); mapInst.current = null }
      markersRef.current  = {}
      popupsRef.current   = {}
    }
  }, [])

  // Update marker positions on every SWR tick
  useEffect(() => {
    const L = LRef.current
    const map = mapInst.current
    if (!L || !map || !vehicles.length) return

    vehicles.forEach(v => {
      const pos = parseLocation(v.location)
      if (!pos) return

      if (markersRef.current[v.id]) {
        // Smoothly slide marker to new position using Leaflet's setLatLng
        // (CSS transition on the icon handles the visual smoothness)
        markersRef.current[v.id].setLatLng(pos)
        markersRef.current[v.id].setIcon(buildIcon(v, L))
        markersRef.current[v.id].setPopupContent(buildPopup(v))
      } else {
        // New vehicle appeared — add it
        const marker = L.marker(pos, {
          icon: buildIcon(v, L),
          zIndexOffset: 1000,
        })
          .bindPopup(buildPopup(v), { maxWidth: 220 })
          .addTo(map)
        markersRef.current[v.id] = marker
      }
    })

    // Remove markers for vehicles that disappeared
    const currentIds = new Set(vehicles.map((v: Vehicle) => v.id))
    Object.keys(markersRef.current).forEach(id => {
      if (!currentIds.has(id)) {
        markersRef.current[id].remove()
        delete markersRef.current[id]
      }
    })
  }, [vehicles, buildIcon])

  return (
    <>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <div ref={mapRef} style={{ height: 440, width: '100%' }} />
    </>
  )
}