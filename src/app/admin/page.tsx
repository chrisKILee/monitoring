export const dynamic = 'force-dynamic'

import { requireAdmin } from '@/lib/auth-utils'
import { AdminUsersTable } from '@/components/admin/AdminUsersTable'
import { prisma } from '@/lib/prisma'

export default async function AdminPage() {
  await requireAdmin()

  const users = await prisma.appUser.findMany({
    orderBy: { createdAt: 'asc' },
    include: { permissions: true },
  })

  return (
    <div className="container mx-auto px-4 py-6">
      <AdminUsersTable initialUsers={users as any} />
    </div>
  )
}
