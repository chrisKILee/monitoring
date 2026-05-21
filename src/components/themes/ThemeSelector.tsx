'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ThemeId } from '@/lib/theme'
import type { THEMES } from '@/lib/theme'

type Theme = (typeof THEMES)[number]

interface ThemeSelectorProps {
  currentTheme: ThemeId
  themes: readonly Theme[]
}

function ThemePreview({ preview }: { preview: Theme['preview'] }) {
  return (
    <div
      className="w-full h-28 rounded-lg overflow-hidden relative flex flex-col gap-1.5 p-3"
      style={{ backgroundColor: preview.bg }}
    >
      {/* 상단 바 (nav 흉내) */}
      <div
        className="w-full h-2.5 rounded-full opacity-40"
        style={{ backgroundColor: preview.primary }}
      />
      {/* 카드 영역 */}
      <div className="flex gap-1.5 flex-1">
        <div
          className="flex-1 rounded-md flex flex-col gap-1 p-1.5"
          style={{ backgroundColor: preview.card }}
        >
          <div className="w-3/4 h-1.5 rounded-full opacity-60" style={{ backgroundColor: preview.primary }} />
          <div className="w-1/2 h-1 rounded-full opacity-30" style={{ backgroundColor: preview.primary }} />
          <div className="mt-auto w-full h-1 rounded-full opacity-20" style={{ backgroundColor: preview.primary }} />
        </div>
        <div
          className="flex-1 rounded-md flex flex-col gap-1 p-1.5"
          style={{ backgroundColor: preview.card }}
        >
          <div className="w-2/3 h-1.5 rounded-full opacity-60" style={{ backgroundColor: preview.primary }} />
          <div className="w-5/6 h-1 rounded-full opacity-30" style={{ backgroundColor: preview.primary }} />
          <div className="mt-auto w-3/4 h-1 rounded-full opacity-20" style={{ backgroundColor: preview.primary }} />
        </div>
      </div>
      {/* 하단 버튼 흉내 */}
      <div className="flex gap-1">
        <div
          className="h-2 w-10 rounded-full opacity-90"
          style={{ backgroundColor: preview.primary }}
        />
        <div
          className="h-2 w-8 rounded-full opacity-30"
          style={{ backgroundColor: preview.accent }}
        />
      </div>
    </div>
  )
}

export function ThemeSelector({ currentTheme, themes }: ThemeSelectorProps) {
  const router = useRouter()
  const [applying, setApplying] = useState<ThemeId | null>(null)
  const [selected, setSelected] = useState<ThemeId>(currentTheme)

  async function applyTheme(themeId: ThemeId) {
    if (themeId === selected) return
    setApplying(themeId)
    try {
      const res = await fetch('/api/settings/theme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: themeId }),
      })
      if (!res.ok) throw new Error('Failed to apply theme')
      setSelected(themeId)
      router.refresh()
    } catch (err) {
      console.error(err)
    } finally {
      setApplying(null)
    }
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {themes.map((theme) => {
        const isActive = selected === theme.id
        const isLoading = applying === theme.id

        return (
          <button
            key={theme.id}
            onClick={() => applyTheme(theme.id)}
            disabled={isLoading}
            aria-label={`${theme.name} 테마 적용`}
            aria-pressed={isActive}
            className={cn(
              'relative text-left rounded-xl border-2 p-4 transition-all duration-200',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              'disabled:cursor-not-allowed',
              isActive
                ? 'border-primary shadow-lg shadow-primary/10'
                : 'border-border hover:border-primary/50 hover:shadow-md',
            )}
          >
            {/* 현재 테마 체크 배지 */}
            {isActive && (
              <span className="absolute top-3 right-3 flex items-center gap-1 text-xs font-medium text-primary bg-primary/10 rounded-full px-2 py-0.5">
                <Check className="w-3 h-3" />
                적용 중
              </span>
            )}

            {/* 로딩 스피너 */}
            {isLoading && (
              <span className="absolute top-3 right-3 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
              </span>
            )}

            {/* 미니 프리뷰 */}
            <ThemePreview preview={theme.preview} />

            {/* 테마 정보 */}
            <div className="mt-3">
              <p className="font-semibold text-sm text-foreground">{theme.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{theme.description}</p>
            </div>
          </button>
        )
      })}
    </div>
  )
}
