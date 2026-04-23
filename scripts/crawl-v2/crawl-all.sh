#!/bin/bash
# 서울 전체 크롤 (구별 순서, 잠자기 방지, 타임아웃 없음)
set -a
source /Users/jehyuk/code/beauty/.env.local
set +a

GUS=(금천구 동대문구 성북구 중랑구 종로구 서대문구 강북구 은평구 구로구 용산구 관악구 동작구 성동구 양천구 노원구 강동구 영등포구 강서구 중구 마포구 송파구 서초구 강남구)

echo "===== 서울 전체 크롤 시작 ====="
echo "===== $(date) ====="
echo ""

for gu in "${GUS[@]}"; do
  echo ""
  echo "========== $gu 시작 $(date +%H:%M:%S) =========="
  node /Users/jehyuk/code/beauty/scripts/crawl-v2/crawl.mjs --gu="$gu"
  echo "========== $gu 완료 $(date +%H:%M:%S) =========="
done

echo ""
echo "===== 서울 전체 크롤 완료 ====="
echo "===== $(date) ====="
