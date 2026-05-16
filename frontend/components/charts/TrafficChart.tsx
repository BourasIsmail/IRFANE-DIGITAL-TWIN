'use client'

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

interface Props {
  data: { time: string; flow: number }[]
  color?: string
}

export function TrafficChart({ data, color = '#378ADD' }: Props) {
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
        <AreaChart data={sparse} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id={`fill-${color}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={color} stopOpacity={0.15} />
              <stop offset="95%" stopColor={color} stopOpacity={0}    />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="time"
            tick={{ fontSize: 10, fill: '#B4B2A9' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis hide />
          <Tooltip
            contentStyle={{ fontSize: 12, border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 6 }}
            formatter={(v) => [`${Math.round(Number(v))} veh/h`, 'Flow']}
          />
          <Area
            type="monotone"
            dataKey="flow"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#fill-${color})`}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}