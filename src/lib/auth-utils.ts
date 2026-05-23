import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'

export async function requireAuth() {
  const session = await auth()
  if (!session?.user?.id) redirect('/auth/signin')
  return session
}

export async function requireAdmin() {
  const session = await requireAuth()
  if (session.user.role !== 'admin') redirect('/dashboard')
  return session
}

export async function getPermissions(userId: string) {
  return prisma.userPermission.findUnique({ where: { userId } })
}

export async function requirePermission(
  userId: string,
  role: string,
  check: (p: { serviceAccRead: boolean; serviceAccWrite: boolean; monitoringRead: boolean; monitoringWrite: boolean; receiptRead: boolean }) => boolean
) {
  if (role === 'admin') return
  const perms = await getPermissions(userId)
  if (!perms || !check(perms)) redirect('/')
}
