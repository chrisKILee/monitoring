#!/usr/bin/env bash
set -e

echo "🚀 claude-usage-monitor 배포 시작"

# 테스트 통과 확인
echo "🧪 테스트 실행..."
npm test

# 빌드 확인
echo "🔨 빌드 확인..."
npm run build

# Bitbucket push
echo "📦 Bitbucket push..."
git add -A
git commit -m "[deploy] $(date '+%Y-%m-%d %H:%M')" 2>/dev/null || echo "변경사항 없음"
git push origin main

# Vercel 배포
echo "▲ Vercel 배포..."
vercel --prod

echo "✅ 배포 완료!"
