'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

export interface AccountLatest {
  id: string
  name: string
  orgId: string
  lastFetchedAt: string | null
  lastError: string | null
  latest: {
    usedMessages: number | null
    totalMessages: number | null
    usagePercent: number | null
    expiresAt: string | null
    planName: string | null
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

function ExpiryBadge({ expiresAt }: { expiresAt: string | null }) {
  if (!expiresAt) return null
  const days = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  if (days < 0) return <Badge variant="destructive">만료됨</Badge>
  if (days <= 7) return <Badge variant="destructive">만료 {days}일 전</Badge>
  if (days <= 30) return <Badge className="bg-yellow-500 text-white">만료 {days}일 전</Badge>
  return null
}

export function AccountCard({ account }: { account: AccountLatest }) {
  const latest = account.latest
  const percent = latest?.usagePercent ?? 0

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base truncate">{account.name}</CardTitle>
          <div className="flex gap-1 shrink-0">
            <StatusBadge account={account} />
            {latest && <ExpiryBadge expiresAt={latest.expiresAt} />}
          </div>
        </div>
        <p className="text-xs text-muted-foreground font-mono truncate">{account.orgId}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {latest ? (
          <>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">사용량</span>
                <span className="font-medium">
                  {latest.usedMessages?.toLocaleString() ?? '-'} /{' '}
                  {latest.totalMessages?.toLocaleString() ?? '-'}
                </span>
              </div>
              <Progress value={percent} className="h-2" />
              <p className="text-right text-xs text-muted-foreground">{percent.toFixed(1)}%</p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-muted-foreground">플랜</p>
                <p className="font-medium">{latest.planName ?? '-'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">만료일</p>
                <p className="font-medium">
                  {latest.expiresAt
                    ? new Date(latest.expiresAt).toLocaleDateString('ko-KR')
                    : '-'}
                </p>
              </div>
            </div>

            {(latest.predictExceed5h || latest.predictExceed7d) && (
              <div className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">
                {latest.predictExceed5h
                  ? '⚠ 5시간 내 쿼터 초과 예상'
                  : '⚠ 7일 내 쿼터 초과 예상'}
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              수집: {new Date(latest.fetchedAt).toLocaleString('ko-KR')}
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
