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
  serviceAccounts: ServiceAccount[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function EndDateBadge({ endDate }: { endDate: string | null }) {
  if (!endDate) return <span className="text-muted-foreground text-xs">기한 없음</span>

  const end = new Date(endDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  end.setHours(0, 0, 0, 0)

  const diffDays = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  const label = end.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' })

  if (diffDays < 0) return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <Badge variant="destructive" className="w-fit">만료됨</Badge>
    </div>
  )
  if (diffDays === 0) return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <Badge variant="destructive" className="w-fit">오늘</Badge>
    </div>
  )
  if (diffDays <= 5) return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <Badge className="w-fit bg-orange-500 text-white">D-{diffDays}</Badge>
    </div>
  )
  return <span className="text-xs text-muted-foreground">{label}</span>
}

function ServiceBadge({ service }: { service: string }) {
  if (service === 'claude') {
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700">
        Claude
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700">
      Codex
    </span>
  )
}

function AccountList({ accounts }: { accounts: ServiceAccount[] }) {
  if (accounts.length === 0) return <span className="text-muted-foreground text-xs">-</span>
  return (
    <div className="flex flex-wrap gap-1">
      {accounts.map(sa => (
        <span key={sa.id} className="inline-flex items-center gap-1">
          <span className="text-xs font-medium">{sa.accountName}</span>
          <ServiceBadge service={sa.service} />
        </span>
      ))}
    </div>
  )
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  return dateStr.slice(0, 10)
}

// ---------------------------------------------------------------------------
// Multi-select checkboxes for service accounts
// ---------------------------------------------------------------------------

function ServiceAccountPicker({
  serviceAccounts,
  selected,
  onChange,
}: {
  serviceAccounts: ServiceAccount[]
  selected: string[]
  onChange: (ids: string[]) => void
}) {
  function toggle(id: string) {
    onChange(
      selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]
    )
  }

  // Group by service
  const claude = serviceAccounts.filter(sa => sa.service === 'claude')
  const codex = serviceAccounts.filter(sa => sa.service === 'codex')

  return (
    <div className="border rounded-md p-2 max-h-48 overflow-y-auto space-y-3">
      {claude.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-purple-700 mb-1">Claude</p>
          <div className="space-y-1">
            {claude.map(sa => (
              <label key={sa.id} className="flex items-center gap-2 cursor-pointer text-sm hover:bg-muted/30 rounded px-1">
                <input
                  type="checkbox"
                  checked={selected.includes(sa.id)}
                  onChange={() => toggle(sa.id)}
                  className="w-3.5 h-3.5 accent-purple-600"
                />
                {sa.accountName}
              </label>
            ))}
          </div>
        </div>
      )}
      {codex.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-blue-700 mb-1">Codex</p>
          <div className="space-y-1">
            {codex.map(sa => (
              <label key={sa.id} className="flex items-center gap-2 cursor-pointer text-sm hover:bg-muted/30 rounded px-1">
                <input
                  type="checkbox"
                  checked={selected.includes(sa.id)}
                  onChange={() => toggle(sa.id)}
                  className="w-3.5 h-3.5 accent-blue-600"
                />
                {sa.accountName}
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EditState {
  name: string
  purpose: string
  startDate: string
  endDate: string
  serviceAccountIds: string[]
}

interface AddForm {
  name: string
  purpose: string
  startDate: string
  endDate: string
  serviceAccountIds: string[]
}

interface MembersTableProps {
  initialMembers: Member[]
  initialServiceAccounts: ServiceAccount[]
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function MembersTable({ initialMembers, initialServiceAccounts }: MembersTableProps) {
  const router = useRouter()
  const [members, setMembers] = useState<Member[]>(initialMembers)
  const [serviceAccounts, setServiceAccounts] = useState<ServiceAccount[]>(initialServiceAccounts)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editState, setEditState] = useState<EditState>({
    name: '', purpose: '', startDate: '', endDate: '', serviceAccountIds: [],
  })
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [addForm, setAddForm] = useState<AddForm>({
    name: '', purpose: '', startDate: '', endDate: '', serviceAccountIds: [],
  })
  const [addError, setAddError] = useState<string | null>(null)
  const [addLoading, setAddLoading] = useState(false)

  useEffect(() => { setMembers(initialMembers) }, [initialMembers])

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
      serviceAccountIds: member.serviceAccounts.map(sa => sa.id),
    })
  }

  function cancelEdit() { setEditingId(null) }

  async function handleSave(id: string) {
    setSaving(true)
    try {
      const res = await fetch(`/api/members/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editState.name.trim(),
          purpose: editState.purpose.trim() || null,
          startDate: editState.startDate || null,
          endDate: editState.endDate || null,
          serviceAccountIds: editState.serviceAccountIds,
        }),
      })
      if (!res.ok) return
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
      await fetch(`/api/members/${id}`, { method: 'DELETE' })
      await refreshMembers()
    } catch (e) {
      console.error('delete error', e)
    } finally {
      setDeletingId(null)
    }
  }

  function openAddDialog() {
    setAddForm({ name: '', purpose: '', startDate: '', endDate: '', serviceAccountIds: [] })
    setAddError(null)
    setAddOpen(true)
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!addForm.name.trim()) { setAddError('이름은 필수입니다'); return }
    setAddError(null)
    setAddLoading(true)
    try {
      const res = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: addForm.name.trim(),
          purpose: addForm.purpose.trim() || null,
          startDate: addForm.startDate || null,
          endDate: addForm.endDate || null,
          serviceAccountIds: addForm.serviceAccountIds,
        }),
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">사용자 관리</h1>
          <p className="text-sm text-muted-foreground mt-0.5">서비스 계정 사용자 등록 및 기간 관리</p>
        </div>
        <Button size="sm" onClick={openAddDialog}>+ 사용자 추가</Button>
      </div>

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
                <th className="text-left p-3 font-medium hidden sm:table-cell">시작일</th>
                <th className="text-left p-3 font-medium">종료일</th>
                <th className="text-left p-3 font-medium hidden lg:table-cell">사용 계정</th>
                <th className="text-left p-3 font-medium hidden md:table-cell">목적</th>
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
                      <td className="p-2">
                        <Input
                          value={editState.name}
                          onChange={e => setEditState(s => ({ ...s, name: e.target.value }))}
                          className="h-7 text-sm min-w-24"
                          placeholder="이름"
                        />
                      </td>
                      <td className="p-2 hidden sm:table-cell">
                        <Input
                          type="date"
                          value={editState.startDate}
                          onChange={e => setEditState(s => ({ ...s, startDate: e.target.value }))}
                          className="h-7 text-sm w-36"
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          type="date"
                          value={editState.endDate}
                          onChange={e => setEditState(s => ({ ...s, endDate: e.target.value }))}
                          className="h-7 text-sm w-36"
                        />
                      </td>
                      <td className="p-2 hidden lg:table-cell w-64">
                        <ServiceAccountPicker
                          serviceAccounts={serviceAccounts}
                          selected={editState.serviceAccountIds}
                          onChange={ids => setEditState(s => ({ ...s, serviceAccountIds: ids }))}
                        />
                      </td>
                      <td className="p-2 hidden md:table-cell">
                        <Input
                          value={editState.purpose}
                          onChange={e => setEditState(s => ({ ...s, purpose: e.target.value }))}
                          className="h-7 text-sm min-w-24"
                          placeholder="목적"
                        />
                      </td>
                      <td className="p-2">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" onClick={() => handleSave(member.id)} disabled={saving}>
                            {saving ? '저장 중...' : '저장'}
                          </Button>
                          <Button size="sm" variant="outline" onClick={cancelEdit}>취소</Button>
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
                    <td className="p-3 font-medium">{member.name}</td>
                    <td className="p-3 text-xs text-muted-foreground hidden sm:table-cell">
                      {member.startDate
                        ? new Date(member.startDate).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' })
                        : <span className="text-muted-foreground/50">-</span>}
                    </td>
                    <td className="p-3">
                      <EndDateBadge endDate={member.endDate} />
                    </td>
                    <td className="p-3 hidden lg:table-cell">
                      <AccountList accounts={member.serviceAccounts} />
                    </td>
                    <td className="p-3 text-muted-foreground hidden md:table-cell">
                      {member.purpose ?? <span className="text-muted-foreground/50">-</span>}
                    </td>
                    <td className="p-3" onClick={e => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="outline" onClick={() => startEdit(member)}>수정</Button>
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
              <Label htmlFor="add-name">이름 <span className="text-destructive">*</span></Label>
              <Input
                id="add-name"
                value={addForm.name}
                onChange={e => setAddForm(s => ({ ...s, name: e.target.value }))}
                placeholder="예: 홍길동"
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="add-purpose">목적 <span className="text-xs text-muted-foreground">(선택)</span></Label>
              <Input
                id="add-purpose"
                value={addForm.purpose}
                onChange={e => setAddForm(s => ({ ...s, purpose: e.target.value }))}
                placeholder="예: 개발팀 AI 지원"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="add-startDate">시작일</Label>
                <Input
                  id="add-startDate"
                  type="date"
                  value={addForm.startDate}
                  onChange={e => setAddForm(s => ({ ...s, startDate: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="add-endDate">종료일</Label>
                <Input
                  id="add-endDate"
                  type="date"
                  value={addForm.endDate}
                  onChange={e => setAddForm(s => ({ ...s, endDate: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>사용 계정 <span className="text-xs text-muted-foreground">(복수 선택 가능)</span></Label>
              <ServiceAccountPicker
                serviceAccounts={serviceAccounts}
                selected={addForm.serviceAccountIds}
                onChange={ids => setAddForm(s => ({ ...s, serviceAccountIds: ids }))}
              />
            </div>
            {addError && <p className="text-sm text-destructive">{addError}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>취소</Button>
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
