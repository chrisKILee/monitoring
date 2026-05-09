import { ServiceAccountsTable } from '@/components/service-accounts/ServiceAccountsTable'

interface Member {
  id: string
  name: string
  purpose: string | null
  startDate: string | null
  endDate: string | null
}

interface ServiceAccount {
  id: string
  accountName: string
  service: 'claude' | 'codex'
  phoneAuth: string | null
  isShared: string | null
  note: string | null
  members: Member[]
}

async function getServiceAccounts(): Promise<ServiceAccount[]> {
  try {
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ??
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

    const res = await fetch(`${baseUrl}/api/service-accounts`, {
      cache: 'no-store',
    })

    if (!res.ok) {
      console.error('서비스 계정 조회 실패:', res.status, res.statusText)
      return []
    }

    const json = (await res.json()) as ServiceAccount[] | { data: ServiceAccount[] }

    // API가 배열 또는 { data: [...] } 형태일 수 있으므로 두 경우 처리
    if (Array.isArray(json)) return json
    if ('data' in json && Array.isArray(json.data)) return json.data
    return []
  } catch (err) {
    console.error('서비스 계정 페치 오류:', err)
    return []
  }
}

export default async function ServiceAccountsPage() {
  const accounts = await getServiceAccounts()

  return (
    <div className="container mx-auto px-4 py-6">
      <ServiceAccountsTable initialData={accounts} />
    </div>
  )
}
