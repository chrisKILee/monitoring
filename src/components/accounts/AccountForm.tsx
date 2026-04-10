'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  account?: { id: string; name: string; orgId: string }
}

export function AccountForm({ open, onClose, onSuccess, account }: Props) {
  const isEdit = Boolean(account)
  const [name, setName] = useState(account?.name ?? '')
  const [cookiesJson, setCookiesJson] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (!isEdit && !cookiesJson.trim()) {
        setError('쿠키 JSON을 입력해주세요')
        return
      }

      const url = isEdit ? `/api/accounts/${account!.id}` : '/api/accounts'
      const method = isEdit ? 'PUT' : 'POST'
      const body: Record<string, string> = { name }
      if (!isEdit) body.cookiesJson = cookiesJson
      if (isEdit && cookiesJson.trim()) body.cookiesJson = cookiesJson

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json() as { error?: { message: string } }
      if (!res.ok) { setError(data.error?.message ?? '오류가 발생했습니다'); return }

      onSuccess()
      onClose()
    } catch {
      setError('네트워크 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{isEdit ? '계정 수정' : '계정 추가'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto flex-1 pr-1">
          <div className="space-y-1">
            <Label htmlFor="name">계정 별칭</Label>
            <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="예: share01" required />
          </div>

          <div className="space-y-1">
            <Label htmlFor="cookies">쿠키 JSON {isEdit && <span className="text-muted-foreground">(변경 시에만 입력)</span>}</Label>
            <Textarea id="cookies" value={cookiesJson} onChange={e => setCookiesJson(e.target.value)}
              placeholder={'F12 → Network → 아무 요청 클릭 → Request Headers → cookie: 값 전체 복사'}
              rows={5} className="font-mono text-xs resize-none overflow-x-hidden break-all" required={!isEdit} />
            <p className="text-xs text-muted-foreground">
              F12 → Network 탭 → claude.ai 요청 클릭 → Request Headers → <code>cookie</code> 값 전체 붙여넣기
            </p>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>취소</Button>
            <Button type="submit" disabled={loading}>
              {loading ? '저장 중...' : isEdit ? '수정' : '추가'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
