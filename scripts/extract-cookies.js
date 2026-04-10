/**
 * Claude.ai 세션 쿠키 추출 스크립트
 *
 * 사용법:
 *   1. claude.ai에 로그인된 상태에서 F12 → Console 탭 열기
 *   2. 아래 코드를 전체 복사하여 Console에 붙여넣기
 *   3. Enter 후 출력된 JSON을 대시보드 계정 추가/수정 폼에 붙여넣기
 */
(function () {
  const needed = [
    'sessionKey',
    'anthropic-device-id',
    'lastActiveOrg',
    'activitySessionId',
  ]
  const result = {}

  document.cookie.split(';').forEach((c) => {
    const [k, ...v] = c.trim().split('=')
    if (needed.includes(k)) result[k] = v.join('=')
  })

  // URL에서 orgId 자동 추출
  const orgMatch = location.href.match(/organizations\/([^/]+)/)
  if (orgMatch) result._orgId = orgMatch[1]

  const json = JSON.stringify(result, null, 2)
  console.log('=== 아래 JSON을 대시보드에 붙여넣기 하세요 ===')
  console.log(json)

  // 클립보드 복사 시도
  try {
    copy(json)
    console.log('✅ 클립보드에 복사 완료!')
  } catch {
    console.log('⚠ 클립보드 복사 실패 — 위 JSON을 직접 복사하세요')
  }
})()
