export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { ServiceAccountsTable } from '@/components/service-accounts/ServiceAccountsTable'

const PREFIX_ORDER = ['rnd_dev', 'claude_share', 'vntg_ai_license']

function getSortGroup(name: string): number {
  const idx = PREFIX_ORDER.findIndex((p) => name.startsWith(p))
  return idx === -1 ? PREFIX_ORDER.length : idx
}

export default async function ServiceAccountsPage() {
  const [serviceAccounts, monitoringAccounts] = await Promise.all([
    prisma.serviceAccount.findMany({
      include: {
        account: { select: { id: true, name: true, alias: true, isActive: true, lastError: true } },
        memberLinks: {
          include: { member: { select: { id: true, name: true, purpose: true } } },
          orderBy: { member: { name: 'asc' } },
        },
      },
    }),
    prisma.account.findMany({
      orderBy: { sortOrder: 'asc' },
      select: { id: true, name: true, alias: true, isActive: true },
    }),
  ])

  const sorted = [...serviceAccounts].sort((a, b) => {
    const ga = getSortGroup(a.accountName)
    const gb = getSortGroup(b.accountName)
    if (ga !== gb) return ga - gb
    return a.accountName.localeCompare(b.accountName)
  })

  return (
    <div className="container mx-auto px-4 py-6">
      <ServiceAccountsTable initialData={sorted as any} monitoringAccounts={monitoringAccounts} />
    </div>
  )
}
