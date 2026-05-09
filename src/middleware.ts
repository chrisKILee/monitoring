import { auth } from '@/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const { pathname } = req.nextUrl

  if (!req.auth?.user) {
    return NextResponse.redirect(new URL('/auth/signin', req.url))
  }

  if (pathname.startsWith('/admin') && req.auth.user.role !== 'admin') {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }
})

export const config = {
  matcher: [
    '/((?!api/auth|_next/static|_next/image|favicon|auth/signin|auth/error).*)',
  ],
}
