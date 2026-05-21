'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AccountForm } from '@/components/accounts/AccountForm'
import { CookieGuideDialog } from '@/components/accounts/CookieGuideDialog'

type AiTool = 'claude' | 'codex'

interface Account {
  id: string
  name: string
  alias: string | null
  orgId: string | null
  sortOrder: number
  isActive: boolean
  aiTool: AiTool
  hiddenFromDashboard: boolean
  cookieExpiresAt: string | null
  lastFetchedAt: string | null
  lastError: string | null
  deviceId: string | null
}

function ToolBadge({ tool }: { tool: AiTool }) {
  if (tool === 'codex') {
    return (
      <Badge className="bg-sky-500/15 text-sky-600 hover:bg-sky-500/15 border border-sky-500/30 dark:text-sky-400">
        Codex
      </Badge>
    )
  }
  return (
    <Badge className="bg-orange-500/15 text-orange-600 hover:bg-orange-500/15 border border-orange-500/30 dark:text-orange-400">
      Claude
    </Badge>
  )
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="rounded-lg border bg-card p-3 text-center">
      <p className={`text-2xl font-bold ${accent ?? ''}`}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

function CookieExpiry({ expiresAt }: { expiresAt: string | null }) {
  if (!expiresAt) return <span className="text-muted-foreground">-</span>
  const date = new Date(expiresAt)
  const daysLeft = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  const label = date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
  if (daysLeft <= 0) return <span className="text-destructive font-medium">만료됨</span>
  if (daysLeft <= 7) return <span className="text-orange-500 font-medium">{label} ({daysLeft}일 남음)</span>
  return <span className="text-muted-foreground">{label} ({daysLeft}일)</span>
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Account | undefined>()
  const [guideOpen, setGuideOpen] = useState(false)
  const [syncingId, setSyncingId] = useState<string | null>(null)

  const fetchAccounts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/accounts')
      const json = await res.json() as { data: Account[] }
      setAccounts(json.data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAccounts() }, [fetchAccounts])

  async function handleDelete(id: string, name: string) {
    if (!confirm(`'${name}' 계정을 삭제하시겠습니까?`)) return
    await fetch(`/api/accounts/${id}`, { method: 'DELETE' })
    fetchAccounts()
  }

  async function handleSync(id: string) {
    setSyncingId(id)
    try {
      const res = await fetch(`/api/accounts/${id}/sync`, { method: 'POST' })
      const data = await res.json() as { data?: { success: boolean }; error?: { message: string } }
      if (!res.ok) {
        alert(`❌ 동기화 실패: ${data.error?.message}`)
      }
      fetchAccounts()
    } finally {
      setSyncingId(null)
    }
  }

  async function handleMove(index: number, direction: 'up' | 'down') {
    const newAccounts = [...accounts]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= newAccounts.length) return

    const temp = newAccounts[index]
    newAccounts[index] = newAccounts[targetIndex]
    newAccounts[targetIndex] = temp

    setAccounts(newAccounts)

    await fetch('/api/accounts/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order: newAccounts.map(a => a.id) }),
    })
  }

  async function handleToggleHidden(acc: Account) {
    const next = !acc.hiddenFromDashboard
    // 낙관적 업데이트
    setAccounts(prev => prev.map(a => a.id === acc.id ? { ...a, hiddenFromDashboard: next } : a))
    const res = await fetch(`/api/accounts/${acc.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hiddenFromDashboard: next }),
    })
    if (!res.ok) {
      // 롤백
      setAccounts(prev => prev.map(a => a.id === acc.id ? { ...a, hiddenFromDashboard: acc.hiddenFromDashboard } : a))
      alert('숨김 상태 변경 실패')
    }
  }

  const stats = useMemo(() => ({
    total: accounts.length,
    claude: accounts.filter(a => a.aiTool === 'claude').length,
    codex: accounts.filter(a => a.aiTool === 'codex').length,
    visible: accounts.filter(a => !a.hiddenFromDashboard).length,
    hidden: accounts.filter(a => a.hiddenFromDashboard).length,
  }), [accounts])

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">계정 관리</h1>
          <p className="text-sm text-muted-foreground">Claude.ai 계정 등록 및 쿠키 관리</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setGuideOpen(true)}>
            🍪 쿠키 추출 가이드
          </Button>
          <Button size="sm" onClick={() => { setEditTarget(undefined); setFormOpen(true) }}>
            + 계정 추가
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-center py-10">로딩 중...</p>
      ) : accounts.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <p>등록된 계정이 없습니다</p>
          <Button className="mt-4" onClick={() => setFormOpen(true)}>첫 계정 추가하기</Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <StatCard label="전체" value={stats.total} />
            <StatCard label="Claude" value={stats.claude} accent="text-orange-600 dark:text-orange-400" />
            <StatCard label="Codex" value={stats.codex} accent="text-sky-600 dark:text-sky-400" />
            <StatCard label="대시보드 표시" value={stats.visible} accent="text-green-600 dark:text-green-400" />
            <StatCard label="숨김" value={stats.hidden} accent="text-muted-foreground" />
          </div>

        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 font-medium w-12">순서</th>
                <th className="text-left p-3 font-medium">표시명 / 별칭</th>
                <th className="text-left p-3 font-medium">AI 도구</th>
                <th className="text-left p-3 font-medium hidden md:table-cell">Organization ID</th>
                <th className="text-left p-3 font-medium">상태</th>
                <th className="text-center p-3 font-medium" title="대시보드 표시 여부">대시보드</th>
                <th className="text-left p-3 font-medium hidden lg:table-cell">Device ID</th>
                <th className="text-left p-3 font-medium hidden md:table-cell">쿠키 만료</th>
                <th className="text-left p-3 font-medium hidden md:table-cell">마지막 수집</th>
                <th className="text-right p-3 font-medium">액션</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((acc, index) => (
                <tr key={acc.id} className="border-t hover:bg-muted/20">
                  <td className="p-3">
                    <div className="flex flex-col gap-0.5">
                      <button
                        className="text-muted-foreground hover:text-foreground disabled:opacity-30 leading-none text-base"
                        onClick={() => handleMove(index, 'up')}
                        disabled={index === 0}
                        title="위로"
                      >
                        ▲
                      </button>
                      <button
                        className="text-muted-foreground hover:text-foreground disabled:opacity-30 leading-none text-base"
                        onClick={() => handleMove(index, 'down')}
                        disabled={index === accounts.length - 1}
                        title="아래로"
                      >
                        ▼
                      </button>
                    </div>
                  </td>
                  <td className="p-3">
                    <div>
                      <p className="font-medium">{acc.alias || acc.name}</p>
                      {acc.alias && (
                        <p className="text-xs text-muted-foreground">{acc.name}</p>
                      )}
                    </div>
                  </td>
                  <td className="p-3">
                    <ToolBadge tool={acc.aiTool} />
                  </td>
                  <td className="p-3 font-mono text-xs text-muted-foreground hidden md:table-cell truncate max-w-xs">
                    {acc.orgId ?? <span className="italic text-muted-foreground/70">-</span>}
                  </td>
                  <td className="p-3">
                    {acc.lastError
                      ? <Badge variant="destructive">오류</Badge>
                      : acc.isActive
                        ? <Badge className="bg-green-500 text-white">활성</Badge>
                        : <Badge variant="secondary">비활성</Badge>}
                  </td>
                  <td className="p-3 text-center">
                    <button
                      type="button"
                      onClick={() => handleToggleHidden(acc)}
                      title={acc.hiddenFromDashboard ? '대시보드에서 숨김 (클릭하여 표시)' : '대시보드에 표시 중 (클릭하여 숨김)'}
                      className={`inline-flex items-center justify-center rounded-md border px-2 py-1 text-base transition-colors ${
                        acc.hiddenFromDashboard
                          ? 'border-border bg-muted text-muted-foreground hover:bg-muted/70'
                          : 'border-green-500/30 bg-green-500/10 text-green-600 hover:bg-green-500/20 dark:text-green-400'
                      }`}
                    >
                      {acc.hiddenFromDashboard ? '🚫' : '👁'}
                    </button>
                  </td>
                  <td className="p-3 font-mono text-xs text-muted-foreground hidden lg:table-cell">
                    {acc.deviceId ? acc.deviceId.slice(0, 8) + '…' : '-'}
                  </td>
                  <td className="p-3 text-xs hidden md:table-cell">
                    <CookieExpiry expiresAt={acc.cookieExpiresAt} />
                  </td>
                  <td className="p-3 text-xs text-muted-foreground hidden md:table-cell">
                    {acc.lastFetchedAt
                      ? new Date(acc.lastFetchedAt).toLocaleString('ko-KR')
                      : '-'}
                  </td>
                  <td className="p-3">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSync(acc.id)}
                        disabled={syncingId === acc.id || acc.aiTool !== 'claude'}
                        title={acc.aiTool !== 'claude' ? `${acc.aiTool}는 수집 미지원` : '지금 동기화'}
                      >
                        {syncingId === acc.id ? '...' : '↻'}
                      </Button>
                      <Button size="sm" variant="outline"
                        onClick={() => { setEditTarget(acc); setFormOpen(true) }}>
                        수정
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(acc.id, acc.name)}>
                        삭제
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}

      <AccountForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSuccess={fetchAccounts}
        account={editTarget}
      />
      <CookieGuideDialog open={guideOpen} onClose={() => setGuideOpen(false)} />
    </div>
  )
}
