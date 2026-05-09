import { SignInButton } from '@/components/auth/SignInButton'

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-6 p-8 border rounded-xl shadow-sm bg-card">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Claude Usage Monitor</h1>
          <p className="text-sm text-muted-foreground">@vntgcorp.com 계정으로 로그인하세요</p>
        </div>
        <SignInButton />
      </div>
    </div>
  )
}
