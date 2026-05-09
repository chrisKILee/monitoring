import type { NextAuthConfig } from 'next-auth'
import { NextResponse } from 'next/server'

// Edge-safe config (no DB/prisma imports) — used by middleware/proxy
export const authConfig: NextAuthConfig = {
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl

      // Not authenticated → explicit redirect to sign-in
      if (!auth?.user) {
        const signInUrl = new URL('/auth/signin', request.url)
        signInUrl.searchParams.set('callbackUrl', pathname)
        return NextResponse.redirect(signInUrl)
      }

      // Admin-only path guard
      if (pathname.startsWith('/admin') && auth.user.role !== 'admin') {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }

      return true
    },
  },
  providers: [],
}
