import { config } from 'dotenv'
config({ path: '.env.local' })
config()

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const data = [
  // 전용 계정
  { accountName: 'rnd_dev_1',         phoneAuth: null,   isShared: null, service: 'claude', note: null },
  { accountName: 'rnd_dev_2',         phoneAuth: null,   isShared: null, service: 'claude', note: null },
  { accountName: 'rnd_dev_3',         phoneAuth: null,   isShared: null, service: 'claude', note: null },
  { accountName: '서비스개발실 200',   phoneAuth: null,   isShared: null, service: 'claude', note: '관리하지 않음' },
  { accountName: 'erp4팀 200',        phoneAuth: null,   isShared: null, service: 'claude', note: '관리하지 않음' },

  // 공유 계정 (claude_share)
  { accountName: 'claude_share_01',   phoneAuth: null,   isShared: null, service: 'claude', note: null },
  { accountName: 'claude_share_02',   phoneAuth: null,   isShared: null, service: 'claude', note: null },
  { accountName: 'claude_share_03',   phoneAuth: null,   isShared: null, service: 'claude', note: null },
  { accountName: 'claude_share_04',   phoneAuth: null,   isShared: null, service: 'claude', note: null },
  { accountName: 'claude_share_05',   phoneAuth: null,   isShared: null, service: 'claude', note: '아직 미정 (정보보호서비스 관련인데 프로젝트가 없음)' },
  { accountName: 'claude_share_06',   phoneAuth: '김기현', isShared: null, service: 'claude', note: '개인부담금+공유계정' },
  { accountName: 'claude_share_07',   phoneAuth: '정주현', isShared: null, service: 'claude', note: '개인부담금+공유계정' },

  // 라이선스 계정
  { accountName: 'vntg_ai_license_01', phoneAuth: null,   isShared: null, service: 'codex', note: 'AI 도구 분석' },
  { accountName: 'vntg_ai_license_02', phoneAuth: null,   isShared: null, service: 'claude', note: '개인부담금+공유계정' },
  { accountName: 'vntg_ai_license_03', phoneAuth: '문성원', isShared: null, service: 'claude', note: '개인부담금+공유계정' },
  { accountName: 'vntg_ai_license_04', phoneAuth: null,   isShared: null, service: 'claude', note: null },
  { accountName: 'vntg_ai_license_05', phoneAuth: '이원석', isShared: null, service: 'claude', note: '개인부담금+공유계정' },
  { accountName: 'vntg_ai_license_06', phoneAuth: '조진우', isShared: null, service: 'claude', note: '개인부담금+공유계정' },
  { accountName: 'vntg_ai_license_07', phoneAuth: '최서인', isShared: null, service: 'claude', note: '개인부담금+공유계정' },
  { accountName: 'vntg_ai_license_08', phoneAuth: '구명선', isShared: null, service: 'claude', note: '개인부담금+공유계정' },
  { accountName: 'vntg_ai_license_09', phoneAuth: '배대웅', isShared: null, service: 'claude', note: '개인부담금+공유계정' },
  { accountName: 'vntg_ai_license_10', phoneAuth: '구명선', isShared: null, service: 'claude', note: '개인부담금+공유계정' },
]

async function main() {
  console.log(`총 ${data.length}개 레코드 삽입 중...`)

  for (const row of data) {
    await prisma.serviceAccount.upsert({
      where: { accountName: row.accountName },
      update: row,
      create: row,
    })
    console.log(`  ✓ ${row.accountName}`)
  }

  console.log('\n✅ 완료!')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
