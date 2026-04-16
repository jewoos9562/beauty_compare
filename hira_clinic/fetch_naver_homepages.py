"""네이버 지역검색 API로 각 클리닉의 공식 홈페이지 URL을 수집.

입력: web/data/seoul_derma.json
출력:
  - data/naver_lookup.json (캐시: 모든 검색 결과 저장)
  - web/data/seoul_derma.json (homepage 필드 추가)

특징:
  - 캐시 파일이 있으면 이미 조회한 항목은 스킵 (재실행 시 이어서)
  - Naver 검색 API 10 req/s 제한 → sleep 0.12s/요청
  - 검색 결과 중 주소가 가장 비슷한 항목의 link를 채택
"""

import json
import os
import re
import sys
import time
from pathlib import Path
from urllib.parse import quote

import requests
from dotenv import load_dotenv

load_dotenv()

CLIENT_ID = os.getenv("NAVER_CLIENT_ID")
CLIENT_SECRET = os.getenv("NAVER_CLIENT_SECRET")
if not CLIENT_ID or not CLIENT_SECRET:
    raise RuntimeError(".env에 NAVER_CLIENT_ID / NAVER_CLIENT_SECRET이 필요합니다.")

ROOT = Path(__file__).parent
CLINICS_PATH = ROOT / "web" / "data" / "seoul_derma.json"
CACHE_PATH = ROOT / "data" / "naver_lookup.json"

NAVER_URL = "https://openapi.naver.com/v1/search/local.json"
HEADERS = {
    "X-Naver-Client-Id": CLIENT_ID,
    "X-Naver-Client-Secret": CLIENT_SECRET,
}

REQ_INTERVAL = 0.12  # 10 req/s 약간 아래
HTML_TAG_RE = re.compile(r"<[^>]+>")


def strip_html(s: str) -> str:
    return HTML_TAG_RE.sub("", s or "")


def search_local(query: str) -> list[dict]:
    params = {"query": query, "display": 5, "start": 1, "sort": "random"}
    r = requests.get(NAVER_URL, params=params, headers=HEADERS, timeout=15)
    if r.status_code == 429:
        # rate limited
        time.sleep(2)
        r = requests.get(NAVER_URL, params=params, headers=HEADERS, timeout=15)
    r.raise_for_status()
    return r.json().get("items", [])


def address_score(naver_addr: str, target_addr: str) -> int:
    """주소 일치도 — 도/시/구/동 단위로 토큰 매칭."""
    if not naver_addr or not target_addr:
        return 0
    a = re.split(r"[\s,]+", naver_addr)
    b = re.split(r"[\s,]+", target_addr)
    return len(set(a) & set(b))


def best_match(items: list[dict], target_addr: str) -> dict | None:
    """검색 결과 중 주소 일치도가 가장 높은 항목."""
    if not items:
        return None
    scored = []
    for it in items:
        addr = it.get("roadAddress") or it.get("address") or ""
        scored.append((address_score(addr, target_addr), it))
    scored.sort(key=lambda x: x[0], reverse=True)
    return scored[0][1]


def main() -> int:
    clinics = json.loads(CLINICS_PATH.read_text(encoding="utf-8"))
    print(f"[info] 대상 클리닉: {len(clinics)}개")

    # 캐시 로드
    cache: dict[str, dict] = {}
    if CACHE_PATH.exists():
        cache = json.loads(CACHE_PATH.read_text(encoding="utf-8"))
        print(f"[info] 캐시 로드: {len(cache)}건")

    CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)

    queried = 0
    found_homepage = 0
    errors = 0
    save_every = 50

    try:
        for i, c in enumerate(clinics):
            cid = c["id"]
            if cid in cache:
                continue

            # 검색 쿼리: 병원명 + 구
            q = f"{c['name']} {c['gu']}"
            try:
                items = search_local(q)
            except Exception as e:
                errors += 1
                print(f"[err] {q[:40]}... → {e}")
                cache[cid] = {"error": str(e)}
                time.sleep(1)
                continue

            match = best_match(items, c["addr"])
            if match:
                cache[cid] = {
                    "title": strip_html(match.get("title", "")),
                    "link": match.get("link", ""),
                    "category": match.get("category", ""),
                    "address": match.get("address", ""),
                    "roadAddress": match.get("roadAddress", ""),
                }
                if cache[cid]["link"]:
                    found_homepage += 1
            else:
                cache[cid] = {"link": ""}

            queried += 1
            if queried % 25 == 0:
                print(
                    f"[progress] {i + 1}/{len(clinics)} "
                    f"(이번 실행 조회 {queried}, 홈페이지 보유 {found_homepage}, 에러 {errors})"
                )
            if queried % save_every == 0:
                CACHE_PATH.write_text(
                    json.dumps(cache, ensure_ascii=False, indent=2), encoding="utf-8"
                )

            time.sleep(REQ_INTERVAL)

    except KeyboardInterrupt:
        print("\n[warn] 중단됨 — 캐시 저장 후 종료")

    # 최종 캐시 저장
    CACHE_PATH.write_text(
        json.dumps(cache, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"\n[info] 캐시 저장: {CACHE_PATH} ({len(cache)}건)")

    # 클리닉 JSON에 homepage 머지
    with_hp = 0
    for c in clinics:
        entry = cache.get(c["id"])
        if entry and entry.get("link"):
            c["homepage"] = entry["link"]
            c["category"] = entry.get("category", "")
            with_hp += 1

    CLINICS_PATH.write_text(
        json.dumps(clinics, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    print(
        f"[info] 클리닉 JSON 갱신: {CLINICS_PATH} — 홈페이지 보유 {with_hp}/{len(clinics)}"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
