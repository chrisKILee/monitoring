'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

export interface RecentLog {
  fetchedAt: string
  utilization5h: number | null
  utilization7d: number | null
}

export interface AccountLatest {
  id: string
  name: string
  alias: string | null
  orgId: string
  lastFetchedAt: string | null
  lastError: string | null
  latest: {
    utilization5h: number | null
    resetAt5h: string | null
    utilization7d: number | null
    resetAt7d: string | null
    utilization7dSonnet: number | null
    resetAt7dSonnet: string | null
    predictExceed5h: boolean
    predictExceed7d: boolean
    fetchedAt: string
  } | null
  recentLogs: RecentLog[]
  members: string[]
}

function MembersAccordion({ members }: { members: string[] }) {
  const [open, setOpen] = useState(false)
  if (members.length === 0) return null

  const panelId = `members-panel-${members.length}-${members[0]}`

  return (
    <div className="border-t pt-2">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center justify-between text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <span>멤버 {members.length}명</span>
        <span className={`text-[10px] transition-transform ${open ? 'rotate-180' : ''}`}>▼</span>
      </button>
      {open && (
        <ul id={panelId} className="mt-1.5 space-y-0.5 pl-2">
          {members.map(name => (
            <li key={name} className="text-xs text-foreground/90">
              <span className="text-muted-foreground mr-1">•</span>
              {name}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function StatusBadge({ account }: { account: AccountLatest }) {
  if (account.lastError) return <Badge variant="destructive">오류</Badge>
  if (!account.latest) return <Badge variant="secondary">미수집</Badge>
  if (account.latest.predictExceed5h) return <Badge variant="destructive">위험</Badge>
  if (account.latest.predictExceed7d) return <Badge className="bg-yellow-500 text-white">주의</Badge>
  return <Badge className="bg-green-500 text-white">정상</Badge>
}

function useNow(): number | null {
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    setNow(Date.now())
    const t = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(t)
  }, [])
  return now
}

function resetLabel(resetAt: string | null, now: number | null): string {
  if (!resetAt || now === null) return ''
  const d = new Date(resetAt)
  const diff = d.getTime() - now
  if (diff <= 0) return '곧 초기화'
  const h = Math.floor(diff / 3_600_000)
  const m = Math.floor((diff % 3_600_000) / 60_000)
  if (h >= 24) return `${Math.floor(h / 24)}일 후 초기화`
  if (h > 0) return `${h}h ${m}m 후 초기화`
  return `${m}m 후 초기화`
}

function timeElapsedPct(resetAt: string | null, windowMs: number, now: number | null): number {
  if (!resetAt || now === null) return 0
  const remaining = new Date(resetAt).getTime() - now
  const elapsed = Math.max(0, windowMs - remaining)
  return Math.min(100, (elapsed / windowMs) * 100)
}

/** 5시간 윈도우: 20% 단위 5칸 + 현재 시간 커서 */
function Segmented5hBar({
  value,
  resetAt,
  danger,
  now,
}: {
  value: number | null
  resetAt: string | null
  danger?: boolean
  now: number | null
}) {
  const pct = value ?? 0
  const timePct = timeElapsedPct(resetAt, 5 * 60 * 60 * 1000, now)

  const barColor =
    pct >= 90 ? 'bg-red-500' :
    pct > timePct + 5 ? 'bg-yellow-500' :
    'bg-emerald-500'

  return (
    <div className="space-y-1 min-h-[76px]">
      <div className="flex justify-between items-center text-xs">
        <span className="text-muted-foreground font-medium">5시간 윈도우</span>
        <span className={`font-bold tabular-nums ${pct >= 90 ? 'text-red-500' : pct >= 70 ? 'text-yellow-600' : ''}`}>
          {value !== null ? `${pct}%` : '-'}
        </span>
      </div>

      {/* 바 */}
      <div className="relative h-4 w-full rounded bg-muted overflow-hidden">
        {/* 사용량 채우기 */}
        <div
          className={`h-full transition-all ${barColor} ${danger && pct >= 90 ? 'animate-pulse' : ''}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
        {/* 20% 단위 구분선 */}
        {[20, 40, 60, 80].map(tick => (
          <div
            key={tick}
            className="absolute top-0 bottom-0 w-px bg-background/60"
            style={{ left: `${tick}%` }}
          />
        ))}
        {/* 현재 시간 커서 — hydration safe: now가 마운트 후에만 표시 */}
        {resetAt && now !== null && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white/90 shadow"
            style={{ left: `${timePct}%` }}
          />
        )}
      </div>

      {/* 시간 눈금 */}
      <div className="flex justify-between text-[10px] text-muted-foreground">
        {[0, 1, 2, 3, 4, 5].map(h => <span key={h}>{h}h</span>)}
      </div>

      {resetAt && now !== null && (
        <p className="text-[10px] text-muted-foreground text-right">{resetLabel(resetAt, now)}</p>
      )}
    </div>
  )
}

/** 7일 윈도우: 7칸 그리드 — 시간 경과(회색) vs 사용량(컬러) 비교 */
function Grid7dBar({
  label,
  value,
  resetAt,
  now,
}: {
  label: string
  value: number | null
  resetAt: string | null
  now: number | null
}) {
  const pct = value ?? 0

  const { daysPassed, dayFraction } = useMemo(() => {
    if (!resetAt || now === null) return { daysPassed: 0, dayFraction: 0 }
    const remaining = new Date(resetAt).getTime() - now
    const total = 7 * 24 * 60 * 60 * 1000
    const elapsed = Math.max(0, total - remaining)
    const days = elapsed / (24 * 60 * 60 * 1000)
    return { daysPassed: Math.floor(days), dayFraction: days % 1 }
  }, [resetAt, now])

  const timePct = ((daysPassed + dayFraction) / 7) * 100
  const cellWidth = 100 / 7

  const fillColor =
    pct >= 90 ? 'bg-red-400/80' :
    pct > timePct + 5 ? 'bg-yellow-400/80' :
    'bg-emerald-400/80'

  return (
    <div className="space-y-1 min-h-[64px]">
      <div className="flex justify-between items-center text-xs">
        <span className="text-muted-foreground font-medium">{label}</span>
        <span className={`font-bold tabular-nums ${pct >= 90 ? 'text-red-500' : pct >= 70 ? 'text-yellow-600' : ''}`}>
          {value !== null ? `${pct}%` : '-'}
        </span>
      </div>

      {/* 7칸 그리드 */}
      <div className="flex gap-0.5">
        {Array.from({ length: 7 }, (_, i) => {
          const timeFill = i < daysPassed ? 100 : i === daysPassed ? dayFraction * 100 : 0
          const usageFill = Math.max(0, Math.min(100, (pct - i * cellWidth) / cellWidth * 100))
          const isCurrent = i === daysPassed

          return (
            <div
              key={i}
              className={`flex-1 relative h-7 rounded-sm bg-muted overflow-hidden ${isCurrent ? 'ring-1 ring-primary/60' : ''}`}
            >
              {/* 시간 경과 (회색) */}
              <div
                className="absolute inset-y-0 left-0 bg-slate-300/60 dark:bg-slate-600/50"
                style={{ width: `${timeFill}%` }}
              />
              {/* 사용량 (컬러) */}
              <div
                className={`absolute inset-y-0 left-0 ${fillColor}`}
                style={{ width: `${usageFill}%` }}
              />
              {/* 날짜 레이블 */}
              <span className={`absolute inset-0 flex items-center justify-center text-[9px] font-semibold z-10 ${isCurrent ? 'text-primary' : 'text-muted-foreground'}`}>
                {i + 1}
              </span>
            </div>
          )
        })}
      </div>

      {resetAt && now !== null && (
        <p className="text-[10px] text-muted-foreground text-right">{resetLabel(resetAt, now)}</p>
      )}
    </div>
  )
}

function Usage48hChart({ logs, mounted }: { logs: RecentLog[]; mounted: boolean }) {
  const data = logs
    .filter(l => l.utilization7d !== null)
    .map(l => ({
      time: mounted
        ? new Date(l.fetchedAt).toLocaleString('ko-KR', {
            month: 'numeric',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })
        : new Date(l.fetchedAt).toISOString().slice(5, 16),
      pct: l.utilization7d as number,
    }))

  if (data.length < 2) {
    return (
      <div className="min-h-[140px] flex flex-col">
        <p className="text-xs text-muted-foreground font-medium mb-1">7일 사용량 추세 (48h)</p>
        <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground">
          데이터 부족 (수집 후 확인)
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[140px]">
      <p className="text-xs text-muted-foreground font-medium mb-1">7일 사용량 추세 (48h)</p>
      <ResponsiveContainer width="100%" height={120}>
        <LineChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.4} />
          <XAxis
            dataKey="time"
            tick={{ fontSize: 9 }}
            interval="preserveStartEnd"
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 9 }}
            tickFormatter={v => `${v}%`}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{ fontSize: 11 }}
            formatter={(v: unknown) => [`${v}%`, '7d 사용률']}
          />
          <Line
            type="monotone"
            dataKey="pct"
            stroke="#6366f1"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export function AccountCard({ account }: { account: AccountLatest }) {
  const latest = account.latest
  const router = useRouter()
  const [syncing, setSyncing] = useState(false)
  const now = useNow()

  async function handleSync() {
    setSyncing(true)
    try {
      await fetch(`/api/accounts/${account.id}/sync`, { method: 'POST' })
      router.refresh()
    } finally {
      setSyncing(false)
    }
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-base truncate">{account.name}</CardTitle>
            {account.alias && (
              <p className="text-xs text-muted-foreground truncate">{account.alias}</p>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <StatusBadge account={account} />
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
              onClick={handleSync}
              disabled={syncing}
              title="지금 동기화"
            >
              <span className={`text-sm ${syncing ? 'animate-spin inline-block' : ''}`}>↻</span>
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground font-mono truncate">{account.orgId}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <MembersAccordion members={account.members} />

        {latest ? (
          <>
            <Segmented5hBar
              value={latest.utilization5h}
              resetAt={latest.resetAt5h}
              danger
              now={now}
            />
            <Grid7dBar
              label="7일 (전체)"
              value={latest.utilization7d}
              resetAt={latest.resetAt7d}
              now={now}
            />
            <Grid7dBar
              label="7일 (Sonnet)"
              value={latest.utilization7dSonnet}
              resetAt={latest.resetAt7dSonnet}
              now={now}
            />

            <Usage48hChart logs={account.recentLogs} mounted={now !== null} />

            {(latest.predictExceed5h || latest.predictExceed7d) && (
              <div className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">
                {latest.predictExceed5h
                  ? '⚠ 5시간 윈도우 90% 초과'
                  : '⚠ 7일 윈도우 90% 초과'}
              </div>
            )}

            <p className="text-xs text-muted-foreground text-right">
              {now !== null ? new Date(latest.fetchedAt).toLocaleString('ko-KR') : new Date(latest.fetchedAt).toISOString().slice(0, 16).replace('T', ' ')}
            </p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground py-4 text-center">
            {account.lastError ? `오류: ${account.lastError}` : '아직 수집된 데이터가 없습니다'}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
