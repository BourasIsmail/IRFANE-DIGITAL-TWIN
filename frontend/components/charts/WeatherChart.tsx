'use client'

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

export function WeatherChart({ data }: { data: { time: string; temp: number }[] }) {
  if (!data.length) {
    return (
      <div style={{ height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 12, color: '#B4B2A9' }}>No historical data yet</span>
      </div>
    )
  }

  const sparse = data.filter((_, i) => i % Math.max(1, Math.floor(data.length / 12)) === 0)

  return (
    <div style={{ height: 80 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={sparse} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
          <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#B4B2A9' }} tickLine={false} axisLine={false} />
          <YAxis hide domain={['auto', 'auto']} />
          <Tooltip
            contentStyle={{ fontSize: 12, border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 6 }}
            formatter={(v) => [`${Number(v).toFixed(1)}°C`, 'Temp']}
          />
          <Line
            type="monotone" dataKey="temp"
            stroke="#EF9F27" strokeWidth={1.5} dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}