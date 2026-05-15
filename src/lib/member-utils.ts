export interface ServiceAccountWithMembers {
  memberLinks: { member: { name: string } }[]
}

export function dedupeMemberNames(serviceAccounts: ServiceAccountWithMembers[]): string[] {
  const unique = new Set<string>()
  for (const sa of serviceAccounts) {
    for (const link of sa.memberLinks) {
      unique.add(link.member.name)
    }
  }
  return Array.from(unique).sort((a, b) => a.localeCompare(b, 'ko'))
}
