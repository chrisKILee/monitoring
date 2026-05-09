# 작업 인계 문서
> 생성: 2026-05-06
> 브랜치: main
> 마지막 커밋: 9b2d071 - [feat] 카드 헤더에 표시명+별칭 동시 표시

## 새 세션 시작 방법
```
HANDOFF.md 읽고 "claude-usage-monitor 대시보드 개선" 이어서 작업해줘.
```

---

## 완료된 작업

- [x] **AccountCard 표시명+별칭 동시 표시** (커밋: 9b2d071)
  - 기존: `alias || name` 중 하나만 표시
  - 변경: `name` 제목(굵게) + `alias` 부제목(작은 회색 텍스트) 동시 표시
  - alias 없는 계정은 이름만 표시 (조건부 렌더링)
  - Vercel 자동 배포 완료 → monitoring.chrisnolja.dev

- [x] **대시보드 3열 그리드 + Sync 버튼 + 계정 별칭/순서 관리** (커밋: ccbc537)
- [x] **5h/7d 세그먼트 시각화 + 48h 꺾은선 차트** (커밋: 5018c6c, 076349b)
- [x] **커스텀 도메인** monitoring.chrisnolja.dev 연결 완료

---

## 진행 중인 작업

없음

---

## 남은 작업 (우선순위 순)

1. **[보통]** cron-job.org 엔드포인트 URL을 `monitoring.chrisnolja.dev`로 변경 (현재 vercel.app URL 사용 중일 수 있음)
2. **[나중에]** 드래그앤드롭 순서 변경 — 현재 ▲▼ 버튼 방식 (`@dnd-kit/core` 고려)
3. **[나중에]** 전체 계정 일괄 Sync 버튼 (대시보드 상단)
4. **[나중에]** 계정 비활성화(isActive) 토글 UI

---

## 현재 작업 중인 파일

- `src/components/dashboard/AccountCard.tsx` — name 제목 + alias 부제목 구조로 변경 완료

---

## 핵심 기술 결정사항

### AccountCard 이름 표시 구조
- `displayName = alias || name` 단일 표시 방식 폐기
- `<div className="min-w-0">` 래퍼 안에 CardTitle(name) + 조건부 p(alias) 구조
- alias가 있을 때만 부제목 렌더링 (`{account.alias && <p>...}`)

### 계정 등록 방식 (토큰 충돌 주의)
- 토큰 발급~입력 사이에 다른 토큰 발급 시 등록 실패 + 30분 대기
- 한 명씩 순차 진행 필수

---

## 알려진 문제 / 주의사항

- **push 전 필수**: `gh pr list --head $(git branch --show-current) --state all` 확인
- **로컬 DB psql alias**: `psql` 입력 시 운영 DB 연결됨 (itinfosec 프로젝트 해당)
- Cloudflare Proxy는 **DNS only(회색)** 유지 (Vercel SSL 충돌 방지)
- `.env` 파일은 gitignore — Vercel 환경변수로 관리

---

## 환경 / 서비스 상태

| 서비스 | URL | 상태 |
|--------|-----|------|
| 프론트엔드 (Vercel) | https://monitoring.chrisnolja.dev | ✅ 정상 |
| DB (Prisma/PostgreSQL) | Vercel 환경변수로 연결 | ✅ 연결됨 |
| cron 수집 | cron-job.org → /api/cron | 확인 필요 |

---

## 관련 문서

- 주요 파일:
  - `src/components/dashboard/AccountCard.tsx` — 카드 UI (표시명+별칭)
  - `src/app/accounts/page.tsx` — 계정 관리 (순서 변경, Sync)
  - `src/components/accounts/AccountForm.tsx` — alias 입력 필드
  - `src/app/api/accounts/[id]/sync/route.ts` — 단일 계정 즉시 수집
  - `src/app/api/accounts/reorder/route.ts` — 순서 일괄 업데이트
  - `prisma/schema.prisma` — Account: alias, sortOrder 필드 포함
