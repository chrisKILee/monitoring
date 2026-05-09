import type { NextAuthConfig } from 'next-auth'
import { NextResponse } from 'next/server'

// Edge-safe config (no DB/prisma imports) — used by middleware/proxy
export const authConfig: NextAuthConfig = {
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  callbacks: {
    session({ session, token }) {
      if (token.userId) session.user.id = token.userId as string
      if (token.role) session.user.role = token.role as string
      return session
    },
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl

      if (!auth?.user) {
        const signInUrl = new URL('/auth/signin', request.url)
        signInUrl.searchParams.set('callbackUrl', pathname)
        return NextResponse.redirect(signInUrl)
      }

      if (pathname.startsWith('/admin') && auth.user.role !== 'admin') {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }

      return true
    },
  },
  providers: [],
}
