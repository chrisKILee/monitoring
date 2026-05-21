'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'

export function Nav() {
  const pathname = usePathname()
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return (
      <nav className="border-b bg-background px-4 py-3 flex items-center gap-6">
        <span className="font-semibold text-sm text-muted-foreground">Claude Usage</span>
      </nav>
    )
  }

  if (!session) return null

  const role = session.user.role
  const isAdmin = role === 'admin'

  // Nav links are shown based on role (admin sees all; user sees based on permissions fetched server-side)
  // For client-side nav, we show all if admin; for regular users the page itself enforces permission
  const links = [
    { href: '/dashboard', label: '대시보드', always: true },
    { href: '/members', label: '사용자 관리', always: isAdmin },
    { href: '/service-accounts', label: '계정 관리', always: isAdmin },
    { href: '/accounts', label: '모니터링 계정', always: isAdmin },
    { href: '/admin', label: '관리계정 관리', always: isAdmin, adminOnly: true },
    { href: '/themes', label: '테마', always: isAdmin, adminOnly: true },
  ].filter((l) => l.always)

  return (
    <nav className="border-b bg-background px-4 py-3 flex items-center gap-6">
      <span className="font-semibold text-sm text-muted-foreground">Claude Usage</span>
      <div className="flex gap-1 flex-1">
        {links.map(({ href, label, adminOnly }) => (
          <Link
            key={href}
            href={href}
            className={`px-3 py-1.5 rounded text-sm transition-colors ${
              pathname === href || pathname.startsWith(href + '/')
                ? 'bg-primary text-primary-foreground'
                : adminOnly
                  ? 'text-orange-600 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-950/20'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            {label}
          </Link>
        ))}
      </div>
      <div className="flex items-center gap-3">
        {session.user.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={session.user.image}
            alt={session.user.name ?? ''}
            className="w-7 h-7 rounded-full"
          />
        )}
        <span className="text-xs text-muted-foreground hidden md:block">
          {session.user.name ?? session.user.email}
          {isAdmin && <span className="ml-1 text-orange-500 font-medium">(admin)</span>}
        </span>
        <Button
          size="sm"
          variant="ghost"
          className="text-xs"
          onClick={() => signOut({ callbackUrl: '/auth/signin' })}
        >
          로그아웃
        </Button>
      </div>
    </nav>
  )
}
