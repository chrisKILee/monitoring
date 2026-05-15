'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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

interface ServiceAccount {
  id: string
  accountName: string
  service: string
}

interface AccountLink {
  id: string
  serviceAccountId: string
  startDate: string | null
  endDate: string | null
  serviceAccount: ServiceAccount
}

interface Member {
  id: string
  name: string
  department: string | null
  purpose: string | null
  serviceAccounts: AccountLink[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(s: string | null): string {
  if (!s) return ''
  return s.slice(0, 10)
}

function displayDate(s: string | null): string {
  if (!s) return '-'
  return new Date(s).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' })
}

function EndDateBadge({ endDate }: { endDate: string | null }) {
  if (!endDate) return <span className="text-muted-foreground text-xs">기한 없음</span>

  const end = new Date(endDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  end.setHours(0, 0, 0, 0)

  const diffDays = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  const label = displayDate(endDate)

  if (diffDays < 0) return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <Badge variant="destructive" className="w-fit text-xs">만료됨</Badge>
    </div>
  )
  if (diffDays === 0) return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <Badge variant="destructive" className="w-fit text-xs">오늘</Badge>
    </div>
  )
  if (diffDays <= 5) return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <Badge className="w-fit text-xs bg-orange-500 text-white">D-{diffDays}</Badge>
    </div>
  )
  return <span className="text-xs text-muted-foreground">{label}</span>
}

function ServiceBadge({ service }: { service: string }) {
  return service === 'claude'
    ? <Badge className="text-xs bg-purple-100 text-purple-700 border-purple-200">Claude</Badge>
    : <Badge className="text-xs bg-blue-100 text-blue-700 border-blue-200">Codex</Badge>
}

// ---------------------------------------------------------------------------
// Account sub-table
// ---------------------------------------------------------------------------

function AccountSubTable({
  member,
  allServiceAccounts,
  onRefresh,
}: {
  member: Member
  allServiceAccounts: ServiceAccount[]
  onRefresh: () => void
}) {
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null)
  const [editDates, setEditDates] = useState({ startDate: '', endDate: '' })
  const [addOpen, setAddOpen] = useState(false)
  const [addForm, setAddForm] = useState({ serviceAccountId: 'none', startDate: '', endDate: '' })
  const [changingLink, setChangingLink] = useState<AccountLink | null>(null)
  const [changeToSaId, setChangeToSaId] = useState<string>('none')
  const [saving, setSaving] = useState(false)

  const usedIds = new Set(member.serviceAccounts.map(l => l.serviceAccountId))
  const available = allServiceAccounts.filter(sa => !usedIds.has(sa.id))

  function startEditLink(link: AccountLink) {
    setEditingLinkId(link.id)
    setEditDates({ startDate: formatDate(link.startDate), endDate: formatDate(link.endDate) })
  }

  async function saveLink(linkId: string) {
    setSaving(true)
    try {
      await fetch(`/api/members/${member.id}/accounts/${linkId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: editDates.startDate || null,
          endDate: editDates.endDate || null,
        }),
      })
      setEditingLinkId(null)
      onRefresh()
    } finally { setSaving(false) }
  }

  async function removeLink(linkId: string) {
    await fetch(`/api/members/${member.id}/accounts/${linkId}`, { method: 'DELETE' })
    onRefresh()
  }

  async function changeLink() {
    if (!changingLink || changeToSaId === 'none') return
    setSaving(true)
    try {
      const res = await fetch(`/api/members/${member.id}/accounts/${changingLink.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceAccountId: changeToSaId }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert(`계정 변경 실패: ${err.error ?? res.status}`)
        return
      }
      setChangingLink(null)
      setChangeToSaId('none')
      onRefresh()
    } finally { setSaving(false) }
  }

  async function addLink(e: React.FormEvent) {
    e.preventDefault()
    if (addForm.serviceAccountId === 'none') return
    setSaving(true)
    try {
      const res = await fetch(`/api/members/${member.id}/accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceAccountId: addForm.serviceAccountId,
          startDate: addForm.startDate || null,
          endDate: addForm.endDate || null,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert(`계정 추가 실패: ${err.error ?? res.status}`)
        return
      }
      setAddOpen(false)
      setAddForm({ serviceAccountId: 'none', startDate: '', endDate: '' })
      onRefresh()
    } finally { setSaving(false) }
  }

  return (
    <tr>
      <td colSpan={5} className="p-0 bg-muted/10">
        <div className="pl-10 pr-4 py-2 space-y-1">
          <table className="w-full text-xs border rounded-md overflow-hidden">
            <thead className="bg-muted/60">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">사용 계정</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">시작일</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">종료일</th>
                <th className="text-right px-3 py-2 font-medium text-muted-foreground">액션</th>
              </tr>
            </thead>
            <tbody>
              {member.serviceAccounts.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-3 text-muted-foreground text-center">
                    계정 없음
                  </td>
                </tr>
              )}
              {member.serviceAccounts.map(link => {
                const isEditing = editingLinkId === link.id
                return (
                  <tr key={link.id} className="border-t hover:bg-muted/20">
                    <td className="px-3 py-2">
                      <span className="font-medium mr-1.5">{link.serviceAccount.accountName}</span>
                      <ServiceBadge service={link.serviceAccount.service} />
                    </td>
                    <td className="px-3 py-2">
                      {isEditing
                        ? <Input type="date" value={editDates.startDate} onChange={e => setEditDates(d => ({ ...d, startDate: e.target.value }))} className="h-6 text-xs w-32" />
                        : <span className="text-muted-foreground">{displayDate(link.startDate)}</span>}
                    </td>
                    <td className="px-3 py-2">
                      {isEditing
                        ? <Input type="date" value={editDates.endDate} onChange={e => setEditDates(d => ({ ...d, endDate: e.target.value }))} className="h-6 text-xs w-32" />
                        : <EndDateBadge endDate={link.endDate} />}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-1">
                        {isEditing ? (
                          <>
                            <Button size="sm" className="h-6 text-xs px-2" onClick={() => saveLink(link.id)} disabled={saving}>저장</Button>
                            <Button size="sm" variant="outline" className="h-6 text-xs px-2" onClick={() => setEditingLinkId(null)}>취소</Button>
                          </>
                        ) : (
                          <>
                            <Button size="sm" variant="outline" className="h-6 text-xs px-2" onClick={() => startEditLink(link)}>수정</Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 text-xs px-2"
                              onClick={() => { setChangingLink(link); setChangeToSaId('none') }}
                              disabled={available.length === 0}
                              title={available.length === 0 ? '변경 가능한 계정 없음' : '계정 변경'}
                            >
                              변경
                            </Button>
                            <Button size="sm" variant="destructive" className="h-6 text-xs px-2" onClick={() => removeLink(link.id)}>제거</Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          <Button
            size="sm"
            variant="outline"
            className="h-6 text-xs"
            onClick={() => setAddOpen(true)}
            disabled={available.length === 0}
          >
            + 계정 추가
          </Button>
        </div>
      </td>

      {/* 계정 변경 Dialog */}
      <Dialog open={!!changingLink} onOpenChange={open => { if (!open) { setChangingLink(null); setChangeToSaId('none') } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{member.name} — 계정 변경</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-1">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                현재: <span className="font-medium text-foreground">{changingLink?.serviceAccount.accountName}</span>
              </p>
            </div>
            <div className="space-y-1">
              <Label>변경할 계정</Label>
              <Select value={changeToSaId} onValueChange={(v: string | null) => setChangeToSaId(v ?? 'none')}>
                <SelectTrigger><SelectValue placeholder="선택" /></SelectTrigger>
                <SelectContent>
                  {available.map(sa => (
                    <SelectItem key={sa.id} value={sa.id}>
                      {sa.accountName} ({sa.service})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => { setChangingLink(null); setChangeToSaId('none') }}>취소</Button>
              <Button onClick={changeLink} disabled={saving || changeToSaId === 'none'}>변경</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={addOpen} onOpenChange={open => { if (!open) setAddOpen(false) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{member.name} — 계정 추가</DialogTitle></DialogHeader>
          <form onSubmit={addLink} className="space-y-3 mt-1">
            <div className="space-y-1">
              <Label>계정 선택</Label>
              <Select value={addForm.serviceAccountId} onValueChange={(v: string | null) => setAddForm(f => ({ ...f, serviceAccountId: v ?? 'none' }))}>
                <SelectTrigger><SelectValue placeholder="선택" /></SelectTrigger>
                <SelectContent>
                  {available.map(sa => (
                    <SelectItem key={sa.id} value={sa.id}>
                      {sa.accountName} ({sa.service})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>시작일</Label>
                <Input type="date" value={addForm.startDate} onChange={e => setAddForm(f => ({ ...f, startDate: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>종료일</Label>
                <Input type="date" value={addForm.endDate} onChange={e => setAddForm(f => ({ ...f, endDate: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>취소</Button>
              <Button type="submit" disabled={saving || addForm.serviceAccountId === 'none'}>추가</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </tr>
  )
}

// ---------------------------------------------------------------------------
// Main table
// ---------------------------------------------------------------------------

interface MembersTableProps {
  initialMembers: Member[]
  initialServiceAccounts: ServiceAccount[]
}

export function MembersTable({ initialMembers, initialServiceAccounts }: MembersTableProps) {
  const router = useRouter()
  const [members, setMembers] = useState<Member[]>(initialMembers)
  const [serviceAccounts] = useState<ServiceAccount[]>(initialServiceAccounts)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editState, setEditState] = useState({ name: '', department: '', purpose: '' })
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [addForm, setAddForm] = useState({ name: '', department: '', purpose: '' })
  const [addLoading, setAddLoading] = useState(false)

  useEffect(() => { setMembers(initialMembers) }, [initialMembers])

  const refresh = useCallback(async () => {
    const res = await fetch('/api/members')
    const data = await res.json() as Member[]
    setMembers(data)
    router.refresh()
  }, [router])

  function toggleExpand(id: string) {
    setExpandedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function startEdit(member: Member) {
    setEditingId(member.id)
    setEditState({ name: member.name, department: member.department ?? '', purpose: member.purpose ?? '' })
    setExpandedIds(prev => new Set(prev).add(member.id))
  }

  async function handleSave(id: string) {
    setSaving(true)
    try {
      await fetch(`/api/members/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editState.name.trim(), department: editState.department.trim() || null, purpose: editState.purpose.trim() || null }),
      })
      setEditingId(null)
      await refresh()
    } finally { setSaving(false) }
  }

  async function handleDelete(member: Member) {
    if (!confirm(`'${member.name}'을 삭제하시겠습니까?`)) return
    setDeletingId(member.id)
    try {
      await fetch(`/api/members/${member.id}`, { method: 'DELETE' })
      await refresh()
    } finally { setDeletingId(null) }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!addForm.name.trim()) return
    setAddLoading(true)
    try {
      const res = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: addForm.name.trim(), department: addForm.department.trim() || null, purpose: addForm.purpose.trim() || null }),
      })
      const newMember = await res.json() as Member
      setAddOpen(false)
      setAddForm({ name: '', department: '', purpose: '' })
      await refresh()
      // 새 멤버 자동 expand
      setExpandedIds(prev => new Set(prev).add(newMember.id))
    } finally { setAddLoading(false) }
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">사용자 관리</h1>
          <p className="text-sm text-muted-foreground mt-0.5">서비스 계정 사용자 등록 및 기간 관리</p>
        </div>
        <Button size="sm" onClick={() => setAddOpen(true)}>+ 사용자 추가</Button>
      </div>

      {members.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <p>등록된 사용자가 없습니다</p>
          <Button className="mt-4" onClick={() => setAddOpen(true)}>첫 사용자 추가하기</Button>
        </div>
      ) : (
        <div className="rounded-xl border ring-1 ring-foreground/10 overflow-hidden bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="w-8 p-3" />
                <th className="text-left p-3 font-medium">이름</th>
                <th className="text-left p-3 font-medium hidden lg:table-cell">부서</th>
                <th className="text-left p-3 font-medium hidden md:table-cell">목적</th>
                <th className="text-left p-3 font-medium hidden sm:table-cell">사용 계정 수</th>
                <th className="text-right p-3 font-medium">액션</th>
              </tr>
            </thead>
            <tbody>
              {members.map(member => {
                const isExpanded = expandedIds.has(member.id)
                const isEditing = editingId === member.id
                const isDeleting = deletingId === member.id

                return (
                  <>
                    <tr
                      key={member.id}
                      className="border-t hover:bg-muted/20 transition-colors cursor-pointer"
                      onClick={() => !isEditing && toggleExpand(member.id)}
                    >
                      {/* Expand */}
                      <td className="p-3 w-8">
                        <span className="text-muted-foreground text-xs">
                          {isExpanded ? '▼' : '▶'}
                        </span>
                      </td>

                      {/* 이름 */}
                      <td className="p-3" onClick={e => isEditing && e.stopPropagation()}>
                        {isEditing ? (
                          <Input
                            value={editState.name}
                            onChange={e => setEditState(s => ({ ...s, name: e.target.value }))}
                            className="h-7 text-sm w-36"
                            onClick={e => e.stopPropagation()}
                          />
                        ) : (
                          <span className="font-medium">{member.name}</span>
                        )}
                      </td>

                      {/* 부서 */}
                      <td className="p-3 hidden lg:table-cell" onClick={e => isEditing && e.stopPropagation()}>
                        {isEditing ? (
                          <Input
                            value={editState.department}
                            onChange={e => setEditState(s => ({ ...s, department: e.target.value }))}
                            className="h-7 text-sm w-32"
                            placeholder="부서명"
                            onClick={e => e.stopPropagation()}
                          />
                        ) : (
                          <span className="text-muted-foreground text-xs">{member.department ?? '-'}</span>
                        )}
                      </td>

                      {/* 목적 */}
                      <td className="p-3 hidden md:table-cell" onClick={e => isEditing && e.stopPropagation()}>
                        {isEditing ? (
                          <Input
                            value={editState.purpose}
                            onChange={e => setEditState(s => ({ ...s, purpose: e.target.value }))}
                            className="h-7 text-sm w-40"
                            placeholder="목적"
                            onClick={e => e.stopPropagation()}
                          />
                        ) : (
                          <span className="text-muted-foreground">{member.purpose ?? '-'}</span>
                        )}
                      </td>

                      {/* 계정 수 */}
                      <td className="p-3 hidden sm:table-cell">
                        {member.serviceAccounts.length === 0
                          ? <span className="text-muted-foreground text-xs">없음</span>
                          : (
                            <div className="flex flex-wrap gap-1">
                              {member.serviceAccounts.map(link => (
                                <ServiceBadge key={link.id} service={link.serviceAccount.service} />
                              ))}
                              <span className="text-xs text-muted-foreground self-center">
                                {member.serviceAccounts.length}개
                              </span>
                            </div>
                          )
                        }
                      </td>

                      {/* 액션 */}
                      <td className="p-3" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-end gap-1">
                          {isEditing ? (
                            <>
                              <Button size="sm" onClick={() => handleSave(member.id)} disabled={saving}>
                                {saving ? '저장 중...' : '저장'}
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>취소</Button>
                            </>
                          ) : (
                            <>
                              <Button size="sm" variant="outline" onClick={() => startEdit(member)}>수정</Button>
                              <Button size="sm" variant="destructive" onClick={() => handleDelete(member)} disabled={isDeleting}>
                                {isDeleting ? '...' : '삭제'}
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>

                    {isExpanded && (
                      <AccountSubTable
                        key={`${member.id}-accounts`}
                        member={member}
                        allServiceAccounts={serviceAccounts}
                        onRefresh={refresh}
                      />
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 사용자 추가 Dialog */}
      <Dialog open={addOpen} onOpenChange={open => { if (!open) setAddOpen(false) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>사용자 추가</DialogTitle></DialogHeader>
          <form onSubmit={handleAdd} className="space-y-3 mt-1">
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
              <Label htmlFor="add-department">부서명</Label>
              <Input
                id="add-department"
                value={addForm.department}
                onChange={e => setAddForm(s => ({ ...s, department: e.target.value }))}
                placeholder="예: 서비스개발팀"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="add-purpose">목적</Label>
              <Input
                id="add-purpose"
                value={addForm.purpose}
                onChange={e => setAddForm(s => ({ ...s, purpose: e.target.value }))}
                placeholder="예: 개발팀 AI 지원"
              />
            </div>
            <p className="text-xs text-muted-foreground">저장 후 ▶ 펼쳐서 계정과 날짜를 추가하세요.</p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>취소</Button>
              <Button type="submit" disabled={addLoading}>{addLoading ? '추가 중...' : '추가'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
