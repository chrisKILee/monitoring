'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function Nav() {
  const pathname = usePathname()

  const links = [
    { href: '/dashboard', label: '대시보드' },
    { href: '/accounts', label: '계정 관리' },
  ]

  return (
    <nav className="border-b bg-background px-4 py-3 flex items-center gap-6">
      <span className="font-semibold text-sm text-muted-foreground">Claude Usage</span>
      <div className="flex gap-1">
        {links.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`px-3 py-1.5 rounded text-sm transition-colors ${
              pathname === href
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            {label}
          </Link>
        ))}
      </div>
    </nav>
  )
}
