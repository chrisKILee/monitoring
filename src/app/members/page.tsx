export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { MembersTable } from '@/components/members/MembersTable'

export default async function MembersPage() {
  const [members, serviceAccounts] = await Promise.all([
    prisma.member.findMany({
      orderBy: { createdAt: 'asc' },
      include: { serviceAccount: { select: { id: true, accountName: true, service: true } } },
    }),
    prisma.serviceAccount.findMany({
      orderBy: { accountName: 'asc' },
      select: { id: true, accountName: true, service: true },
    }),
  ])

  return (
    <div className="container mx-auto px-4 py-6">
      <MembersTable
        initialMembers={members as any}
        initialServiceAccounts={serviceAccounts}
      />
    </div>
  )
}
