'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface Props {
  open: boolean
  onClose: () => void
}

export function CookieGuideDialog({ open, onClose }: Props) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>쿠키 추출 방법</DialogTitle>
        </DialogHeader>

        <ol className="space-y-4 text-sm">
          <li className="flex gap-3">
            <span className="font-bold text-primary shrink-0">1.</span>
            <span>
              <a href="https://claude.ai" target="_blank" rel="noreferrer"
                className="underline text-primary">claude.ai</a> 접속 후{' '}
              <kbd className="px-1 bg-muted rounded text-xs">F12</kbd> →{' '}
              <strong>Network</strong> 탭 열기
            </span>
          </li>
          <li className="flex gap-3">
            <span className="font-bold text-primary shrink-0">2.</span>
            <span>
              목록에서 아무 요청이나 <strong>우클릭</strong><br />
              → <strong>Copy</strong> → <strong>Copy as cURL</strong>
            </span>
          </li>
          <li className="flex gap-3">
            <span className="font-bold text-primary shrink-0">3.</span>
            <span>
              계정 추가 폼의 <strong>쿠키</strong> 필드에 붙여넣기
            </span>
          </li>
        </ol>

        <p className="text-xs text-muted-foreground bg-amber-50 dark:bg-amber-950 rounded p-2 mt-2">
          ⚠ 쿠키는 주기적으로 만료됩니다. 오류 발생 시 재추출 후 수정하세요.
        </p>
      </DialogContent>
    </Dialog>
  )
}
