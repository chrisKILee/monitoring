import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-6 p-8 border rounded-xl shadow-sm bg-card text-center">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-destructive">로그인 실패</h1>
          <p className="text-sm text-muted-foreground">
            @vntgcorp.com 계정만 로그인할 수 있습니다.
          </p>
        </div>
        <Link href="/auth/signin">
          <Button variant="outline" className="w-full">다시 시도</Button>
        </Link>
      </div>
    </div>
  )
}
