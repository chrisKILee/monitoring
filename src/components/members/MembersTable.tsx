'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface ServiceAccount {
  id: string
  accountName: string
  service: string
}

interface Member {
  id: string
  name: string
  purpose: string | null
  startDate: string | null
  endDate: string | null
  serviceAccountId: string | null
  serviceAccount: { id: string; accountName: string; service: string } | null
}

interface EndDateBadgeProps {
  endDate: string | null
}

function EndDateBadge({ endDate }: EndDateBadgeProps) {
  if (!endDate) {
    return <span className="text-muted-foreground text-xs">기한 없음</span>
  }

  const end = new Date(endDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  end.setHours(0, 0, 0, 0)

  const diffMs = end.getTime() - today.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  const label = end.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' })

  if (diffDays < 0) {
    return (
      <div className="flex flex-col gap-0.5">
        <span className="text-xs text-muted-foreground">{label}</span>
        <Badge variant="destructive" className="w-fit">만료됨</Badge>
      </div>
    )
  }
  if (diffDays === 0) {
    return (
      <div className="flex flex-col gap-0.5">
        <span className="text-xs text-muted-foreground">{label}</span>
        <Badge variant="destructive" className="w-fit">오늘</Badge>
      </div>
    )
  }
  if (diffDays <= 5) {
    return (
      <div className="flex flex-col gap-0.5">
        <span className="text-xs text-muted-foreground">{label}</span>
        <Badge className="w-fit bg-orange-500 text-white">D-{diffDays}</Badge>
      </div>
    )
  }

  return <span className="text-xs text-muted-foreground">{label}</span>
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  return dateStr.slice(0, 10)
}

interface EditState {
  name: string
  purpose: string
  startDate: string
  endDate: string
  serviceAccountId: string
}

interface MembersTableProps {
  initialMembers: Member[]
  initialServiceAccounts: ServiceAccount[]
}

export function MembersTable({ initialMembers, initialServiceAccounts }: MembersTableProps) {
  const router = useRouter()
  const [members, setMembers] = useState<Member[]>(initialMembers)
  const [serviceAccounts, setServiceAccounts] = useState<ServiceAccount[]>(initialServiceAccounts)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editState, setEditState] = useState<EditState>({
    name: '',
    purpose: '',
    startDate: '',
    endDate: '',
    serviceAccountId: '',
  })
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [addForm, setAddForm] = useState({
    name: '',
    purpose: '',
    startDate: '',
    endDate: '',
    serviceAccountId: '',
  })
  const [addError, setAddError] = useState<string | null>(null)
  const [addLoading, setAddLoading] = useState(false)

  // serviceAccounts가 비어 있으면 API에서 가져옴 (폴백)
  useEffect(() => {
    if (serviceAccounts.length === 0) {
      fetch('/api/service-accounts')
        .then(r => r.json())
        .then((data: ServiceAccount[]) => setServiceAccounts(data))
        .catch(e => console.error('service-accounts fetch error', e))
    }
  }, [serviceAccounts.length])

  async function refreshMembers() {
    try {
      const res = await fetch('/api/members')
      const data = await res.json() as Member[]
      setMembers(data)
    } catch (e) {
      console.error('members refresh error', e)
    }
    router.refresh()
  }

  function startEdit(member: Member) {
    setEditingId(member.id)
    setEditState({
      name: member.name,
      purpose: member.purpose ?? '',
      startDate: formatDate(member.startDate),
      endDate: formatDate(member.endDate),
      serviceAccountId: member.serviceAccountId ?? '',
    })
  }

  function cancelEdit() {
    setEditingId(null)
  }

  async function handleSave(id: string) {
    setSaving(true)
    try {
      const body: Record<string, string | null> = {
        name: editState.name.trim(),
        purpose: editState.purpose.trim() || null,
        startDate: editState.startDate || null,
        endDate: editState.endDate || null,
        serviceAccountId: editState.serviceAccountId || null,
      }
      const res = await fetch(`/api/members/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json() as { error?: string }
        console.error('PATCH error', data.error)
        return
      }
      setEditingId(null)
      await refreshMembers()
    } catch (e) {
      console.error('save error', e)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/members/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json() as { error?: string }
        console.error('DELETE error', data.error)
        return
      }
      await refreshMembers()
    } catch (e) {
      console.error('delete error', e)
    } finally {
      setDeletingId(null)
    }
  }

  function openAddDialog() {
    setAddForm({ name: '', purpose: '', startDate: '', endDate: '', serviceAccountId: '' })
    setAddError(null)
    setAddOpen(true)
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!addForm.name.trim()) {
      setAddError('이름은 필수입니다')
      return
    }
    setAddError(null)
    setAddLoading(true)
    try {
      const body = {
        name: addForm.name.trim(),
        purpose: addForm.purpose.trim() || null,
        startDate: addForm.startDate || null,
        endDate: addForm.endDate || null,
        serviceAccountId: addForm.serviceAccountId || null,
      }
      const res = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json() as { error?: string }
        setAddError(data.error ?? '오류가 발생했습니다')
        return
      }
      setAddOpen(false)
      await refreshMembers()
    } catch (e) {
      console.error('add error', e)
      setAddError('네트워크 오류가 발생했습니다')
    } finally {
      setAddLoading(false)
    }
  }

  return (
    <>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">사용자 관리</h1>
          <p className="text-sm text-muted-foreground mt-0.5">서비스 계정 사용자 등록 및 기간 관리</p>
        </div>
        <Button size="sm" onClick={openAddDialog}>+ 사용자 추가</Button>
      </div>

      {/* 테이블 카드 */}
      {members.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <p>등록된 사용자가 없습니다</p>
          <Button className="mt-4" onClick={openAddDialog}>첫 사용자 추가하기</Button>
        </div>
      ) : (
        <div className="rounded-xl border ring-1 ring-foreground/10 overflow-hidden bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 font-medium">이름</th>
                <th className="text-left p-3 font-medium hidden md:table-cell">목적</th>
                <th className="text-left p-3 font-medium hidden sm:table-cell">시작일</th>
                <th className="text-left p-3 font-medium">종료일</th>
                <th className="text-left p-3 font-medium hidden lg:table-cell">계정명</th>
                <th className="text-left p-3 font-medium hidden lg:table-cell">서비스</th>
                <th className="text-right p-3 font-medium">액션</th>
              </tr>
            </thead>
            <tbody>
              {members.map(member => {
                const isEditing = editingId === member.id
                const isDeleting = deletingId === member.id

                if (isEditing) {
                  return (
                    <tr key={member.id} className="border-t bg-muted/20">
                      {/* 이름 */}
                      <td className="p-2">
                        <Input
                          value={editState.name}
                          onChange={e => setEditState(s => ({ ...s, name: e.target.value }))}
                          className="h-7 text-sm min-w-24"
                          placeholder="이름"
                        />
                      </td>
                      {/* 목적 */}
                      <td className="p-2 hidden md:table-cell">
                        <Input
                          value={editState.purpose}
                          onChange={e => setEditState(s => ({ ...s, purpose: e.target.value }))}
                          className="h-7 text-sm min-w-24"
                          placeholder="목적"
                        />
                      </td>
                      {/* 시작일 */}
                      <td className="p-2 hidden sm:table-cell">
                        <Input
                          type="date"
                          value={editState.startDate}
                          onChange={e => setEditState(s => ({ ...s, startDate: e.target.value }))}
                          className="h-7 text-sm w-36"
                        />
                      </td>
                      {/* 종료일 */}
                      <td className="p-2">
                        <Input
                          type="date"
                          value={editState.endDate}
                          onChange={e => setEditState(s => ({ ...s, endDate: e.target.value }))}
                          className="h-7 text-sm w-36"
                        />
                      </td>
                      {/* 계정명 / 서비스 (편집 시 통합 선택) */}
                      <td className="p-2 hidden lg:table-cell" colSpan={2}>
                        <select
                          value={editState.serviceAccountId}
                          onChange={e => setEditState(s => ({ ...s, serviceAccountId: e.target.value }))}
                          className="h-7 rounded-md border border-input bg-transparent px-2 text-sm outline-none focus:ring-2 focus:ring-ring/50 w-52"
                        >
                          <option value="">없음</option>
                          {serviceAccounts.map(sa => (
                            <option key={sa.id} value={sa.id}>
                              {sa.accountName} ({sa.service})
                            </option>
                          ))}
                        </select>
                      </td>
                      {/* 액션 */}
                      <td className="p-2">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            onClick={() => handleSave(member.id)}
                            disabled={saving}
                          >
                            {saving ? '저장 중...' : '저장'}
                          </Button>
                          <Button size="sm" variant="outline" onClick={cancelEdit}>
                            취소
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                }

                return (
                  <tr
                    key={member.id}
                    className="border-t hover:bg-muted/20 cursor-pointer transition-colors"
                    onClick={() => startEdit(member)}
                  >
                    {/* 이름 */}
                    <td className="p-3 font-medium">{member.name}</td>
                    {/* 목적 */}
                    <td className="p-3 text-muted-foreground hidden md:table-cell">
                      {member.purpose ?? <span className="text-muted-foreground/50">-</span>}
                    </td>
                    {/* 시작일 */}
                    <td className="p-3 text-xs text-muted-foreground hidden sm:table-cell">
                      {member.startDate
                        ? new Date(member.startDate).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' })
                        : <span className="text-muted-foreground/50">-</span>}
                    </td>
                    {/* 종료일 */}
                    <td className="p-3">
                      <EndDateBadge endDate={member.endDate} />
                    </td>
                    {/* 계정명 */}
                    <td className="p-3 text-sm hidden lg:table-cell">
                      {member.serviceAccount
                        ? <span className="font-medium">{member.serviceAccount.accountName}</span>
                        : <span className="text-muted-foreground">-</span>}
                    </td>
                    {/* 서비스 */}
                    <td className="p-3 hidden lg:table-cell">
                      {member.serviceAccount
                        ? (
                          member.serviceAccount.service === 'claude'
                            ? <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700">Claude</span>
                            : <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700">Codex</span>
                        )
                        : <span className="text-muted-foreground">-</span>}
                    </td>
                    {/* 액션 */}
                    <td
                      className="p-3"
                      onClick={e => e.stopPropagation()}
                    >
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startEdit(member)}
                        >
                          수정
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(member.id)}
                          disabled={isDeleting}
                        >
                          {isDeleting ? '...' : '삭제'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 사용자 추가 Dialog */}
      <Dialog open={addOpen} onOpenChange={open => { if (!open) setAddOpen(false) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>사용자 추가</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4 mt-2">
            <div className="space-y-1">
              <Label htmlFor="add-name">
                이름 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="add-name"
                value={addForm.name}
                onChange={e => setAddForm(s => ({ ...s, name: e.target.value }))}
                placeholder="예: 홍길동"
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="add-purpose">
                목적 <span className="text-xs text-muted-foreground">(선택)</span>
              </Label>
              <Input
                id="add-purpose"
                value={addForm.purpose}
                onChange={e => setAddForm(s => ({ ...s, purpose: e.target.value }))}
                placeholder="예: 개발팀 AI 지원"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="add-startDate">
                  시작일 <span className="text-xs text-muted-foreground">(선택)</span>
                </Label>
                <Input
                  id="add-startDate"
                  type="date"
                  value={addForm.startDate}
                  onChange={e => setAddForm(s => ({ ...s, startDate: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="add-endDate">
                  종료일 <span className="text-xs text-muted-foreground">(선택)</span>
                </Label>
                <Input
                  id="add-endDate"
                  type="date"
                  value={addForm.endDate}
                  onChange={e => setAddForm(s => ({ ...s, endDate: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="add-serviceAccount">
                사용 계정 <span className="text-xs text-muted-foreground">(선택)</span>
              </Label>
              <select
                id="add-serviceAccount"
                value={addForm.serviceAccountId}
                onChange={e => setAddForm(s => ({ ...s, serviceAccountId: e.target.value }))}
                className="w-full h-8 rounded-md border border-input bg-transparent px-2 text-sm outline-none focus:ring-2 focus:ring-ring/50"
              >
                <option value="">없음</option>
                {serviceAccounts.map(sa => (
                  <option key={sa.id} value={sa.id}>
                    {sa.accountName} ({sa.service})
                  </option>
                ))}
              </select>
            </div>

            {addError && (
              <p className="text-sm text-destructive">{addError}</p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                취소
              </Button>
              <Button type="submit" disabled={addLoading}>
                {addLoading ? '추가 중...' : '추가'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
