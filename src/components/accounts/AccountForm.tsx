'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

type AiTool = 'claude' | 'codex'

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  account?: { id: string; name: string; alias: string | null; orgId: string | null; aiTool?: AiTool }
}

export function AccountForm({ open, onClose, onSuccess, account }: Props) {
  const isEdit = Boolean(account)
  const [name, setName] = useState(account?.name ?? '')
  const [alias, setAlias] = useState(account?.alias ?? '')
  const [aiTool, setAiTool] = useState<AiTool>(account?.aiTool ?? 'claude')
  const [cookiesJson, setCookiesJson] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      setName(account?.name ?? '')
      setAlias(account?.alias ?? '')
      setAiTool(account?.aiTool ?? 'claude')
      setCookiesJson('')
      setError(null)
    }
  }, [open, account])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (!isEdit && aiTool === 'claude' && !cookiesJson.trim()) {
        setError('Claude 계정은 쿠키 JSON 입력이 필요합니다')
        return
      }

      const url = isEdit ? `/api/accounts/${account!.id}` : '/api/accounts'
      const method = isEdit ? 'PUT' : 'POST'
      const body: Record<string, string | null> = {
        name,
        alias: alias.trim() || null,
        aiTool,
      }
      if (!isEdit && aiTool === 'claude') body.cookiesJson = cookiesJson
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
            <Label>AI 도구</Label>
            <div className="flex gap-2">
              {(['claude', 'codex'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setAiTool(t)}
                  className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium capitalize transition-colors ${
                    aiTool === t
                      ? 'border-primary bg-primary/10 text-foreground'
                      : 'border-border bg-background text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="name">계정 이름 <span className="text-xs text-muted-foreground">(내부 식별용)</span></Label>
            <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="예: share01" required />
          </div>

          <div className="space-y-1">
            <Label htmlFor="alias">
              표시 별칭 <span className="text-xs text-muted-foreground">(선택 — 비우면 이름이 표시됨)</span>
            </Label>
            <Input
              id="alias"
              value={alias}
              onChange={e => setAlias(e.target.value)}
              placeholder="예: 팀 공용 A"
            />
          </div>

          {aiTool === 'claude' ? (
            <div className="space-y-1">
              <Label htmlFor="cookies">쿠키 JSON {isEdit && <span className="text-muted-foreground">(변경 시에만 입력)</span>}</Label>
              <Textarea id="cookies" value={cookiesJson} onChange={e => setCookiesJson(e.target.value)}
                placeholder={'curl 명령어 전체 붙여넣기 (또는 Network 탭 cookie 헤더값)'}
                className="font-mono text-xs resize-none overflow-auto break-all h-24" required={!isEdit} />
              <p className="text-xs text-muted-foreground">
                Network 탭 요청 우클릭 → <strong>Copy as cURL</strong> → 여기에 붙여넣기
              </p>
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-border bg-muted/30 p-3 text-xs text-muted-foreground">
              Codex 계정은 메타데이터만 등록됩니다. 사용량 수집은 추후 별도 연동 예정입니다.
            </div>
          )}

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
