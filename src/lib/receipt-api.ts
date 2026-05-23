import { decrypt } from './crypto'

export interface ReceiptRow {
  accountId: string
  aiTool: 'claude' | 'codex'
  email: string
  alias: string | null
  invoiceDate: string | null
  amount: number | null
  currency: string | null
  status: string | null
  last4: string | null
  billingInterval: string | null
  nextChargeDate: string | null
  error?: string
}

interface ClaudeInvoice {
  id?: string
  created?: number
  total_excluding_tax?: number
  currency?: string
  status?: string
  payment_method_details?: { card?: { last4?: string } }
  default_payment_method?: { card?: { last4?: string } }
  billing_interval?: string
  collection_method?: string
}

interface ClaudeSubscription {
  next_charge_date?: string
  billing_interval?: string
  plan?: { billing_interval?: string }
}

interface CodexInvoice {
  id?: string
  created?: number
  period_end?: number
  amount_due?: number
  total_excluding_tax?: number
  currency?: string
  status?: string
  billing_interval?: string
  next_payment_attempt?: number
}

interface CodexPaymentMethod {
  last4?: string
  is_default?: boolean
}

function decodeJwtPayload<T = Record<string, unknown>>(token: string): T | null {
  try {
    const payload = token.split('.')[1]
    if (!payload) return null
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as T
  } catch {
    return null
  }
}

export function extractCodexAccountId(token: string): string | null {
  const payload = decodeJwtPayload<{
    'https://api.openai.com/auth'?: { chatgpt_account_id?: string }
  }>(token)
  return payload?.['https://api.openai.com/auth']?.chatgpt_account_id ?? null
}

function claudeHeaders(cookieStr: string): Record<string, string> {
  return {
    accept: '*/*',
    'accept-language': 'ko-KR,ko;q=0.9',
    'content-type': 'application/json',
    cookie: cookieStr,
    'anthropic-client-platform': 'web_claude_ai',
    'cache-control': 'no-cache',
  }
}

function codexHeaders(token: string): Record<string, string> {
  return {
    accept: '*/*',
    'accept-language': 'ko-KR,ko;q=0.9',
    authorization: `Bearer ${token}`,
    'cache-control': 'no-cache',
  }
}

export async function fetchClaudeInvoices(orgId: string, encryptedCookies: string): Promise<ClaudeInvoice[]> {
  const cookieStr = decrypt(encryptedCookies)
  const parsed = JSON.parse(cookieStr) as Record<string, string>
  const cookieHeader = Object.entries(parsed)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ')

  const res = await fetch(
    `https://claude.ai/api/stripe/${orgId}/invoices?limit=12&page=`,
    { headers: claudeHeaders(cookieHeader) }
  )
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    console.error(`[receipt] Claude invoices ${orgId} HTTP ${res.status}:`, body.slice(0, 300))
    throw new Error(`Claude invoices HTTP ${res.status}: ${body.slice(0, 200)}`)
  }
  const data = await res.json() as ClaudeInvoice[] | { data?: ClaudeInvoice[] } | undefined
  console.log(`[receipt] Claude invoices ${orgId}: raw type=${Array.isArray(data) ? 'array' : typeof data}, keys=${data && !Array.isArray(data) ? Object.keys(data).join(',') : '-'}`)
  if (Array.isArray(data)) return data
  if (data && 'data' in data && Array.isArray(data.data)) return data.data
  return []
}

export async function fetchClaudeSubscription(orgId: string, encryptedCookies: string): Promise<ClaudeSubscription> {
  const cookieStr = decrypt(encryptedCookies)
  const parsed = JSON.parse(cookieStr) as Record<string, string>
  const cookieHeader = Object.entries(parsed)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ')

  const res = await fetch(
    `https://claude.ai/api/organizations/${orgId}/subscription_details`,
    { headers: claudeHeaders(cookieHeader) }
  )
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    console.error(`[receipt] Claude subscription ${orgId} HTTP ${res.status}:`, body.slice(0, 300))
    throw new Error(`Claude subscription HTTP ${res.status}: ${body.slice(0, 200)}`)
  }
  const data = await res.json() as ClaudeSubscription
  console.log(`[receipt] Claude subscription ${orgId}: keys=${Object.keys(data).join(',')}`)
  return data
}

export async function fetchCodexInvoices(token: string, accountId: string): Promise<CodexInvoice[]> {
  const res = await fetch(
    `https://chatgpt.com/backend-api/invoices?limit=12&account_id=${accountId}`,
    { headers: codexHeaders(token) }
  )
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    console.error(`[receipt] Codex invoices ${accountId} HTTP ${res.status}:`, body.slice(0, 300))
    throw new Error(`Codex invoices HTTP ${res.status}: ${body.slice(0, 200)}`)
  }
  const data = await res.json() as { items?: CodexInvoice[] } | CodexInvoice[] | undefined
  console.log(`[receipt] Codex invoices ${accountId}: raw type=${Array.isArray(data) ? 'array' : typeof data}, keys=${data && !Array.isArray(data) ? Object.keys(data).join(',') : '-'}`)
  if (Array.isArray(data)) return data
  if (data && 'items' in data && Array.isArray(data.items)) return data.items
  return []
}

export async function fetchCodexPaymentMethods(token: string, accountId: string): Promise<{ last4?: string }> {
  const res = await fetch(
    `https://chatgpt.com/backend-api/payments/payment_methods?account_id=${accountId}`,
    { headers: codexHeaders(token) }
  )
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    console.error(`[receipt] Codex paymentMethods ${accountId} HTTP ${res.status}:`, body.slice(0, 300))
    return {}
  }
  const data = await res.json() as { payment_methods?: CodexPaymentMethod[] } | undefined
  const methods = data?.payment_methods ?? []
  const def = methods.find(m => m.is_default) ?? methods[0]
  return { last4: def?.last4 }
}

function unixToDateStr(ts: number | undefined): string | null {
  if (typeof ts !== 'number') return null
  return new Date(ts * 1000).toISOString().split('T')[0]
}

function filterByYyyymm(dateStr: string | null, yyyymm: string): boolean {
  if (!dateStr) return false
  return dateStr.startsWith(yyyymm.slice(0, 4) + '-' + yyyymm.slice(4, 6))
}

export async function buildClaudeReceiptRow(
  account: { id: string; name: string; alias: string | null; orgId: string; encryptedCookies: string },
  yyyymm: string
): Promise<ReceiptRow> {
  const base: ReceiptRow = {
    accountId: account.id,
    aiTool: 'claude',
    email: account.name,
    alias: account.alias,
    invoiceDate: null,
    amount: null,
    currency: null,
    status: null,
    last4: null,
    billingInterval: null,
    nextChargeDate: null,
  }

  try {
    const [invoices, subscription] = await Promise.all([
      fetchClaudeInvoices(account.orgId, account.encryptedCookies),
      fetchClaudeSubscription(account.orgId, account.encryptedCookies),
    ])

    const invoice = invoices.find(inv => {
      const d = unixToDateStr(inv.created)
      return filterByYyyymm(d, yyyymm)
    }) ?? invoices[0]

    if (invoice) {
      base.invoiceDate = unixToDateStr(invoice.created)
      base.amount = invoice.total_excluding_tax ?? null
      base.currency = invoice.currency ?? null
      base.status = invoice.status ?? null
      base.last4 =
        invoice.payment_method_details?.card?.last4 ??
        invoice.default_payment_method?.card?.last4 ??
        null
      base.billingInterval = invoice.billing_interval ?? null
    }

    base.nextChargeDate = subscription.next_charge_date ?? null
    if (!base.billingInterval) {
      base.billingInterval = subscription.billing_interval ?? subscription.plan?.billing_interval ?? null
    }
  } catch (e) {
    base.error = e instanceof Error ? e.message : String(e)
  }

  return base
}

export async function buildCodexReceiptRow(
  account: { id: string; name: string; alias: string | null; encryptedToken: string },
  yyyymm: string
): Promise<ReceiptRow> {
  const base: ReceiptRow = {
    accountId: account.id,
    aiTool: 'codex',
    email: account.name,
    alias: account.alias,
    invoiceDate: null,
    amount: null,
    currency: null,
    status: null,
    last4: null,
    billingInterval: null,
    nextChargeDate: null,
  }

  try {
    const token = decrypt(account.encryptedToken)
    const accountId = extractCodexAccountId(token)
    if (!accountId) throw new Error('JWT에서 chatgpt_account_id를 추출할 수 없습니다')

    const [invoices, paymentInfo] = await Promise.all([
      fetchCodexInvoices(token, accountId),
      fetchCodexPaymentMethods(token, accountId),
    ])

    const invoice = invoices.find(inv => {
      const d = unixToDateStr(inv.period_end ?? inv.created)
      return filterByYyyymm(d, yyyymm)
    }) ?? invoices[0]

    if (invoice) {
      base.invoiceDate = unixToDateStr(invoice.period_end ?? invoice.created)
      base.amount = invoice.total_excluding_tax ?? invoice.amount_due ?? null
      base.currency = invoice.currency ?? null
      base.status = invoice.status ?? null
      base.billingInterval = invoice.billing_interval ?? null
      if (invoice.next_payment_attempt) {
        base.nextChargeDate = unixToDateStr(invoice.next_payment_attempt)
      }
    }

    base.last4 = paymentInfo.last4 ?? null

    // email override from JWT if account.name is not email
    const payload = decodeJwtPayload<{ 'https://api.openai.com/profile'?: { email?: string } }>(token)
    const jwtEmail = payload?.['https://api.openai.com/profile']?.email
    if (jwtEmail) base.email = jwtEmail
  } catch (e) {
    base.error = e instanceof Error ? e.message : String(e)
  }

  return base
}
