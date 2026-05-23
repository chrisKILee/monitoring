'use client'

import { useState, useEffect, useCallback } from 'react'
import { Badge } from '@/components/ui/badge'

interface ReceiptRow {
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

function currentYyyymm(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  return `${y}${m}`
}

function buildMonthOptions(): string[] {
  const options: string[] = []
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    options.push(`${y}${m}`)
  }
  return options
}

function formatYyyymm(yyyymm: string): string {
  return `${yyyymm.slice(0, 4)}년 ${yyyymm.slice(4, 6)}월`
}

function formatAmount(amount: number | null, currency: string | null): string {
  if (amount === null) return '-'
  const cur = (currency ?? 'usd').toUpperCase()
  // Stripe amounts are in the smallest currency unit (cents for USD)
  const divisor = cur === 'KRW' || cur === 'JPY' ? 1 : 100
  const value = amount / divisor
  try {
    return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(value)
  } catch {
    return `${value.toLocaleString()} ${cur}`
  }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-'
  try {
    return new Date(dateStr).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
  } catch {
    return dateStr
  }
}

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-muted-foreground text-xs">-</span>
  const variants: Record<string, string> = {
    paid: 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400',
    open: 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400',
    void: 'bg-gray-100 text-gray-600 border-gray-300',
    uncollectible: 'bg-red-100 text-red-700 border-red-300',
  }
  const cls = variants[status] ?? 'bg-muted text-muted-foreground border-border'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${cls}`}>
      {status}
    </span>
  )
}

function ToolBadge({ tool }: { tool: 'claude' | 'codex' }) {
  const cssVar = tool === 'codex' ? 'var(--badge-codex)' : 'var(--badge-claude)'
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border"
      style={{
        background: `color-mix(in srgb, ${cssVar} 14%, transparent)`,
        color: cssVar,
        borderColor: `color-mix(in srgb, ${cssVar} 35%, transparent)`,
      }}
    >
      {tool === 'codex' ? 'Codex' : 'Claude'}
    </span>
  )
}

export function ReceiptTable() {
  const [yyyymm, setYyyymm] = useState(currentYyyymm)
  const [rows, setRows] = useState<ReceiptRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const monthOptions = buildMonthOptions()

  const fetchData = useCallback(async (ym: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/receipt?yyyymm=${ym}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` })) as { error?: string }
        throw new Error(body.error ?? `HTTP ${res.status}`)
      }
      const data = await res.json() as { rows: ReceiptRow[] }
      setRows(data.rows)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData(yyyymm) }, [yyyymm, fetchData])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">청구서</h1>
          <p className="text-sm text-muted-foreground">Claude · Codex 계정 월별 청구 내역</p>
        </div>
        <select
          value={yyyymm}
          onChange={e => setYyyymm(e.target.value)}
          className="border rounded px-3 py-1.5 text-sm bg-background text-foreground"
        >
          {monthOptions.map(opt => (
            <option key={opt} value={opt}>{formatYyyymm(opt)}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="rounded-lg border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3 font-medium">도구</th>
              <th className="text-left p-3 font-medium">계정</th>
              <th className="text-left p-3 font-medium">결제일</th>
              <th className="text-right p-3 font-medium">결제금액</th>
              <th className="text-left p-3 font-medium">상태</th>
              <th className="text-left p-3 font-medium">결제카드</th>
              <th className="text-left p-3 font-medium">빌링구분</th>
              <th className="text-left p-3 font-medium">다음결제일</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={8} className="p-8 text-center text-muted-foreground">
                  조회 중...
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && !error && (
              <tr>
                <td colSpan={8} className="p-8 text-center text-muted-foreground">
                  {formatYyyymm(yyyymm)} 청구 내역이 없습니다.
                </td>
              </tr>
            )}
            {!loading && rows.map(row => (
              <tr key={row.accountId} className={`border-t hover:bg-muted/10 ${row.error ? 'opacity-60' : ''}`}>
                <td className="p-3">
                  <ToolBadge tool={row.aiTool} />
                </td>
                <td className="p-3">
                  <div>
                    <p className="font-medium">{row.alias ?? row.email}</p>
                    {row.alias && <p className="text-xs text-muted-foreground">{row.email}</p>}
                    {row.error && (
                      <p className="text-xs text-red-500 mt-0.5" title={row.error}>
                        오류: {row.error.slice(0, 40)}{row.error.length > 40 ? '…' : ''}
                      </p>
                    )}
                  </div>
                </td>
                <td className="p-3 text-muted-foreground">{formatDate(row.invoiceDate)}</td>
                <td className="p-3 text-right font-mono">
                  {formatAmount(row.amount, row.currency)}
                </td>
                <td className="p-3"><StatusBadge status={row.status} /></td>
                <td className="p-3 text-muted-foreground">
                  {row.last4 ? `**** ${row.last4}` : '-'}
                </td>
                <td className="p-3 text-muted-foreground">
                  {row.billingInterval === 'month' ? '월간' : row.billingInterval === 'year' ? '연간' : (row.billingInterval ?? '-')}
                </td>
                <td className="p-3 text-muted-foreground">{formatDate(row.nextChargeDate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!loading && rows.length > 0 && (
        <p className="text-xs text-muted-foreground text-right">
          총 {rows.length}개 계정 · {rows.filter(r => !r.error).length}개 조회 성공
        </p>
      )}
    </div>
  )
}
