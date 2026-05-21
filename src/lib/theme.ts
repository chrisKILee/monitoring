import { prisma } from '@/lib/prisma'

export type ThemeId = 'vercel-dark' | 'claude-purple' | 'nord' | 'light-clean'

export const THEMES = [
  {
    id: 'vercel-dark' as ThemeId,
    name: 'Vercel Dark',
    description: '블랙 + Vercel 블루 — 미니멀 대시보드',
    preview: { bg: '#000000', card: '#0a0a0a', primary: '#0070f3', accent: '#a1a1a1' },
  },
  {
    id: 'claude-purple' as ThemeId,
    name: 'Claude Purple',
    description: '딥 퍼플 + 바이올렛 글로우',
    preview: { bg: '#0d0b18', card: '#16132a', primary: '#c084fc', accent: '#818cf8' },
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
    return (setting?.value as ThemeId) ?? 'vercel-dark'
  } catch {
    return 'vercel-dark'
  }
}
