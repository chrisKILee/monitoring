export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { ServiceAccountsTable } from '@/components/service-accounts/ServiceAccountsTable'

const PREFIX_ORDER = ['rnd_dev', 'claude_share', 'vntg_ai_license']

function getSortGroup(name: string): number {
  const idx = PREFIX_ORDER.findIndex((p) => name.startsWith(p))
  return idx === -1 ? PREFIX_ORDER.length : idx
}

export default async function ServiceAccountsPage() {
  const accounts = await prisma.serviceAccount.findMany({
    include: {
      members: {
        select: { id: true, name: true, purpose: true, startDate: true, endDate: true },
        orderBy: { name: 'asc' },
      },
    },
  })

  const sorted = [...accounts].sort((a, b) => {
    const ga = getSortGroup(a.accountName)
    const gb = getSortGroup(b.accountName)
    if (ga !== gb) return ga - gb
    return a.accountName.localeCompare(b.accountName)
  })

  return (
    <div className="container mx-auto px-4 py-6">
      <ServiceAccountsTable initialData={sorted as any} />
    </div>
  )
}
