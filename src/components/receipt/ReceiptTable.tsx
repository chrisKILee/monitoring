'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface ReceiptRow {
  id: string
  invoiceNumber: string
  receiptNumber: string
  aiTool: 'claude' | 'codex'
  email: string
  alias: string | null
  accountName: string | null
  invoiceDate: string
  amountExclTax: number
  currency: string
  status: string
  last4: string | null
  description: string | null
  periodStart: string | null
  periodEnd: string | null
  nextChargeDate: string | null
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

function formatAmount(amount: number, currency: string): string {
  const cur = currency.toUpperCase()
  try {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: cur,
      maximumFractionDigits: cur === 'KRW' || cur === 'JPY' ? 0 : 2,
    }).format(amount)
  } catch {
    return `${amount.toLocaleString()} ${cur}`
  }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-'
  try {
    return new Date(dateStr).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  } catch {
    return dateStr
  }
}

function StatusBadge({ status }: { status: string }) {
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
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
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

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    setUploadResult(null)

    const results: string[] = []
    for (const file of Array.from(files)) {
      const fd = new FormData()
      fd.append('file', file)
      try {
        const res = await fetch('/api/receipt/upload', { method: 'POST', body: fd })
        const body = await res.json() as { error?: string; receipt?: { invoiceNumber: string }; accountLinked?: boolean }
        if (!res.ok) {
          results.push(`${file.name}: ❌ ${body.error ?? 'HTTP ' + res.status}`)
        } else {
          const linked = body.accountLinked ? ' (계정 연결됨)' : ''
          results.push(`${file.name}: ✅ ${body.receipt?.invoiceNumber}${linked}`)
        }
      } catch (err) {
        results.push(`${file.name}: ❌ ${err instanceof Error ? err.message : String(err)}`)
      }
    }

    setUploadResult(results.join('\n'))
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
    fetchData(yyyymm)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">청구서</h1>
          <p className="text-sm text-muted-foreground">Claude · Codex 계정 월별 청구 내역</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={yyyymm}
            onChange={e => setYyyymm(e.target.value)}
            className="border rounded px-3 py-1.5 text-sm bg-background text-foreground"
          >
            {monthOptions.map(opt => (
              <option key={opt} value={opt}>{formatYyyymm(opt)}</option>
            ))}
          </select>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {uploading ? '업로드 중...' : 'PDF 업로드'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </div>

      {uploadResult && (
        <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm whitespace-pre-line">
          {uploadResult}
        </div>
      )}

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
              <th className="text-left p-3 font-medium">플랜</th>
              <th className="text-left p-3 font-medium">결제일</th>
              <th className="text-right p-3 font-medium">결제금액</th>
              <th className="text-left p-3 font-medium">상태</th>
              <th className="text-left p-3 font-medium">결제카드</th>
              <th className="text-left p-3 font-medium">청구기간</th>
              <th className="text-left p-3 font-medium">다음결제일</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={9} className="p-8 text-center text-muted-foreground">
                  조회 중...
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && !error && (
              <tr>
                <td colSpan={9} className="p-8 text-center text-muted-foreground">
                  {formatYyyymm(yyyymm)} 청구 내역이 없습니다.
                  <span className="block mt-1 text-xs">PDF를 업로드하면 자동으로 파싱됩니다.</span>
                </td>
              </tr>
            )}
            {!loading && rows.map(row => (
              <tr key={row.id} className="border-t hover:bg-muted/10">
                <td className="p-3">
                  <ToolBadge tool={row.aiTool} />
                </td>
                <td className="p-3">
                  <p className="font-medium">{row.alias ?? row.accountName ?? row.email}</p>
                  {(row.alias || row.accountName) && (
                    <p className="text-xs text-muted-foreground">{row.email}</p>
                  )}
                </td>
                <td className="p-3 text-muted-foreground text-xs max-w-[160px] truncate" title={row.description ?? undefined}>
                  {row.description ?? '-'}
                </td>
                <td className="p-3 text-muted-foreground">{formatDate(row.invoiceDate)}</td>
                <td className="p-3 text-right font-mono">
                  {formatAmount(row.amountExclTax, row.currency)}
                </td>
                <td className="p-3"><StatusBadge status={row.status} /></td>
                <td className="p-3 text-muted-foreground">
                  {row.last4 ? `**** ${row.last4}` : '-'}
                </td>
                <td className="p-3 text-muted-foreground text-xs">
                  {row.periodStart && row.periodEnd
                    ? `${formatDate(row.periodStart)} ~ ${formatDate(row.periodEnd)}`
                    : '-'}
                </td>
                <td className="p-3 text-muted-foreground">{formatDate(row.nextChargeDate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!loading && rows.length > 0 && (
        <p className="text-xs text-muted-foreground text-right">
          총 {rows.length}건
        </p>
      )}
    </div>
  )
}
