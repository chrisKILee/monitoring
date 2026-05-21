import { prisma } from '@/lib/prisma'

export type ThemeId = 'vercel-dark' | 'claude-purple' | 'nord' | 'light-clean'

export const THEMES = [
  {
    id: 'vercel-dark' as ThemeId,
    name: 'Vercel Dark',
    description: '미니멀, 샤프한 블랙',
    preview: { bg: '#171717', card: '#1a1a1a', primary: '#ffffff', accent: '#888888' },
  },
  {
    id: 'claude-purple' as ThemeId,
    name: 'Claude Purple',
    description: '딥 퍼플, 보라 글로우',
    preview: { bg: '#0d0a1f', card: '#14112a', primary: '#a855f7', accent: '#7c3aed' },
  },
  {
    id: 'nord' as ThemeId,
    name: 'Nord',
    description: '블루그레이, 차갑고 깔끔',
    preview: { bg: '#2e3440', card: '#3b4252', primary: '#88c0d0', accent: '#5e81ac' },
  },
  {
    id: 'light-clean' as ThemeId,
    name: 'Light Clean',
    description: '밝고 깔끔, 인디고 포인트',
    preview: { bg: '#f5f5f5', card: '#ffffff', primary: '#4f46e5', accent: '#818cf8' },
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
