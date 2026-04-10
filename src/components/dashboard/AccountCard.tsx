'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export interface AccountLatest {
  id: string
  name: string
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
}

function StatusBadge({ account }: { account: AccountLatest }) {
  if (account.lastError) return <Badge variant="destructive">오류</Badge>
  if (!account.latest) return <Badge variant="secondary">미수집</Badge>
  if (account.latest.predictExceed5h) return <Badge variant="destructive">위험</Badge>
  if (account.latest.predictExceed7d) return <Badge className="bg-yellow-500 text-white">주의</Badge>
  return <Badge className="bg-green-500 text-white">정상</Badge>
}

function resetLabel(resetAt: string | null): string {
  if (!resetAt) return ''
  const d = new Date(resetAt)
  const diff = d.getTime() - Date.now()
  if (diff <= 0) return '곧 초기화'
  const h = Math.floor(diff / 3_600_000)
  const m = Math.floor((diff % 3_600_000) / 60_000)
  if (h >= 24) {
    const days = Math.floor(h / 24)
    return `${days}일 후 초기화`
  }
  if (h > 0) return `${h}h ${m}m 후 초기화`
  return `${m}m 후 초기화`
}

function UsageBar({
  label,
  value,
  resetAt,
  danger,
}: {
  label: string
  value: number | null
  resetAt: string | null
  danger?: boolean
}) {
  const pct = value ?? 0
  const color =
    pct >= 90 ? 'bg-red-500' :
    pct >= 70 ? 'bg-yellow-500' :
    'bg-emerald-500'

  return (
    <div className="space-y-0.5">
      <div className="flex justify-between items-center text-xs">
        <span className="text-muted-foreground font-medium">{label}</span>
        <span className={`font-bold tabular-nums ${pct >= 90 ? 'text-red-500' : pct >= 70 ? 'text-yellow-600' : ''}`}>
          {value !== null ? `${pct}%` : '-'}
        </span>
      </div>
      <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color} ${danger && pct >= 90 ? 'animate-pulse' : ''}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      {resetAt && (
        <p className="text-[10px] text-muted-foreground text-right">{resetLabel(resetAt)}</p>
      )}
    </div>
  )
}

export function AccountCard({ account }: { account: AccountLatest }) {
  const latest = account.latest

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base truncate">{account.name}</CardTitle>
          <StatusBadge account={account} />
        </div>
        <p className="text-xs text-muted-foreground font-mono truncate">{account.orgId}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {latest ? (
          <>
            <UsageBar
              label="5시간 윈도우"
              value={latest.utilization5h}
              resetAt={latest.resetAt5h}
              danger
            />
            <UsageBar
              label="7일 (전체)"
              value={latest.utilization7d}
              resetAt={latest.resetAt7d}
            />
            <UsageBar
              label="7일 (Sonnet)"
              value={latest.utilization7dSonnet}
              resetAt={latest.resetAt7dSonnet}
            />

            {(latest.predictExceed5h || latest.predictExceed7d) && (
              <div className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">
                {latest.predictExceed5h
                  ? '⚠ 5시간 윈도우 90% 초과'
                  : '⚠ 7일 윈도우 90% 초과'}
              </div>
            )}

            <p className="text-xs text-muted-foreground text-right">
              {new Date(latest.fetchedAt).toLocaleString('ko-KR')}
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
