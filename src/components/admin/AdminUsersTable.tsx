'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface UserPermission {
  membersRead: boolean
  membersWrite: boolean
  serviceAccRead: boolean
  serviceAccWrite: boolean
  monitoringRead: boolean
  monitoringWrite: boolean
}

interface AppUser {
  id: string
  email: string
  name: string | null
  image: string | null
  role: string
  permissions: UserPermission | null
  createdAt: string
}

const PERM_LABELS: { key: keyof UserPermission; label: string }[] = [
  { key: 'membersRead', label: '사용자관리 R' },
  { key: 'membersWrite', label: '사용자관리 W' },
  { key: 'serviceAccRead', label: '계정관리 R' },
  { key: 'serviceAccWrite', label: '계정관리 W' },
  { key: 'monitoringRead', label: '모니터링 R' },
  { key: 'monitoringWrite', label: '모니터링 W' },
]

export function AdminUsersTable({ initialUsers }: { initialUsers: AppUser[] }) {
  const router = useRouter()
  const [users, setUsers] = useState<AppUser[]>(initialUsers)
  const [saving, setSaving] = useState<string | null>(null)
  const [pendingPerms, setPendingPerms] = useState<Record<string, Partial<UserPermission>>>({})

  useEffect(() => { setUsers(initialUsers) }, [initialUsers])

  const refresh = useCallback(() => router.refresh(), [router])

  function defaultPerms(p: UserPermission | null): UserPermission {
    return {
      membersRead: false,
      membersWrite: false,
      serviceAccRead: false,
      serviceAccWrite: false,
      monitoringRead: false,
      monitoringWrite: false,
      ...p,
    }
  }

  function getPerms(user: AppUser): UserPermission {
    return { ...defaultPerms(user.permissions), ...(pendingPerms[user.id] ?? {}) }
  }

  function togglePerm(userId: string, key: keyof UserPermission, current: boolean) {
    setPendingPerms((prev) => ({
      ...prev,
      [userId]: { ...(prev[userId] ?? {}), [key]: !current },
    }))
  }

  async function saveUser(user: AppUser) {
    setSaving(user.id)
    try {
      const perms = pendingPerms[user.id]
      await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: perms }),
      })
      setPendingPerms((prev) => {
        const next = { ...prev }
        delete next[user.id]
        return next
      })
      refresh()
    } finally {
      setSaving(null)
    }
  }

  async function toggleRole(user: AppUser) {
    const newRole = user.role === 'admin' ? 'user' : 'admin'
    if (!confirm(`${user.email}을 ${newRole}으로 변경하시겠습니까?`)) return
    setSaving(user.id)
    try {
      await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      })
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, role: newRole } : u)))
      refresh()
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">관리계정 관리</h1>
        <p className="text-sm text-muted-foreground">사용자 권한 및 역할을 관리합니다</p>
      </div>

      <div className="rounded-lg border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3 font-medium">사용자</th>
              <th className="text-left p-3 font-medium">역할</th>
              <th className="text-left p-3 font-medium">사용자관리</th>
              <th className="text-left p-3 font-medium">계정관리</th>
              <th className="text-left p-3 font-medium">모니터링</th>
              <th className="text-left p-3 font-medium">가입일</th>
              <th className="text-right p-3 font-medium">저장</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const perms = getPerms(user)
              const hasPending = !!pendingPerms[user.id]
              const isAdmin = user.role === 'admin'

              return (
                <tr key={user.id} className="border-t hover:bg-muted/10">
                  {/* 사용자 */}
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      {user.image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={user.image} alt="" className="w-7 h-7 rounded-full" />
                      )}
                      <div>
                        <p className="font-medium">{user.name ?? '-'}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                  </td>

                  {/* 역할 */}
                  <td className="p-3">
                    <button onClick={() => toggleRole(user)} disabled={saving === user.id}>
                      {isAdmin ? (
                        <Badge className="bg-orange-100 text-orange-700 border-orange-300 cursor-pointer hover:bg-orange-200">
                          admin
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="cursor-pointer hover:bg-muted">
                          user
                        </Badge>
                      )}
                    </button>
                  </td>

                  {/* 사용자관리 권한 */}
                  <td className="p-3">
                    {isAdmin ? (
                      <span className="text-xs text-muted-foreground">전체</span>
                    ) : (
                      <div className="flex gap-3">
                        <label className="flex items-center gap-1 cursor-pointer text-xs">
                          <input
                            type="checkbox"
                            checked={perms.membersRead}
                            onChange={() => togglePerm(user.id, 'membersRead', perms.membersRead)}
                            className="w-3.5 h-3.5"
                          />
                          Read
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer text-xs">
                          <input
                            type="checkbox"
                            checked={perms.membersWrite}
                            onChange={() => togglePerm(user.id, 'membersWrite', perms.membersWrite)}
                            className="w-3.5 h-3.5"
                          />
                          Write
                        </label>
                      </div>
                    )}
                  </td>

                  {/* 계정관리 권한 */}
                  <td className="p-3">
                    {isAdmin ? (
                      <span className="text-xs text-muted-foreground">전체</span>
                    ) : (
                      <div className="flex gap-3">
                        <label className="flex items-center gap-1 cursor-pointer text-xs">
                          <input
                            type="checkbox"
                            checked={perms.serviceAccRead}
                            onChange={() => togglePerm(user.id, 'serviceAccRead', perms.serviceAccRead)}
                            className="w-3.5 h-3.5"
                          />
                          Read
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer text-xs">
                          <input
                            type="checkbox"
                            checked={perms.serviceAccWrite}
                            onChange={() => togglePerm(user.id, 'serviceAccWrite', perms.serviceAccWrite)}
                            className="w-3.5 h-3.5"
                          />
                          Write
                        </label>
                      </div>
                    )}
                  </td>

                  {/* 모니터링 권한 */}
                  <td className="p-3">
                    {isAdmin ? (
                      <span className="text-xs text-muted-foreground">전체</span>
                    ) : (
                      <div className="flex gap-3">
                        <label className="flex items-center gap-1 cursor-pointer text-xs">
                          <input
                            type="checkbox"
                            checked={perms.monitoringRead}
                            onChange={() => togglePerm(user.id, 'monitoringRead', perms.monitoringRead)}
                            className="w-3.5 h-3.5"
                          />
                          Read
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer text-xs">
                          <input
                            type="checkbox"
                            checked={perms.monitoringWrite}
                            onChange={() => togglePerm(user.id, 'monitoringWrite', perms.monitoringWrite)}
                            className="w-3.5 h-3.5"
                          />
                          Write
                        </label>
                      </div>
                    )}
                  </td>

                  {/* 가입일 */}
                  <td className="p-3 text-xs text-muted-foreground">
                    {new Date(user.createdAt).toLocaleDateString('ko-KR')}
                  </td>

                  {/* 저장 */}
                  <td className="p-3 text-right">
                    {!isAdmin && (
                      <Button
                        size="sm"
                        disabled={!hasPending || saving === user.id}
                        onClick={() => saveUser(user)}
                      >
                        {saving === user.id ? '저장 중...' : '저장'}
                      </Button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
