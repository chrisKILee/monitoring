/**
 * Claude Usage Monitor — Google Groups 멤버 동기화 스크립트
 *
 * 사용 방법:
 * 1. script.google.com → 새 프로젝트 → 이 코드 붙여넣기
 * 2. Services(+) → People API 추가
 * 3. setupSecret() 한 번 실행 → SYNC_SECRET 저장
 * 4. syncAllGroups() 수동 실행 → 정상 동작 확인
 * 5. 트리거 설정: ⏰ 아이콘 → 트리거 추가 → syncAllGroups, 일 단위, 새벽 시간대
 */

const MONITORING_API_BASE = 'https://monitoring.chrisnolja.dev/api/sync';

/**
 * 최초 한 번만 실행 — Properties에 SYNC_SECRET 저장
 * 실행 후 이 함수의 SECRET 줄은 비워두거나 함수 자체를 지워도 됨
 */
function setupSecret() {
  const SECRET = 'V4swOCP1zWCD62TDUCuFJ85FFcbdoCr/ESCZbVGoK0w=';
  PropertiesService.getScriptProperties().setProperty('SYNC_SECRET', SECRET);
  Logger.log('✓ SYNC_SECRET 저장 완료');
}

/**
 * 메인 — 트리거가 호출하는 함수
 */
function syncAllGroups() {
  const startedAt = new Date();
  const secret = PropertiesService.getScriptProperties().getProperty('SYNC_SECRET');
  if (!secret) {
    Logger.log('❌ SYNC_SECRET 없음 — setupSecret() 먼저 실행');
    return;
  }

  // 1) 동기화 대상 그룹 목록 받기
  const listResp = UrlFetchApp.fetch(MONITORING_API_BASE + '/groups', {
    headers: { 'x-sync-secret': secret },
    muteHttpExceptions: true,
  });
  if (listResp.getResponseCode() !== 200) {
    Logger.log('❌ /sync/groups 실패: ' + listResp.getContentText());
    return;
  }
  const { groups } = JSON.parse(listResp.getContentText());
  Logger.log('동기화 대상 그룹 ' + groups.length + '개');

  // 2) 그룹별 순회
  let ok = 0, fail = 0, skipped = 0;
  for (const g of groups) {
    try {
      const members = collectGroupMembers(g.groupEmail);
      if (members === null) {
        skipped++;
        continue;
      }
      const postResp = UrlFetchApp.fetch(MONITORING_API_BASE + '/group-members', {
        method: 'post',
        contentType: 'application/json',
        headers: { 'x-sync-secret': secret },
        payload: JSON.stringify({ groupEmail: g.groupEmail, members: members }),
        muteHttpExceptions: true,
      });
      if (postResp.getResponseCode() === 200) {
        ok++;
        Logger.log('  ✓ ' + g.groupEmail + ' (' + members.length + '명)');
      } else {
        fail++;
        Logger.log('  ❌ ' + g.groupEmail + ': ' + postResp.getResponseCode() + ' ' + postResp.getContentText().slice(0, 200));
      }
    } catch (e) {
      fail++;
      Logger.log('  ❌ ' + g.groupEmail + ' 예외: ' + e.message);
    }
    Utilities.sleep(300); // API rate limit 방어
  }

  const elapsed = ((new Date() - startedAt) / 1000).toFixed(1);
  Logger.log('\n결과: ✓ ' + ok + ' / ❌ ' + fail + ' / ⏭ ' + skipped + '  (' + elapsed + 's)');
}

/**
 * 그룹의 멤버 이메일 + People 정보(이름, 부서, 직책) 수집
 * 반환: [{ email, name, department, title }, ...]  또는 null (접근 불가)
 */
function collectGroupMembers(groupEmail) {
  let users;
  try {
    users = GroupsApp.getGroupByEmail(groupEmail).getUsers();
  } catch (e) {
    Logger.log('  [' + groupEmail + '] GroupsApp 접근 불가 — owner 권한 확인: ' + e.message);
    return null;
  }

  return users.map(function (u) {
    const email = u.getEmail();
    const info = lookupPerson(email);
    return {
      email: email,
      name: info.name,
      department: info.department,
      title: info.title,
    };
  });
}

/**
 * People API directory 검색으로 이름/부서/직책 조회
 */
function lookupPerson(email) {
  try {
    const r = People.People.searchDirectoryPeople({
      query: email,
      readMask: 'names,organizations',
      sources: ['DIRECTORY_SOURCE_TYPE_DOMAIN_PROFILE'],
      pageSize: 1,
    });
    const p = (r.people || [])[0];
    if (!p) return { name: null, department: null, title: null };
    return {
      name: (p.names && p.names[0] && p.names[0].displayName) || null,
      department: (p.organizations && p.organizations[0] && p.organizations[0].department) || null,
      title: (p.organizations && p.organizations[0] && p.organizations[0].title) || null,
    };
  } catch (e) {
    return { name: null, department: null, title: null };
  }
}
