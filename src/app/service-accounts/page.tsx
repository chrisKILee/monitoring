export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { ServiceAccountsTable } from '@/components/service-accounts/ServiceAccountsTable'

export default async function ServiceAccountsPage() {
  const accounts = await prisma.serviceAccount.findMany({
    orderBy: { accountName: 'asc' },
    include: {
      members: {
        select: { id: true, name: true, purpose: true, startDate: true, endDate: true },
        orderBy: { name: 'asc' },
      },
    },
  })

  return (
    <div className="container mx-auto px-4 py-6">
      <ServiceAccountsTable initialData={accounts as any} />
    </div>
  )
}
