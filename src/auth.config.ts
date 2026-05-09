import type { NextAuthConfig } from 'next-auth'

// Edge-safe config (no DB/prisma imports) — used by middleware
export const authConfig: NextAuthConfig = {
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user?.id
      const isAdmin = auth?.user?.role === 'admin'
      const pathname = nextUrl.pathname

      if (!isLoggedIn) return false
      if (pathname.startsWith('/admin') && !isAdmin) return false
      return true
    },
  },
  providers: [],
}
