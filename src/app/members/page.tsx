export const dynamic = 'force-dynamic'

import { MembersTable } from '@/components/members/MembersTable'

interface ServiceAccount {
  id: string
  accountName: string
  service: string
}

interface Member {
  id: string
  name: string
  purpose: string | null
  startDate: string | null
  endDate: string | null
  serviceAccountId: string | null
  serviceAccount: { id: string; accountName: string; service: string } | null
}

async function getMembers(): Promise<Member[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
    const res = await fetch(`${baseUrl}/api/members`, { cache: 'no-store' })
    if (!res.ok) return []
    return res.json() as Promise<Member[]>
  } catch {
    return []
  }
}

async function getServiceAccounts(): Promise<ServiceAccount[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
    const res = await fetch(`${baseUrl}/api/service-accounts`, { cache: 'no-store' })
    if (!res.ok) return []
    const data = await res.json() as ServiceAccount[]
    return data
  } catch {
    return []
  }
}

export default async function MembersPage() {
  const [members, serviceAccounts] = await Promise.all([
    getMembers(),
    getServiceAccounts(),
  ])

  return (
    <div className="container mx-auto px-4 py-6">
      <MembersTable
        initialMembers={members}
        initialServiceAccounts={serviceAccounts}
      />
    </div>
  )
}
