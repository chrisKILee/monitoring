'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

const EXTRACT_SCRIPT = `(function() {
  const needed = ['sessionKey', 'anthropic-device-id',
                  'lastActiveOrg', 'activitySessionId']
  const result = {}
  document.cookie.split(';').forEach(c => {
    const [k, ...v] = c.trim().split('=')
    if (needed.includes(k)) result[k] = v.join('=')
  })
  const orgMatch = location.href.match(/organizations\\/([^/]+)/)
  if (orgMatch) result._orgId = orgMatch[1]
  console.log(JSON.stringify(result, null, 2))
  copy(JSON.stringify(result))
  console.log('✅ 클립보드에 복사 완료!')
})()`

interface Props {
  open: boolean
  onClose: () => void
}

export function CookieGuideDialog({ open, onClose }: Props) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(EXTRACT_SCRIPT)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>🍪 쿠키 추출 가이드</DialogTitle>
        </DialogHeader>

        <ol className="space-y-3 text-sm">
          <li className="flex gap-2">
            <span className="font-bold text-primary">1.</span>
            <span>
              <a href="https://claude.ai" target="_blank" rel="noreferrer"
                className="underline text-primary">claude.ai</a>에 로그인 후, 모니터링할 계정(기관)으로 이동하세요.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold text-primary">2.</span>
            <span><kbd className="px-1 bg-muted rounded text-xs">F12</kbd> → <strong>Console</strong> 탭을 열어주세요.</span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold text-primary">3.</span>
            <span>아래 스크립트를 복사하여 Console에 붙여넣고 <kbd className="px-1 bg-muted rounded text-xs">Enter</kbd>를 누르세요.</span>
          </li>
        </ol>

        <div className="relative">
          <pre className="bg-muted rounded-md p-3 text-xs overflow-x-auto whitespace-pre-wrap font-mono">
            {EXTRACT_SCRIPT}
          </pre>
          <Button size="sm" variant="secondary" className="absolute top-2 right-2"
            onClick={handleCopy}>
            {copied ? '✅ 복사됨' : '복사'}
          </Button>
        </div>

        <ol className="space-y-2 text-sm" start={4}>
          <li className="flex gap-2">
            <span className="font-bold text-primary">4.</span>
            <span>Console에 JSON이 출력되고 클립보드에 복사됩니다.</span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold text-primary">5.</span>
            <span>계정 추가/수정 폼의 <strong>쿠키 JSON</strong> 필드에 붙여넣기 하세요.</span>
          </li>
        </ol>

        <p className="text-xs text-muted-foreground bg-yellow-50 dark:bg-yellow-950 rounded p-2">
          ⚠ 세션 쿠키는 주기적으로 만료됩니다. API 오류 발생 시 이 과정을 반복하여 갱신하세요.
        </p>
      </DialogContent>
    </Dialog>
  )
}
