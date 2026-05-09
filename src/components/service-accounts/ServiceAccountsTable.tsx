'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Member {
  id: string
  name: string
  purpose: string | null
  startDate: string | null
  endDate: string | null
}

interface ServiceAccount {
  id: string
  accountName: string
  service: 'claude' | 'codex'
  phoneAuth: string | null
  isShared: string | null
  note: string | null
  members: Member[]
}

type SharedValue = 'Y' | 'N' | 'none'

interface EditDraft {
  accountName: string
  service: 'claude' | 'codex'
  phoneAuth: string
  isShared: SharedValue
  note: string
}

interface AddDraft {
  accountName: string
  service: 'claude' | 'codex'
  phoneAuth: string
  isShared: SharedValue
  note: string
}

interface Props {
  initialData: ServiceAccount[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(value: string | null): string {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function ServiceBadge({ service }: { service: 'claude' | 'codex' }) {
  if (service === 'claude') {
    return (
      <Badge className="bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800">
        Claude
      </Badge>
    )
  }
  return (
    <Badge className="bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800">
      Codex
    </Badge>
  )
}

function SharedBadge({ isShared }: { isShared: string | null }) {
  if (isShared === 'Y') {
    return (
      <Badge className="bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800">
        Y
      </Badge>
    )
  }
  if (isShared === 'N') {
    return <Badge variant="secondary">N</Badge>
  }
  return (
    <Badge
      variant="outline"
      className="text-amber-600 border-amber-400 bg-amber-50 dark:text-amber-400 dark:border-amber-600 dark:bg-amber-950/40 font-semibold"
    >
      관리하지 않음
    </Badge>
  )
}

function toDraft(acc: ServiceAccount): EditDraft {
  return {
    accountName: acc.accountName,
    service: acc.service,
    phoneAuth: acc.phoneAuth ?? '',
    isShared: (acc.isShared as 'Y' | 'N') ?? 'none',
    note: acc.note ?? '',
  }
}

function emptyAdd(): AddDraft {
  return { accountName: '', service: 'claude', phoneAuth: '', isShared: 'none', note: '' }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function MemberSubTable({ members }: { members: Member[] }) {
  if (members.length === 0) {
    return (
      <tr>
        <td colSpan={8}>
          <div className="pl-10 py-3 text-sm text-muted-foreground">사용 멤버 없음</div>
        </td>
      </tr>
    )
  }

  return (
    <tr>
      <td colSpan={8} className="p-0">
        <div className="pl-10 pr-4 pb-3">
          <table className="w-full text-xs border rounded-md overflow-hidden">
            <thead className="bg-muted/60">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">이름</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">목적</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">시작일</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">종료일</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-t hover:bg-muted/20">
                  <td className="px-3 py-2 font-medium">{m.name}</td>
                  <td className="px-3 py-2 text-muted-foreground">{m.purpose ?? '-'}</td>
                  <td className="px-3 py-2 text-muted-foreground">{formatDate(m.startDate)}</td>
                  <td className="px-3 py-2 text-muted-foreground">{formatDate(m.endDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </td>
    </tr>
  )
}

function AddDialog({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}) {
  const [draft, setDraft] = useState<AddDraft>(emptyAdd)
  const [loading, setLoading] = useState(false)

  function handleOpenChange(next: boolean) {
    if (!next) {
      setDraft(emptyAdd())
      onClose()
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!draft.accountName.trim()) return
    setLoading(true)
    try {
      const body: Record<string, string | undefined> = {
        accountName: draft.accountName.trim(),
        service: draft.service,
        phoneAuth: draft.phoneAuth.trim() || undefined,
        isShared: draft.isShared === 'none' ? undefined : draft.isShared,
        note: draft.note.trim() || undefined,
      }
      await fetch('/api/service-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      setDraft(emptyAdd())
      onSuccess()
      onClose()
    } catch (err) {
      console.error('서비스 계정 추가 실패:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>계정 추가</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label htmlFor="add-accountName">
              계정명 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="add-accountName"
              value={draft.accountName}
              onChange={(e) => setDraft((d) => ({ ...d, accountName: e.target.value }))}
              placeholder="예: service-claude-01"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label>
              서비스 <span className="text-destructive">*</span>
            </Label>
            <Select
              value={draft.service}
              onValueChange={(v) => setDraft((d) => ({ ...d, service: v as 'claude' | 'codex' }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="claude">Claude</SelectItem>
                <SelectItem value="codex">Codex</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="add-phoneAuth">전화인증</Label>
            <Input
              id="add-phoneAuth"
              value={draft.phoneAuth}
              onChange={(e) => setDraft((d) => ({ ...d, phoneAuth: e.target.value }))}
              placeholder="예: 010-1234-5678"
            />
          </div>

          <div className="space-y-1.5">
            <Label>공유계정</Label>
            <Select
              value={draft.isShared}
              onValueChange={(v) => setDraft((d) => ({ ...d, isShared: v as SharedValue }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">관리하지 않음</SelectItem>
                <SelectItem value="Y">Y</SelectItem>
                <SelectItem value="N">N</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="add-note">비고</Label>
            <Input
              id="add-note"
              value={draft.note}
              onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))}
              placeholder="메모 (선택)"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose}>
              취소
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? '저장 중...' : '추가'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ServiceAccountsTable({ initialData }: Props) {
  const router = useRouter()
  const [accounts, setAccounts] = useState<ServiceAccount[]>(initialData)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<string, EditDraft>>({})
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [savingId, setSavingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)

  // Sync state when server re-renders (after router.refresh())
  useEffect(() => {
    setAccounts(initialData)
  }, [initialData])

  // ---- helpers ----

  const refresh = useCallback(() => {
    router.refresh()
  }, [router])

  function startEdit(acc: ServiceAccount) {
    setDrafts((prev) => ({ ...prev, [acc.id]: toDraft(acc) }))
    setEditingId(acc.id)
  }

  function cancelEdit() {
    setEditingId(null)
  }

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function updateDraft<K extends keyof EditDraft>(id: string, key: K, value: EditDraft[K]) {
    setDrafts((prev) => ({
      ...prev,
      [id]: { ...prev[id], [key]: value },
    }))
  }

  // ---- API calls ----

  async function handleSave(id: string) {
    const d = drafts[id]
    if (!d) return
    setSavingId(id)
    try {
      const resolvedIsShared = d.isShared === 'none' ? null : d.isShared
      const body: Record<string, string | null> = {
        accountName: d.accountName.trim(),
        service: d.service,
        phoneAuth: d.phoneAuth.trim() || null,
        isShared: resolvedIsShared,
        note: d.note.trim() || null,
      }
      await fetch(`/api/service-accounts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      // Optimistic local update so the UI reflects changes immediately
      setAccounts((prev) =>
        prev.map((a) =>
          a.id === id
            ? {
                ...a,
                accountName: body.accountName!,
                service: d.service,
                phoneAuth: body.phoneAuth,
                isShared: resolvedIsShared,
                note: body.note,
              }
            : a
        )
      )
      setEditingId(null)
      refresh()
    } catch (err) {
      console.error('서비스 계정 저장 실패:', err)
    } finally {
      setSavingId(null)
    }
  }

  async function handleDelete(acc: ServiceAccount) {
    if (!confirm(`'${acc.accountName}' 계정을 삭제하시겠습니까?`)) return
    setDeletingId(acc.id)
    try {
      await fetch(`/api/service-accounts/${acc.id}`, { method: 'DELETE' })
      setAccounts((prev) => prev.filter((a) => a.id !== acc.id))
      refresh()
    } catch (err) {
      console.error('서비스 계정 삭제 실패:', err)
    } finally {
      setDeletingId(null)
    }
  }

  // ---- render ----

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">서비스 계정 관리</h1>
          <p className="text-sm text-muted-foreground">Claude / Codex 서비스 계정 및 사용 멤버 관리</p>
        </div>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          + 계정 추가
        </Button>
      </div>

      {/* Table */}
      {accounts.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <p>등록된 서비스 계정이 없습니다</p>
          <Button className="mt-4" onClick={() => setAddOpen(true)}>
            첫 계정 추가하기
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="w-8 p-3" aria-label="확장" />
                <th className="text-left p-3 font-medium">계정명</th>
                <th className="text-left p-3 font-medium">서비스</th>
                <th className="text-left p-3 font-medium hidden md:table-cell">전화인증</th>
                <th className="text-left p-3 font-medium hidden sm:table-cell">공유계정</th>
                <th className="text-left p-3 font-medium hidden lg:table-cell">비고</th>
                <th className="text-left p-3 font-medium">멤버수</th>
                <th className="text-right p-3 font-medium">액션</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((acc) => {
                const isEditing = editingId === acc.id
                const isExpanded = expandedIds.has(acc.id)
                const d = drafts[acc.id]

                return (
                  <>
                    <tr
                      key={acc.id}
                      className="border-t hover:bg-muted/20 transition-colors"
                    >
                      {/* Expand button */}
                      <td className="p-3 w-8">
                        <button
                          className="text-muted-foreground hover:text-foreground transition-colors text-xs leading-none"
                          onClick={() => toggleExpand(acc.id)}
                          aria-label={isExpanded ? '멤버 목록 닫기' : '멤버 목록 열기'}
                          aria-expanded={isExpanded}
                        >
                          {isExpanded ? '▼' : '▶'}
                        </button>
                      </td>

                      {/* 계정명 */}
                      <td className="p-3">
                        {isEditing ? (
                          <Input
                            value={d.accountName}
                            onChange={(e) => updateDraft(acc.id, 'accountName', e.target.value)}
                            className="h-7 text-sm w-40"
                            aria-label="계정명"
                          />
                        ) : (
                          <span className="font-medium">{acc.accountName}</span>
                        )}
                      </td>

                      {/* 서비스 */}
                      <td className="p-3">
                        {isEditing ? (
                          <Select
                            value={d.service}
                            onValueChange={(v) =>
                              updateDraft(acc.id, 'service', v as 'claude' | 'codex')
                            }
                          >
                            <SelectTrigger size="sm" className="w-28" aria-label="서비스">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="claude">Claude</SelectItem>
                              <SelectItem value="codex">Codex</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <ServiceBadge service={acc.service} />
                        )}
                      </td>

                      {/* 전화인증 */}
                      <td className="p-3 hidden md:table-cell">
                        {isEditing ? (
                          <Input
                            value={d.phoneAuth}
                            onChange={(e) => updateDraft(acc.id, 'phoneAuth', e.target.value)}
                            placeholder="-"
                            className="h-7 text-sm w-36"
                            aria-label="전화인증"
                          />
                        ) : (
                          <span className="text-muted-foreground">{acc.phoneAuth ?? '-'}</span>
                        )}
                      </td>

                      {/* 공유계정 */}
                      <td className="p-3 hidden sm:table-cell">
                        {isEditing ? (
                          <Select
                            value={d.isShared}
                            onValueChange={(v) =>
                              updateDraft(acc.id, 'isShared', v as SharedValue)
                            }
                          >
                            <SelectTrigger size="sm" className="w-32" aria-label="공유계정">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">관리하지 않음</SelectItem>
                              <SelectItem value="Y">Y</SelectItem>
                              <SelectItem value="N">N</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <SharedBadge isShared={acc.isShared} />
                        )}
                      </td>

                      {/* 비고 */}
                      <td className="p-3 hidden lg:table-cell">
                        {isEditing ? (
                          <Input
                            value={d.note}
                            onChange={(e) => updateDraft(acc.id, 'note', e.target.value)}
                            placeholder="-"
                            className="h-7 text-sm w-48"
                            aria-label="비고"
                          />
                        ) : (
                          <span className="text-muted-foreground truncate max-w-xs block">
                            {acc.note ?? '-'}
                          </span>
                        )}
                      </td>

                      {/* 멤버수 */}
                      <td className="p-3">
                        <button
                          className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                          onClick={() => toggleExpand(acc.id)}
                          aria-label={`멤버 ${acc.members.length}명`}
                        >
                          <span>{acc.members.length}</span>
                          <span className="text-xs">명</span>
                        </button>
                      </td>

                      {/* 액션 */}
                      <td className="p-3">
                        <div className="flex justify-end gap-1">
                          {isEditing ? (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleSave(acc.id)}
                                disabled={savingId === acc.id}
                              >
                                {savingId === acc.id ? '저장 중...' : '저장'}
                              </Button>
                              <Button size="sm" variant="outline" onClick={cancelEdit}>
                                취소
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => startEdit(acc)}
                                disabled={deletingId === acc.id}
                              >
                                수정
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDelete(acc)}
                                disabled={deletingId === acc.id}
                              >
                                {deletingId === acc.id ? '...' : '삭제'}
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Expanded member sub-table */}
                    {isExpanded && <MemberSubTable key={`${acc.id}-members`} members={acc.members} />}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add dialog */}
      <AddDialog open={addOpen} onClose={() => setAddOpen(false)} onSuccess={refresh} />
    </div>
  )
}
