'use client'

import { useEffect, useState, useCallback, useMemo, Fragment } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AccountForm } from '@/components/accounts/AccountForm'
import { CookieGuideDialog } from '@/components/accounts/CookieGuideDialog'

type AiTool = 'claude' | 'codex'

interface Member {
  id: string
  email: string
  name: string | null
  department: string | null
  title: string | null
  syncedAt: string | null
}

interface Account {
  id: string
  name: string
  alias: string | null
  orgId: string | null
  sortOrder: number
  isActive: boolean
  aiTool: AiTool
  hiddenFromDashboard: boolean
  phoneAuth: string | null
  isShared: string | null
  note: string | null
  cookieExpiresAt: string | null
  tokenExpiresAt: string | null
  lastFetchedAt: string | null
  lastMemberSyncedAt: string | null
  lastError: string | null
  deviceId: string | null
  memberCount: number
  members: Member[]
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
  if (daysLeft <= 0) return <span className="text-destructive font-medium">만료</span>
  if (daysLeft <= 7) return <span className="text-orange-500 font-medium">{label} ({daysLeft}일)</span>
  return <span className="text-muted-foreground">{label} ({daysLeft}일)</span>
}

function MemberPanel({ account }: { account: Account }) {
  const { members, note, isShared, orgId, deviceId, cookieExpiresAt, tokenExpiresAt, lastMemberSyncedAt } = account
  return (
    <div className="bg-muted/30 border-t px-6 py-4 space-y-4">
      {/* 메타 정보 (작게) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-1 text-xs text-muted-foreground">
        <div><span className="font-medium text-foreground">orgId:</span> <span className="font-mono">{orgId ?? '-'}</span></div>
        <div><span className="font-medium text-foreground">deviceId:</span> <span className="font-mono">{deviceId ? deviceId.slice(0, 12) + '…' : '-'}</span></div>
        {cookieExpiresAt && (
          <div><span className="font-medium text-foreground">쿠키 만료:</span> <CookieExpiry expiresAt={cookieExpiresAt} /></div>
        )}
        {tokenExpiresAt && (
          <div><span className="font-medium text-foreground">토큰 만료:</span> <CookieExpiry expiresAt={tokenExpiresAt} /></div>
        )}
        <div><span className="font-medium text-foreground">공유 상태:</span> {isShared ?? '-'}</div>
        {note && (
          <div className="col-span-2 md:col-span-4">
            <span className="font-medium text-foreground">메모:</span> {note}
          </div>
        )}
        <div className="col-span-2 md:col-span-4">
          <span className="font-medium text-foreground">멤버 마지막 동기화:</span>{' '}
          {lastMemberSyncedAt
            ? new Date(lastMemberSyncedAt).toLocaleString('ko-KR')
            : <span className="italic">동기화 전</span>}
        </div>
      </div>

      {/* 멤버 목록 */}
      <div>
        <h4 className="text-sm font-semibold mb-2">
          멤버 <span className="text-muted-foreground font-normal">({members.length}명)</span>
        </h4>
        {members.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">
            동기화된 멤버가 없습니다. Apps Script 동기화 실행 또는 그룹 권한을 확인하세요.
          </p>
        ) : (
          <div className="rounded-md border bg-background overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs">
                <tr>
                  <th className="text-left p-2 font-medium">이름</th>
                  <th className="text-left p-2 font-medium hidden md:table-cell">부서</th>
                  <th className="text-left p-2 font-medium hidden md:table-cell">직책</th>
                  <th className="text-left p-2 font-medium">이메일</th>
                </tr>
              </thead>
              <tbody>
                {members.map(m => (
                  <tr key={m.id} className="border-t">
                    <td className="p-2 font-medium">{m.name ?? <span className="text-muted-foreground italic">-</span>}</td>
                    <td className="p-2 text-muted-foreground hidden md:table-cell">{m.department ?? '-'}</td>
                    <td className="p-2 text-muted-foreground hidden md:table-cell">{m.title ?? '-'}</td>
                    <td className="p-2 font-mono text-xs text-muted-foreground">{m.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Account | undefined>()
  const [guideOpen, setGuideOpen] = useState(false)
  const [syncingId, setSyncingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

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
    setAccounts(prev => prev.map(a => a.id === acc.id ? { ...a, hiddenFromDashboard: next } : a))
    const res = await fetch(`/api/accounts/${acc.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hiddenFromDashboard: next }),
    })
    if (!res.ok) {
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
    totalMembers: accounts.reduce((sum, a) => sum + a.memberCount, 0),
  }), [accounts])

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">계정 관리</h1>
          <p className="text-sm text-muted-foreground">Claude/Codex 계정 등록·멤버·쿠키 통합 관리</p>
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
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <StatCard label="전체" value={stats.total} />
            <StatCard label="Claude" value={stats.claude} accent="text-orange-600 dark:text-orange-400" />
            <StatCard label="Codex" value={stats.codex} accent="text-sky-600 dark:text-sky-400" />
            <StatCard label="대시보드 표시" value={stats.visible} accent="text-green-600 dark:text-green-400" />
            <StatCard label="숨김" value={stats.hidden} accent="text-muted-foreground" />
            <StatCard label="총 멤버" value={stats.totalMembers} accent="text-primary" />
          </div>

          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 font-medium w-12">순서</th>
                  <th className="text-left p-3 font-medium">이메일</th>
                  <th className="text-left p-3 font-medium hidden md:table-cell">별칭</th>
                  <th className="text-left p-3 font-medium">AI 도구</th>
                  <th className="text-left p-3 font-medium hidden lg:table-cell">전화인증</th>
                  <th className="text-center p-3 font-medium">멤버수</th>
                  <th className="text-left p-3 font-medium">상태</th>
                  <th className="text-center p-3 font-medium" title="대시보드 표시 여부">대시보드</th>
                  <th className="text-left p-3 font-medium hidden md:table-cell">마지막 수집</th>
                  <th className="text-right p-3 font-medium">액션</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((acc, index) => {
                  const isOpen = expandedId === acc.id
                  return (
                    <Fragment key={acc.id}>
                      <tr
                        className={`border-t transition-colors cursor-pointer ${isOpen ? 'bg-muted/30' : 'hover:bg-muted/20'}`}
                        onClick={() => setExpandedId(isOpen ? null : acc.id)}
                      >
                        <td className="p-3" onClick={e => e.stopPropagation()}>
                          <div className="flex flex-col gap-0.5">
                            <button
                              className="text-muted-foreground hover:text-foreground disabled:opacity-30 leading-none text-base"
                              onClick={() => handleMove(index, 'up')}
                              disabled={index === 0}
                              title="위로"
                            >▲</button>
                            <button
                              className="text-muted-foreground hover:text-foreground disabled:opacity-30 leading-none text-base"
                              onClick={() => handleMove(index, 'down')}
                              disabled={index === accounts.length - 1}
                              title="아래로"
                            >▼</button>
                          </div>
                        </td>
                        <td className="p-3 font-medium">
                          <div className="flex items-center gap-2">
                            <span className="inline-block text-muted-foreground transition-transform text-xs"
                              style={{ transform: isOpen ? 'rotate(90deg)' : 'rotate(0)' }}>▶</span>
                            <span>{acc.name}</span>
                          </div>
                        </td>
                        <td className="p-3 text-muted-foreground hidden md:table-cell">{acc.alias ?? '-'}</td>
                        <td className="p-3"><ToolBadge tool={acc.aiTool} /></td>
                        <td className="p-3 text-muted-foreground hidden lg:table-cell">{acc.phoneAuth ?? '-'}</td>
                        <td className="p-3 text-center font-mono">{acc.memberCount}</td>
                        <td className="p-3">
                          {acc.lastError
                            ? <Badge variant="destructive">오류</Badge>
                            : acc.isActive
                              ? <Badge className="bg-green-500 text-white">활성</Badge>
                              : <Badge variant="secondary">비활성</Badge>}
                        </td>
                        <td className="p-3 text-center" onClick={e => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => handleToggleHidden(acc)}
                            title={acc.hiddenFromDashboard ? '대시보드 숨김 (클릭=표시)' : '대시보드 표시 (클릭=숨김)'}
                            className={`inline-flex items-center justify-center rounded-md border px-2 py-1 text-base transition-colors ${
                              acc.hiddenFromDashboard
                                ? 'border-border bg-muted text-muted-foreground hover:bg-muted/70'
                                : 'border-green-500/30 bg-green-500/10 text-green-600 hover:bg-green-500/20 dark:text-green-400'
                            }`}
                          >
                            {acc.hiddenFromDashboard ? '🚫' : '👁'}
                          </button>
                        </td>
                        <td className="p-3 text-xs text-muted-foreground hidden md:table-cell">
                          {acc.lastFetchedAt
                            ? new Date(acc.lastFetchedAt).toLocaleString('ko-KR')
                            : '-'}
                        </td>
                        <td className="p-3" onClick={e => e.stopPropagation()}>
                          <div className="flex justify-end gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSync(acc.id)}
                              disabled={syncingId === acc.id}
                              title="지금 동기화"
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
                      {isOpen && (
                        <tr>
                          <td colSpan={10} className="p-0">
                            <MemberPanel account={acc} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
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
