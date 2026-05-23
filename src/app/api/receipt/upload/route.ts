import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getPermissions } from '@/lib/auth-utils'
import { parsePdfReceipt } from '@/lib/pdf-receipt-parser'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: '인증 필요' }, { status: 401 })
  }

  if (session.user.role !== 'admin') {
    const perms = await getPermissions(session.user.id)
    if (!perms?.receiptRead) {
      return NextResponse.json({ error: '권한 없음' }, { status: 403 })
    }
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: '파일 파싱 실패' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: '파일이 없습니다' }, { status: 400 })
  if (!file.name.toLowerCase().endsWith('.pdf')) {
    return NextResponse.json({ error: 'PDF 파일만 업로드 가능합니다' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  let parsed
  try {
    parsed = await parsePdfReceipt(buffer)
  } catch (e) {
    return NextResponse.json(
      { error: `PDF 파싱 실패: ${e instanceof Error ? e.message : String(e)}` },
      { status: 422 }
    )
  }

  // 이메일로 계정 자동 매핑
  const account = await prisma.account.findFirst({
    where: { name: parsed.email, isActive: true },
    select: { id: true },
  })

  const receipt = await prisma.receipt.upsert({
    where: { invoiceNumber: parsed.invoiceNumber },
    create: {
      invoiceNumber: parsed.invoiceNumber,
      receiptNumber: parsed.receiptNumber,
      aiTool: parsed.aiTool,
      accountId: account?.id ?? null,
      email: parsed.email,
      invoiceDate: parsed.invoiceDate,
      amountExclTax: parsed.amountExclTax,
      currency: parsed.currency,
      status: parsed.status,
      last4: parsed.last4,
      description: parsed.description,
      periodStart: parsed.periodStart,
      periodEnd: parsed.periodEnd,
      nextChargeDate: parsed.nextChargeDate,
    },
    update: {
      receiptNumber: parsed.receiptNumber,
      aiTool: parsed.aiTool,
      accountId: account?.id ?? null,
      email: parsed.email,
      invoiceDate: parsed.invoiceDate,
      amountExclTax: parsed.amountExclTax,
      currency: parsed.currency,
      status: parsed.status,
      last4: parsed.last4,
      description: parsed.description,
      periodStart: parsed.periodStart,
      periodEnd: parsed.periodEnd,
      nextChargeDate: parsed.nextChargeDate,
    },
  })

  return NextResponse.json({ receipt, accountLinked: !!account })
}
