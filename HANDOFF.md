# 작업 인계 문서
> 생성: 2026-05-21
> 브랜치: main
> 마지막 커밋: 6b71c38 - feat: Receipt(청구서) 메뉴 추가

## 새 세션 시작 방법
```
HANDOFF.md 읽고 남은 작업 이어서 해줘.
```

## 완료된 작업
- [x] **AccountCard 표시명+별칭 동시 표시** (커밋: 9b2d071)
- [x] **대시보드 3열 그리드 + Sync 버튼 + 계정 별칭/순서 관리** (커밋: ccbc537)
- [x] **커스텀 도메인** monitoring.chrisnolja.dev 연결 완료
- [x] ERR_TOO_MANY_REDIRECTS 해결 (커밋: f8e7c32)
- [x] Bitbucket → GitHub 마이그레이션, Vercel 재연결
- [x] Auth.js session callback 누락 버그 수정 (커밋: 5acd846)
- [x] 기존 JWT 토큰 role 백필 (커밋: 6ff3904)
- [x] **MemberServiceAccount junction 모델 도입** (커밋: 7ecaa4b)
- [x] **계정 추가 버그 수정** (커밋: b8a7d27)
- [x] **대시보드 AccountCard 멤버 아코디언** (커밋: c0ddc91, 3a71508)
- [x] **AccountCard Hydration Mismatch(#418) 해결** (커밋: 4d4599f)
- [x] **멤버 0명 계정 텍스트 표시** (커밋: f7f9a7f)
- [x] **ServiceAccount.accountId 매핑 11건 DB UPDATE** — 18개 활성 계정 모두 멤버 연결 완료
- [x] **멤버 서비스계정 변경(이동) UI 기능** (커밋: 132e315)
- [x] **사용자관리 부서명 필드 추가** — Prisma schema + db push + 55명 일괄 UPDATE + UI (커밋: cfa84b5)
- [x] **DB 기반 글로벌 테마 시스템** (커밋: a7656d3)
  - `Setting` 테이블, `layout.tsx` 서버사이드 적용, `/themes` admin 페이지
- [x] **테마 팔레트 개선** (커밋: c7aacec) — oklch → hex 검증 팔레트
- [x] **Linear·Stripe 공식 팔레트 적용** (커밋: 0ecb0d2) — getdesign.md CLI 활용
- [x] **대시보드 멤버 이름·부서 표시** (커밋: 6636ea2) — Apps Script 재조회 + 수동 SQL UPDATE
- [x] **Codex 모니터링 추가** — encryptedToken, JWT Bearer 인증, wham/usage API, 대시보드 통합
- [x] **Claude/Codex 도구 뱃지** (커밋: c53eb44) — 테마별 CSS custom property 사용
- [x] **권한 시스템 단순화** (커밋: ea64a86) — 사용자관리 권한 제거, receiptRead 추가
- [x] **Receipt(청구서) 메뉴** (커밋: 6b71c38) — YYYYMM 선택 + Claude/Codex 인보이스 조회 테이블

## 진행 중인 작업
없음

## 남은 작업 (우선순위 순)
1. **[보통]** Receipt 실제 API 응답 검증 — Claude/Codex 외부 API 응답 구조가 추정 기반이라 실제 확인 필요
2. **[보통]** 부서명 없는 멤버 수동 입력 — Terroir·SeahWorks·Vinification 등 타 서비스 사용자 (~20명)
3. **[나중에]** cron-job.org 엔드포인트 URL이 `monitoring.chrisnolja.dev` 기준인지 확인
4. **[나중에]** cron 만료 알림 테스트 — Jest 4건 기존 실패 (prisma mock 이슈)
5. **[나중에]** 멤버 정렬 옵션 검토 — 현재 가나다순, 입력순/추가일순 필요 여부
6. **[나중에]** 드래그앤드롭 순서 변경 (계정 관리, 현재 ▲▼ 버튼 방식)

## 현재 작업 중인 파일
- `HANDOFF.md` — 이 파일 (unstaged)

## 핵심 기술 결정사항

### Receipt(청구서) 메뉴 설계
- **Claude**: `orgId` + `encryptedCookies` → `stripe/{orgId}/invoices` + `organizations/{orgId}/subscription_details`
- **Codex**: `encryptedToken` → JWT payload에서 `https://api.openai.com/auth.chatgpt_account_id` 추출 → `invoices?account_id=` + `payment_methods?account_id=`
- `src/lib/receipt-api.ts`: 외부 API fetch 유틸 (응답 구조 추정 기반 — 실제 API 응답 보고 조정 필요)
- `/api/receipt?yyyymm=202501`: 모든 활성 계정 병렬 조회, 에러 계정은 error 필드로 표시
- **권한**: `UserPermission.receiptRead` — admin은 항상 접근, 일반 user는 체크박스 on 필요
- **주의**: `total_excluding_tax`는 센트 단위 (USD 기준 /100) — KRW/JPY는 그대로

### DB 기반 글로벌 테마 (신규 결정)
- **방식**: localStorage(개인) 대신 DB `Setting` 테이블 → 관리자 변경 시 전체 사용자 동시 반영
- `layout.tsx`(async 서버 컴포넌트)가 매 요청마다 `getCurrentTheme()` → `<html data-theme="...">` 서버 렌더링
- admin만 `/themes` 접근 가능, `POST /api/settings/theme` API
- **테마 4종**: `linear`(기본), `stripe`, `nord`, `light-clean`
- `ThemeId` 변경 시 → `src/lib/theme.ts`, `src/app/globals.css` 두 파일 동기화 필요

### getdesign.md 팔레트 추출 방법
- `npx getdesign@latest add <name>` → 프로젝트 루트에 `DESIGN.md` 생성 (작업 후 삭제할 것)
- oklch 추상값보다 hex 값이 훨씬 예측 가능 — 테마 작업은 항상 hex 사용 권장
- **주의**: 같은 디렉토리에서 두 번 실행하면 덮어씌워짐, /tmp에서 실행 권장

### AccountCard Hydration Mismatch 패턴 (재발 방지)
- `'use client'` 컴포넌트 내에서 `Date.now()` / `toLocaleString('ko-KR')` 직접 호출 → React #418
- 해결: `useNow(): number | null` 훅 (마운트 후 setNow, 60s interval)

### 멤버 서비스계정 변경 설계
- `PATCH /api/members/[id]/accounts/[linkId]`에 `serviceAccountId` 추가 처리 (in-place update)
- DELETE + POST 방식 대신 단일 PATCH (atomic, startDate/endDate 보존)

### Member.department 설계
- `String?` optional — 스프레드시트에 없는 사용자(Terroir, SeahWorks 등)는 null 유지

### DB 직접 접근 방법
- DB: Neon PostgreSQL (`.env.local`의 `DATABASE_URL`)
- `node -e "..."` + `require('pg')` — Prisma 7.7.0+는 ad-hoc 스크립트에 `pg` 직접 권장
- 테이블명: `"Member"` (대소문자 주의), `service_account`, `member_service_account`, `setting`

### Auth.js session callback 필수
- custom 필드(role, userId)는 `session` callback에서 명시 매핑 필수

### MemberServiceAccount junction 모델 이유
- 한 사람이 Claude + Codex 함께 사용할 때 종료일이 계정마다 다를 수 있음
- `@@unique([memberId, serviceAccountId])` — 동일 멤버-계정 중복 방지

### 계정 추가 버그 원인 (과거 교훈)
- `fetch` 응답 코드를 체크하지 않아 API 500 오류가 나도 UI는 성공처럼 동작
- 수정: `res.ok` 체크 → 실패 시 `alert()`, API에 Prisma 오류코드 구분 응답 추가

## 알려진 문제 / 주의사항
- **테마 전환 후 구 DB 값(`vercel-dark`, `claude-purple`) 잔존 가능** → `getCurrentTheme()`에 유효성 검사 추가됨 (invalid 시 `linear` fallback)
- **`cron 만료 알림` 미검증**: `MemberServiceAccount.endDate` 기준 재작성했지만 실제 만료 데이터로 검증 안 됨
- **`부서명 없는 멤버 ~20명`**: Terroir, SeahWorks, Vinification, Elevage 등
- **Server Component → Client prop**: Prisma `Date` 객체가 `as unknown as AccountLatest[]`로 캐스팅됨
- **Cloudflare Proxy**: DNS only(회색) 유지 필수 — Vercel SSL 충돌 방지
- **`.env` gitignore**: Vercel 환경변수로 관리

## 환경 / DB 상태
| 서비스 | URL | 상태 |
|--------|-----|------|
| 프론트엔드 (Vercel) | https://monitoring.chrisnolja.dev | 배포 완료 (0ecb0d2) |
| DB | Neon PostgreSQL (`.env.local`) | ✅ 연결됨 |
| DB 마이그레이션 | `Setting` 테이블 추가 | ✅ db push 완료 |
| 테마 (DB) | `setting` 테이블 `key=theme` | 기존값 있으면 fallback 처리됨 |
| cron 수집 | cron-job.org → /api/cron | 확인 필요 |

## 관련 문서
- 스키마: `prisma/schema.prisma`
- 스펙: `.claude/docs/SPEC-dashboard-members.md`
- 작업일지: `/mnt/c/Users/CHRIS LEE/Documents/chris-obsidian/Projects/monitoring/작업일지/`
- 주요 파일:
  - `src/app/globals.css` — 4개 테마 CSS 변수 (`[data-theme="linear"]` 등)
  - `src/lib/theme.ts` — `ThemeId`, `THEMES` 상수, `getCurrentTheme()`
  - `src/app/themes/page.tsx` — admin 전용 테마 선택 페이지
  - `src/components/themes/ThemeSelector.tsx` — 미니 프리뷰 + 클릭 적용
  - `src/app/api/settings/theme/route.ts` — 테마 변경 API
  - `src/components/dashboard/AccountCard.tsx` — 대시보드 카드 (멤버 아코디언, useNow 훅)
  - `src/components/members/MembersTable.tsx` — 사용자관리 (서비스계정 변경, 부서명 편집)
  - `src/app/api/members/[id]/accounts/[linkId]/route.ts` — 링크 날짜/SA 수정
  - `src/app/api/members/[id]/route.ts` — 멤버 수정 (department 포함)
  - `src/lib/member-utils.ts` — `dedupeMemberNames()` 순수 함수
  - `src/app/api/cron/member-expiry/route.ts` — 만료 알림 cron
  - `src/auth.config.ts` — edge proxy 인증 (session callback 포함)
  - `src/auth.ts` — full auth (jwt callback, role 백필)
