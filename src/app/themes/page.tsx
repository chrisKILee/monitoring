import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { getCurrentTheme, THEMES } from '@/lib/theme'
import { ThemeSelector } from '@/components/themes/ThemeSelector'

export const dynamic = 'force-dynamic'

export default async function ThemesPage() {
  const session = await auth()
  if (session?.user?.role !== 'admin') redirect('/dashboard')

  const currentTheme = await getCurrentTheme()

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">테마 설정</h1>
        <p className="text-sm text-muted-foreground mt-1">
          선택한 테마는 모든 사용자에게 즉시 적용됩니다
        </p>
      </div>
      <ThemeSelector currentTheme={currentTheme} themes={THEMES} />
    </div>
  )
}
