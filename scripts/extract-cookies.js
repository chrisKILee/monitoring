/**
 * Claude.ai 세션 쿠키 추출 스크립트
 *
 * 사용법:
 *   1. claude.ai에 로그인된 상태에서 F12 → Console 탭 열기
 *   2. 아래 코드를 전체 복사하여 Console에 붙여넣기
 *   3. Enter 후 팝업에 sessionKey 값을 붙여넣기
 *      (F12 → Application → Cookies → https://claude.ai → sessionKey 값 복사)
 *   4. 출력된 JSON이 클립보드에 자동 복사됨
 */
(function () {
  const needed = [
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

  // sessionKey는 HttpOnly 쿠키 → Application 탭에서 직접 복사 필요
  const sessionKey = prompt(
    'sessionKey를 입력해주세요.\n\n' +
    '① F12 → Application 탭\n' +
    '② Cookies → https://claude.ai\n' +
    '③ sessionKey 행 클릭 → 값 복사 후 여기에 붙여넣기'
  )
  if (sessionKey) result.sessionKey = sessionKey.trim()

  const json = JSON.stringify(result, null, 2)
  console.log('=== 아래 JSON을 대시보드에 붙여넣기 하세요 ===')
  console.log(json)

  // 클립보드 복사
  navigator.clipboard.writeText(json)
    .then(() => console.log('✅ 클립보드에 복사 완료!'))
    .catch(() => {
      try {
        copy(json)
        console.log('✅ 클립보드에 복사 완료!')
      } catch {
        console.log('⚠ 위 JSON을 직접 복사하세요')
      }
    })
})()
