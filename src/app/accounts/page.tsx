'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AccountForm } from '@/components/accounts/AccountForm'
import { CookieGuideDialog } from '@/components/accounts/CookieGuideDialog'

interface Account {
  id: string
  name: string
  orgId: string
  isActive: boolean
  cookieExpiresAt: string | null
  lastFetchedAt: string | null
  lastError: string | null
  deviceId: string | null
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

  async function handleTest(id: string) {
    const res = await fetch(`/api/accounts/${id}`, { method: 'POST' })
    const data = await res.json() as { data?: { success: boolean }; error?: { message: string } }
    alert(res.ok ? '✅ 연결 성공!' : `❌ 실패: ${data.error?.message}`)
  }

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
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 font-medium">이름</th>
                <th className="text-left p-3 font-medium hidden md:table-cell">Organization ID</th>
                <th className="text-left p-3 font-medium">상태</th>
                <th className="text-left p-3 font-medium hidden lg:table-cell">Device ID</th>
                <th className="text-left p-3 font-medium hidden md:table-cell">쿠키 만료</th>
                <th className="text-left p-3 font-medium hidden md:table-cell">마지막 수집</th>
                <th className="text-right p-3 font-medium">액션</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map(acc => (
                <tr key={acc.id} className="border-t hover:bg-muted/20">
                  <td className="p-3 font-medium">{acc.name}</td>
                  <td className="p-3 font-mono text-xs text-muted-foreground hidden md:table-cell truncate max-w-xs">
                    {acc.orgId}
                  </td>
                  <td className="p-3">
                    {acc.lastError
                      ? <Badge variant="destructive">오류</Badge>
                      : acc.isActive
                        ? <Badge className="bg-green-500 text-white">활성</Badge>
                        : <Badge variant="secondary">비활성</Badge>}
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
                      <Button size="sm" variant="outline" onClick={() => handleTest(acc.id)}>
                        테스트
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
