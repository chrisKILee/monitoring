# ADR - Architecture Decision Records

> **Reason**: 왜 이 기술/구조를 선택했는가

---

## ADR-001: Next.js App Router 단일 레포 선택

**날짜**: 2026-04-10
**상태**: 승인됨

### 컨텍스트
백엔드(API) + 프론트엔드(대시보드)를 어떻게 구성할지 결정이 필요했다.
후보: NestJS + React 분리 레포 vs Next.js App Router 단일 레포

### 결정
Next.js 15 App Router 단일 레포를 선택한다.

### 이유
- **Vercel 최적화**: 단일 레포를 Vercel에 바로 배포, 별도 서버 설정 불필요
- **Vercel Cron 통합**: `vercel.json`에서 API Route를 Cron으로 연결, 인프라 추가 없음
- **Server Components**: 대시보드를 서버에서 렌더링하여 DB 직접 조회 가능
- **개발 속도**: 1주일 이내 배포 목표 — 단일 레포가 훨씬 빠름
- **운영 단순성**: 개인 프로젝트에서 NestJS 오버헤드는 불필요

### 결과
- 장점: 빠른 개발, Vercel 네이티브, 인프라 최소화
- 단점: 규모 확장 시 백엔드 분리가 필요할 수 있음 (현재 불필요)

---

## ADR-002: Prisma ORM 선택

**날짜**: 2026-04-10
**상태**: 승인됨

### 컨텍스트
PostgreSQL 접근을 위한 ORM/쿼리 빌더 선택이 필요했다.
후보: Prisma vs Drizzle vs raw SQL

### 결정
Prisma 5+를 사용한다.

### 이유
- **TypeScript 타입 자동 생성**: 스키마에서 타입이 자동 생성되어 `any` 없이 안전한 쿼리
- **마이그레이션 관리**: `prisma migrate dev`로 스키마 변경 이력 관리
- **Supabase/Neon 호환**: 외부 PostgreSQL과 연결 문자열만으로 즉시 사용 가능
- **TDD 친화적**: Prisma Client 모킹(`jest-mock-extended`)으로 단위 테스트 격리 용이

### 결과
- 장점: 타입 안전성, 마이그레이션 자동화, 풍부한 문서
- 단점: 복잡한 집계 쿼리 시 raw SQL 병행 필요할 수 있음

---

## ADR-003: Supabase / Neon PostgreSQL 선택

**날짜**: 2026-04-10
**상태**: 승인됨

### 컨텍스트
외부 PostgreSQL 호스팅 서비스 선택이 필요했다.
후보: Supabase vs Neon vs Railway vs PlanetScale(MySQL)

### 결정
Supabase 또는 Neon을 선택한다 (둘 다 Free Tier로 시작, 연결 문자열만 교체로 전환 가능).

### 이유
- **Vercel 연동**: Vercel Marketplace에서 Neon 통합 지원, 환경변수 자동 주입
- **Free Tier**: 소규모 개인 프로젝트로 Free Tier로 충분
- **서버리스 친화**: Neon의 연결 풀링이 Vercel Functions 재사용 패턴과 잘 맞음
- **PostgreSQL 표준**: Prisma와 완전 호환

### 결과
- 장점: 무료 시작, 관리형 서비스로 운영 부담 없음
- 단점: Free Tier 제한 (스토리지, 연결 수) — 현재 규모에서 충분

---

## ADR-004: Vercel Cron Jobs 선택

**날짜**: 2026-04-10
**상태**: 승인됨

### 컨텍스트
5시간 주기 자동 수집 스케줄러가 필요했다.
후보: Vercel Cron vs GitHub Actions scheduled vs 별도 cron 서버 vs WSL2 로컬 cron

### 결정
Vercel Cron Jobs를 사용한다. (`0 */5 * * *`)

### 이유
- **인프라 추가 없음**: Vercel 프로젝트 내에서 설정, 별도 서버 불필요
- **신뢰성**: Vercel 플랫폼이 실행 보장
- **보안**: `CRON_SECRET` 헤더로 외부 트리거 차단 가능
- **로그**: Vercel 대시보드에서 Cron 실행 로그 확인 가능

### 결과
- 장점: 단순 설정, 별도 인프라 없음
- 단점: Vercel Free Tier는 Cron 제한 있음 (Pro 플랜 권장, $20/월)

---

## ADR-005: AES-256-GCM 쿠키 암호화 선택

**날짜**: 2026-04-10
**상태**: 승인됨

### 컨텍스트
claude.ai 세션 쿠키를 DB에 저장해야 하는데, 평문 저장은 보안 위험이 있다.
후보: 평문 저장 vs AES-256-GCM vs 외부 KMS (AWS KMS 등)

### 결정
Node.js 내장 `crypto` 모듈로 AES-256-GCM 암호화를 사용한다.

### 이유
- **개인 프로젝트 적합**: 외부 KMS는 비용/복잡도 과다
- **검증된 알고리즘**: AES-256-GCM은 인증된 암호화(AEAD)로 변조 감지 포함
- **의존성 없음**: Node.js 내장 `crypto`로 추가 패키지 불필요
- **키 관리**: `COOKIE_ENCRYPTION_KEY` 환경변수 → Vercel 환경변수에 안전 저장

### 결과
- 장점: 구현 단순, 외부 의존성 없음, 강력한 암호화
- 단점: 키 교체 시 전체 재암호화 필요 (키 버전 관리 미포함 — 현재 불필요)

---

## ADR-006: shadcn/ui + Tailwind CSS 선택

**날짜**: 2026-04-10
**상태**: 승인됨

### 컨텍스트
대시보드 UI 라이브러리 선택이 필요했다.
후보: shadcn/ui vs MUI vs Ant Design vs 순수 Tailwind

### 결정
shadcn/ui + Tailwind CSS를 사용한다.

### 이유
- **Next.js 15 최적화**: Server Components와 완벽 호환, 불필요한 클라이언트 번들 없음
- **소유권**: 컴포넌트를 직접 프로젝트에 복사, 커스터마이징 자유
- **Vercel 권장**: Vercel 공식 예제에서 shadcn/ui 사용
- **개발 속도**: 완성도 높은 컴포넌트로 빠른 UI 구성

### 결과
- 장점: 번들 사이즈 최소화, 높은 커스터마이징 자유도
- 단점: MUI 대비 컴포넌트 수 적음 (대시보드에는 충분)

---

## ADR-007: Recharts 선택 (사용량 추세 차트)

**날짜**: 2026-04-10
**상태**: 승인됨

### 컨텍스트
시계열 사용량 차트 라이브러리가 필요했다.
후보: Recharts vs Chart.js vs Victory vs Tremor

### 결정
Recharts를 사용한다.

### 이유
- **React 네이티브**: React 컴포넌트 기반으로 상태 연동 자연스러움
- **shadcn/ui 호환**: shadcn/ui의 Chart 컴포넌트가 Recharts 기반
- **TypeScript 지원**: 타입 정의 완성도 높음
- **가볍고 충분**: 시계열 라인 차트 + 바 차트로 요구사항 충분

### 결과
- 장점: 설정 단순, shadcn/ui 통합 용이
- 단점: D3 대비 커스터마이징 한계 있음 (현재 불필요)

---

## ADR-008: TDD (테스트 주도 개발) 필수 채택

**날짜**: 2026-04-10
**상태**: 승인됨

### 컨텍스트
모니터링 시스템의 예측 로직, 암호화, API 파싱은 버그 발생 시 알람 누락 또는 보안 문제로 직결된다.

### 결정
모든 비즈니스 로직은 TDD(Red → Green → Refactor) 사이클로 개발한다.

### 이유
- **예측 로직 정확성**: 5h/7day 초과 예측 버그는 알람 누락으로 직결
- **암호화 신뢰성**: 암호화/복호화 쌍 테스트로 데이터 손실 방지
- **API 파싱 안정성**: claude.ai API 응답 스키마 변경에 빠르게 대응
- **회귀 방지**: 향후 로직 수정 시 기존 동작 보장

### 결과
- 장점: 핵심 로직 신뢰성 확보, 리팩토링 안전망
- 단점: 초기 개발 시간 소폭 증가 (장기적으로 디버깅 시간 절감)
