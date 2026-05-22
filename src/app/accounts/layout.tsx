import { auth } from '@/auth'
import { requirePermission } from '@/lib/auth-utils'
import { redirect } from 'next/navigation'

export default async function AccountsLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user?.id) redirect('/auth/signin')
  await requirePermission(session.user.id, session.user.role, p => p.serviceAccRead)
  return <>{children}</>
}
