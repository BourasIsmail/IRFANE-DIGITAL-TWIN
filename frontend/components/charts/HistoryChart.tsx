'use client'

import { AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts'

interface Props {
  data:  { time: string; value: number }[]
  color: string
  unit:  string
  label: string
}

export function HistoryChart({ data, color, unit, label }: Props) {
  if (!data.length) {
    return (
      <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 13, color: '#B4B2A9' }}>No data — run setup_ql_subs.py first</span>
      </div>
    )
  }

  const sparse = data.filter((_, i) => i % Math.max(1, Math.floor(data.length / 24)) === 0)

  return (
    <div style={{ height: 160 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={sparse} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id={`hist-${color}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={color} stopOpacity={0.15} />
              <stop offset="95%" stopColor={color} stopOpacity={0}    />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
          <XAxis
            dataKey="time"
            tick={{ fontSize: 10, fill: '#B4B2A9' }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#B4B2A9' }}
            tickLine={false}
            axisLine={false}
            domain={['auto', 'auto']}
          />
          <Tooltip
            contentStyle={{ fontSize: 12, border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 6 }}
            formatter={(v) => [`${Number(v).toFixed(1)}${unit}`, label]}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#hist-${color})`}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}