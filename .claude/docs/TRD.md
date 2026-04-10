# TRD - Technical Requirements Document

> **How**: 어떻게 만드는가

## 작성일
2026-04-10

## 1. 아키텍처 개요

```
[Browser Dashboard: Next.js App Router + Recharts]
         ↓ fetch (Server Components / Client Components)
[Next.js API Routes: /api/**]
         ↓ Prisma ORM
[PostgreSQL: Supabase or Neon]

[Vercel Cron: 0 */5 * * *]
         → POST /api/cron/collect  (CRON_SECRET 검증)
              ↓ 계정별 병렬 fetch
         [claude.ai API: /api/organizations/{orgId}/usage]
              ↓ 응답 파싱
         [usage_logs 저장 → 임계치 판단]
              ↓ 초과/만료 감지
         [Google Chat Webhook POST]
```

## 2. 기술 스택 상세

### Full-Stack (Next.js)
- **Next.js 15** (App Router, Server Components 우선)
- **TypeScript 5+** (strict mode, `any` 금지)
- **Prisma 5+** ORM + PostgreSQL 15+
- **Tailwind CSS** + **shadcn/ui** (대시보드 UI)
- **Recharts** (사용량 추세 차트)

### 스케줄러
- **Vercel Cron Jobs** (`vercel.json` 또는 `vercel.ts`)
- 스케줄: `0 */5 * * *` (5시간마다)
- 보안: `CRON_SECRET` 헤더 검증으로 외부 트리거 차단

### 인프라
- **개발환경**: WSL2 on Windows + Node.js 20+
- **배포**: Vercel (Pro 권장 — Cron 실행 횟수 제한)
- **DB**: Supabase 또는 Neon (PostgreSQL 15+, Free Tier)

## 3. API 설계

### Cron Endpoint
```
POST /api/cron/collect
  Header: x-cron-secret: {CRON_SECRET}
  → 전체 활성 계정 사용량 수집 + DB 저장 + 알람 판단
  Response: { collected: number, errors: string[], alerted: number }
```

### 계정 관리 CRUD
```
GET    /api/accounts              → 계정 목록 (쿠키 마스킹)
POST   /api/accounts              → 계정 추가
PUT    /api/accounts/:id          → 계정 수정 (쿠키 포함)
DELETE /api/accounts/:id          → 계정 삭제
POST   /api/accounts/:id/refresh  → 단일 계정 즉시 수집
```

### 사용량 조회
```
GET /api/usage?accountId=&from=&to=   → 히스토리
GET /api/usage/latest                 → 전체 계정 최신 스냅샷
GET /api/usage/prediction             → 5h/7day 초과 예측 목록
```

### 응답 형식
```ts
// 성공
{ data: T, meta?: { total, page } }

// 에러
{ error: { code: string, message: string } }
```

## 4. 데이터베이스 설계

```prisma
model Account {
  id            String   @id @default(cuid())
  name          String                        // 계정 별칭
  orgId         String   @unique              // claude.ai 기관 ID
  encryptedCookies String                     // AES-256 암호화된 쿠키 JSON
  isActive      Boolean  @default(true)
  lastFetchedAt DateTime?
  lastError     String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  usageLogs     UsageLog[]
}

model UsageLog {
  id              String   @id @default(cuid())
  accountId       String
  account         Account  @relation(fields: [accountId], references: [id], onDelete: Cascade)

  // claude.ai API 응답 원본 (추후 스키마 변경 대응)
  rawResponse     Json

  // 파싱된 핵심 필드
  usedTokens      BigInt?
  totalTokens     BigInt?
  usagePercent    Float?
  expiresAt       DateTime?
  planName        String?

  // 예측값 (수집 시 계산)
  predictExceed5h  Boolean  @default(false)
  predictExceed7d  Boolean  @default(false)

  fetchedAt       DateTime @default(now())

  @@index([accountId, fetchedAt(sort: Desc)])
}

model AlertLog {
  id          String   @id @default(cuid())
  accountId   String
  alertType   String   // "EXPIRY_SOON" | "EXCEED_5H" | "EXCEED_7D" | "FETCH_ERROR"
  message     String
  sentAt      DateTime @default(now())
}
```

## 5. 쿠키 암호화

```ts
// lib/crypto.ts
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const KEY = Buffer.from(process.env.COOKIE_ENCRYPTION_KEY!, 'hex') // 32 bytes

export function encrypt(plaintext: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGORITHM, KEY, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return [iv, authTag, encrypted].map(b => b.toString('hex')).join(':')
}

export function decrypt(ciphertext: string): string {
  const [ivHex, authTagHex, encryptedHex] = ciphertext.split(':')
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')
  const encrypted = Buffer.from(encryptedHex, 'hex')
  const decipher = createDecipheriv(ALGORITHM, KEY, iv)
  decipher.setAuthTag(authTag)
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
}
```

## 6. 사용량 초과 예측 로직

```ts
// 수집 시점마다 계산
function predictExceed(logs: UsageLog[], windowHours: number): boolean {
  if (logs.length < 2) return false

  const recent = logs.slice(0, 12) // 최근 12개 (60h)
  const oldest = recent[recent.length - 1]
  const newest = recent[0]

  const elapsedHours = (newest.fetchedAt - oldest.fetchedAt) / 3_600_000
  if (elapsedHours === 0) return false

  const tokenPerHour = (newest.usedTokens - oldest.usedTokens) / elapsedHours
  const remaining = newest.totalTokens - newest.usedTokens
  const hoursUntilExceed = remaining / tokenPerHour

  return hoursUntilExceed < windowHours
}
```

## 7. Google Chat 알람 발송

```ts
// lib/alert.ts
export async function sendGoogleChatAlert(message: string) {
  const webhookUrl = process.env.GOOGLE_CHAT_WEBHOOK_URL!
  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: message }),
  })
}

// 알람 메시지 예시
// ⚠️ [share02] 만료 3일 전 (2026-04-13)
// 🔴 [share02] 현재 속도로 5시간 내 쿼터 초과 예상
// ❌ [share03] API 조회 실패 — 쿠키 만료 가능성
```

## 8. 브라우저 콘솔 쿠키 추출 스크립트

```js
// scripts/extract-cookies.js (브라우저 콘솔에서 실행)
// claude.ai에 로그인된 상태에서 실행
(function() {
  const needed = ['sessionKey', 'anthropic-device-id', 'lastActiveOrg', 'activitySessionId']
  const result = {}
  document.cookie.split(';').forEach(c => {
    const [k, v] = c.trim().split('=')
    if (needed.includes(k)) result[k] = v
  })
  console.log('=== 복사하여 대시보드에 붙여넣기 ===')
  console.log(JSON.stringify(result, null, 2))
  copy(JSON.stringify(result))
  console.log('클립보드에 복사 완료!')
})()
```

## 9. 환경변수

```env
# .env.local (개발) / Vercel 환경변수 (운영)

DATABASE_URL=postgresql://...         # Supabase/Neon 연결 문자열
COOKIE_ENCRYPTION_KEY=               # 64자 hex (openssl rand -hex 32)
GOOGLE_CHAT_WEBHOOK_URL=             # Google Chat Webhook URL
CRON_SECRET=                         # Cron 인증 시크릿 (openssl rand -hex 16)
```

## 10. 성능 요구사항

- 전체 계정(20개) 수집 완료: **5분 이내** (병렬 fetch, Promise.allSettled)
- 대시보드 초기 로딩: **2초 이내** (Server Components + ISR)
- API 응답: **500ms 이내**

## 11. 보안 요구사항

- HTTPS 강제 (Vercel 기본 제공)
- Cron endpoint: `x-cron-secret` 헤더 검증
- 쿠키 평문 저장 금지 (AES-256-GCM 암호화)
- DB 연결 문자열 환경변수 처리
- 계정 목록 조회 시 쿠키 필드 마스킹 (`***`)

## 12. 외부 연동

| 서비스 | 용도 | 인증 방식 |
|--------|------|-----------|
| claude.ai | 사용량 API 조회 | 세션 쿠키 |
| Google Chat | 알람 발송 | Webhook URL |
| Supabase/Neon | PostgreSQL DB | Connection String |
| Vercel | 호스팅 + Cron | 자동 (플랫폼) |
