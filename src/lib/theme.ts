import { prisma } from '@/lib/prisma'

export type ThemeId = 'linear' | 'stripe' | 'nord' | 'light-clean'

export const THEMES = [
  {
    id: 'linear' as ThemeId,
    name: 'Linear',
    description: '딥 블랙 + 라벤더 블루 — Linear 디자인 시스템',
    preview: { bg: '#010102', card: '#0f1011', primary: '#5e6ad2', accent: '#8a8f98' },
  },
  {
    id: 'stripe' as ThemeId,
    name: 'Stripe',
    description: '크리스프 화이트 + 딥 퍼플 — Stripe 디자인 시스템',
    preview: { bg: '#f6f9fc', card: '#ffffff', primary: '#533afd', accent: '#64748d' },
  },
  {
    id: 'nord' as ThemeId,
    name: 'Nord',
    description: '공식 Nord 팔레트 — 북유럽 블루그레이',
    preview: { bg: '#2e3440', card: '#3b4252', primary: '#88c0d0', accent: '#81a1c1' },
  },
  {
    id: 'light-clean' as ThemeId,
    name: 'Light Clean',
    description: '흰 배경 + Slate 블루 — 밝고 선명',
    preview: { bg: '#f8f9fa', card: '#ffffff', primary: '#2563eb', accent: '#64748b' },
  },
] as const

export async function getCurrentTheme(): Promise<ThemeId> {
  try {
    const setting = await prisma.setting.findUnique({ where: { key: 'theme' } })
    const value = setting?.value as ThemeId | undefined
    const valid = THEMES.map(t => t.id) as readonly string[]
    return (value && valid.includes(value) ? value : 'linear') as ThemeId
  } catch {
    return 'linear'
  }
}
