export const dynamic = 'force-dynamic'

import { AccountCard, type AccountLatest } from '@/components/dashboard/AccountCard'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'

async function getLatestUsage(): Promise<AccountLatest[]> {
  const accounts = await prisma.account.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      orgId: true,
      lastFetchedAt: true,
      lastError: true,
      usageLogs: {
        orderBy: { fetchedAt: 'desc' },
        take: 1,
        select: {
          utilization5h: true,
          resetAt5h: true,
          utilization7d: true,
          resetAt7d: true,
          utilization7dSonnet: true,
          resetAt7dSonnet: true,
          predictExceed5h: true,
          predictExceed7d: true,
          fetchedAt: true,
        },
      },
    },
  })

  return accounts.map(acc => ({
    id: acc.id,
    name: acc.name,
    orgId: acc.orgId,
    lastFetchedAt: acc.lastFetchedAt,
    lastError: acc.lastError,
    latest: acc.usageLogs[0] ?? null,
  })) as unknown as AccountLatest[]
}

export default async function DashboardPage() {
  const accounts = await getLatestUsage()

  const total = accounts.length
  const danger = accounts.filter(a => a.latest?.predictExceed5h).length
  const warning = accounts.filter(a => !a.latest?.predictExceed5h && a.latest?.predictExceed7d).length
  const errored = accounts.filter(a => a.lastError).length
  const noData = accounts.filter(a => !a.lastError && !a.latest).length

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Claude Usage Monitor</h1>
          <p className="text-sm text-muted-foreground">계정별 사용량 및 만료일 모니터링</p>
        </div>
        <Link href="/accounts" className="text-sm text-primary underline-offset-4 hover:underline">
          계정 관리 →
        </Link>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <SummaryCard label="전체 계정" value={total} />
        <SummaryCard label="위험 (5h≥90%)" value={danger} color="text-destructive" />
        <SummaryCard label="주의 (7d≥90%)" value={warning} color="text-yellow-600" />
        <SummaryCard label="미수집" value={noData} color="text-muted-foreground" />
        <SummaryCard label="오류" value={errored} color="text-destructive" />
      </div>

      {/* 계정 카드 그리드 */}
      {accounts.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-lg">등록된 계정이 없습니다</p>
          <Link href="/accounts" className="text-primary underline-offset-4 hover:underline text-sm">
            계정 추가하기 →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {accounts.map(account => (
            <AccountCard key={account.id} account={account} />
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground text-right">
        5시간마다 자동 수집 | Vercel Cron Jobs
      </p>
    </div>
  )
}

function SummaryCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="rounded-lg border bg-card p-3 text-center">
      <p className={`text-2xl font-bold ${color ?? ''}`}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}
