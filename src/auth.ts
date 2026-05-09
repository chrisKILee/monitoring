import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import { authConfig } from '@/auth.config'
import { prisma } from '@/lib/prisma'

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    async signIn({ profile }) {
      const email = profile?.email
      if (!email?.endsWith('@vntgcorp.com')) return false

      const existing = await prisma.appUser.findUnique({ where: { email } })
      if (!existing) {
        const isFirst = (await prisma.appUser.count()) === 0
        const newUser = await prisma.appUser.create({
          data: {
            email,
            name: profile?.name ?? null,
            image: ((profile ?? {}) as Record<string, unknown>).picture as string ?? null,
            role: isFirst ? 'admin' : 'user',
          },
        })
        await prisma.userPermission.create({ data: { userId: newUser.id } })
      }
      return true
    },

    async jwt({ token, account, profile }) {
      if (account && profile?.email) {
        const user = await prisma.appUser.findUnique({ where: { email: profile.email } })
        if (user) {
          token.userId = user.id
          token.role = user.role
        }
      }
      return token
    },

    async session({ session, token }) {
      session.user.id = token.userId as string
      session.user.role = token.role as string
      return session
    },
  },
})
