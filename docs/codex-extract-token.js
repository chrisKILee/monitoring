/**
 * Codex Bearer 토큰 추출 스크립트
 *
 * 사용 방법:
 * 1. chatgpt.com/codex 접속 → 로그인
 * 2. F12 → Network 탭 → wham/usage 요청 선택
 * 3. 오른쪽 Headers 탭 → Request Headers → authorization 값 복사
 *    (또는 우클릭 → Copy as cURL)
 * 4. 계정 관리 페이지 → 해당 Codex 계정 수정 → Bearer 토큰 칸에 붙여넣기
 *
 * 또는 콘솔에서 직접 추출:
 */

// 브라우저 콘솔에 붙여넣기
(function extractCodexToken() {
  // chatgpt.com의 인증 토큰은 로컬스토리지 또는 세션스토리지에 있을 수 있음
  // Network 탭에서 wham/usage 요청의 Authorization 헤더를 확인하는 것이 가장 확실함

  console.log('=== Codex 토큰 추출 방법 ===');
  console.log('1. Network 탭에서 "wham/usage" 요청 찾기');
  console.log('2. Headers > Request Headers > authorization: Bearer eyJ...');
  console.log('3. eyJ...로 시작하는 JWT 전체를 복사');
  console.log('');

  // XHR 인터셉트로 자동 추출 시도
  const origOpen = XMLHttpRequest.prototype.open;
  const origFetch = window.fetch;
  let captured = null;

  window.fetch = function(...args) {
    const url = typeof args[0] === 'string' ? args[0] : args[0]?.url ?? '';
    if (url.includes('wham/usage') || url.includes('backend-api')) {
      const init = args[1] || {};
      const auth = (init.headers instanceof Headers
        ? init.headers.get('authorization')
        : (init.headers || {})['authorization']) || '';
      if (auth.startsWith('Bearer ')) {
        captured = auth.replace('Bearer ', '').trim();
        console.log('✅ 토큰 캡처됨!');
        console.log('아래 토큰을 계정 관리 페이지에 붙여넣으세요:');
        console.log(captured);
        console.copy && console.copy(captured);
      }
    }
    return origFetch.apply(this, args);
  };

  console.log('페이지를 새로고침하거나 Codex 탭을 열면 토큰이 자동으로 캡처됩니다...');
  console.log('(이 스크립트는 현재 탭에서만 동작합니다)');
})();
