'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

interface UsageLog {
  fetchedAt: string
  usagePercent: number | null
  usedMessages: number | null
}

interface Props {
  logs: UsageLog[]
  accountName: string
}

export function UsageChart({ logs, accountName }: Props) {
  const data = [...logs]
    .sort((a, b) => new Date(a.fetchedAt).getTime() - new Date(b.fetchedAt).getTime())
    .map(l => ({
      time: new Date(l.fetchedAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit' }),
      percent: l.usagePercent ?? 0,
      messages: l.usedMessages ?? 0,
    }))

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
        수집된 데이터가 없습니다
      </div>
    )
  }

  return (
    <div className="w-full">
      <p className="text-sm font-medium mb-2">{accountName} — 사용량 추세</p>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="time"
            tick={{ fontSize: 11 }}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 11 }}
            tickFormatter={v => `${v}%`}
          />
          <Tooltip
            formatter={(value) => typeof value === 'number' ? [`${value.toFixed(1)}%`, '사용률'] : [value, '사용률']}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="percent"
            name="사용률 (%)"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
