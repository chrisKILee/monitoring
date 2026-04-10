'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

// 2단계 스크립트: prompt() 없이 비블로킹
const STEP1_SCRIPT = `(function(){
  const r={}
  document.cookie.split(';').forEach(c=>{
    const[k,...v]=c.trim().split('=')
    if(['anthropic-device-id','lastActiveOrg','activitySessionId'].includes(k))r[k]=v.join('=')
  })
  const m=location.href.match(/organizations\\/([^/]+)/)
  if(m)r._orgId=m[1]
  window._cc=r
  console.log('%c① Application탭→Cookies→claude.ai→sessionKey 값 복사 후 아래 실행:','color:orange;font-weight:bold;font-size:13px')
  console.log('%c_cc.sessionKey="sk-ant-...여기붙여넣기"; _done()','background:#222;color:#0f0;font-size:13px;padding:4px')
  window._done=()=>{
    const j=JSON.stringify(window._cc,null,2)
    navigator.clipboard.writeText(j).then(()=>console.log('%c✅ 클립보드 복사 완료!','color:lime;font-weight:bold;font-size:14px'))
    console.log(j)
  }
})()`

interface Props {
  open: boolean
  onClose: () => void
}

type Method = 'network' | 'script'

export function CookieGuideDialog({ open, onClose }: Props) {
  const [copied, setCopied] = useState(false)
  const [method, setMethod] = useState<Method>('network')

  async function handleCopy() {
    await navigator.clipboard.writeText(STEP1_SCRIPT)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>쿠키 추출 방법</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2">
          <Button size="sm" variant={method === 'network' ? 'default' : 'outline'}
            onClick={() => setMethod('network')}>
            Network 탭 (추천)
          </Button>
          <Button size="sm" variant={method === 'script' ? 'default' : 'outline'}
            onClick={() => setMethod('script')}>
            Console 스크립트
          </Button>
        </div>

        {method === 'network' && (
          <ol className="space-y-3 text-sm">
            <li className="flex gap-2">
              <span className="font-bold text-primary">1.</span>
              <span><a href="https://claude.ai" target="_blank" rel="noreferrer" className="underline text-primary">claude.ai</a> 에서 <kbd className="px-1 bg-muted rounded text-xs">F12</kbd> → <strong>Network</strong> 탭을 열어주세요.</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-primary">2.</span>
              <span>목록에서 <strong>아무 요청이나</strong> 클릭하세요. (없으면 페이지 새로고침)</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-primary">3.</span>
              <span><strong>Headers</strong> 탭 → <strong>Request Headers</strong> → <code className="bg-muted px-1 rounded text-xs">cookie</code> 값을 <strong>전체 선택해서 복사</strong>하세요.</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-primary">4.</span>
              <span>계정 추가 폼의 쿠키 필드에 <strong>그대로 붙여넣기</strong> 하세요.</span>
            </li>
          </ol>
        )}

        {method === 'script' && (
          <>
            <ol className="space-y-2 text-sm">
              <li className="flex gap-2">
                <span className="font-bold text-primary">1.</span>
                <span>claude.ai에서 <kbd className="px-1 bg-muted rounded text-xs">F12</kbd> → <strong>Console</strong> 탭 → 아래 스크립트 복사 후 실행</span>
              </li>
            </ol>

            <div className="relative">
              <pre className="bg-muted rounded-md p-3 text-xs overflow-x-auto whitespace-pre-wrap font-mono max-h-36">
                {STEP1_SCRIPT}
              </pre>
              <Button size="sm" variant="secondary" className="absolute top-2 right-2" onClick={handleCopy}>
                {copied ? '✅ 복사됨' : '복사'}
              </Button>
            </div>

            <ol className="space-y-2 text-sm" start={2}>
              <li className="flex gap-2">
                <span className="font-bold text-primary">2.</span>
                <span>Console에 안내가 뜨면 → <strong>Application 탭</strong> → Cookies → claude.ai → <code className="bg-muted px-1 rounded text-xs">sessionKey</code> 값 복사</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-primary">3.</span>
                <span>다시 Console로 돌아와 아래 형식으로 실행:</span>
              </li>
            </ol>
            <pre className="bg-muted rounded p-2 text-xs font-mono">
              {`_cc.sessionKey="sk-ant-...복사한값"; _done()`}
            </pre>
            <p className="text-xs text-muted-foreground">✅ 클립보드에 자동 복사됩니다.</p>
          </>
        )}

        <p className="text-xs text-muted-foreground bg-yellow-50 dark:bg-yellow-950 rounded p-2">
          ⚠ 세션 쿠키는 주기적으로 만료됩니다. API 오류 발생 시 이 과정을 반복하세요.
        </p>
      </DialogContent>
    </Dialog>
  )
}
