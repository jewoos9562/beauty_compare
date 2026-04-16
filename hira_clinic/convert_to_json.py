"""seoul_derma.csv를 웹에서 쓰기 편한 JSON으로 변환.

상호명 기준 필터:
- 제외: 비뇨기/성형/내과/외과/이비인후과 등 타 전문과목이 이름에 들어간 경우
- 포함:
  (a) 이름에 '피부' 또는 '미용' 포함
  (b) 타 전문과목 키워드가 전혀 없는 일반 '○○의원'
"""

import csv
import json
import re
from pathlib import Path

SRC = Path(__file__).parent / "data" / "seoul_derma.csv"
DST = Path(__file__).parent / "web" / "data" / "seoul_derma.json"

# 우선순위 포함 키워드 (이거 하나라도 있으면 무조건 포함)
INCLUDE_KEYWORDS = ("피부", "미용")

# 제외 키워드 — 상호명에 들어가면 제외.
# (단, INCLUDE_KEYWORDS가 함께 있으면 제외하지 않음)
EXCLUDE_KEYWORDS = (
    "내과",
    "외과",           # 성형외과/정형외과/흉부외과/신경외과 등 모두 커버
    "산부인과",
    "산과",
    "부인과",
    "소아과",
    "소아청소년",
    "이비인후",
    "안과",
    "비뇨",
    "정신건강의학",
    "정신의학",
    "신경정신",
    "신경과",
    "재활의학",
    "영상의학",
    "마취통증",
    "통증의학",
    "가정의학",
    "응급의학",
    "방사선",
    "진단검사",
    "병리과",
    "핵의학",
    "치과",
    "한의",
    "한방",
    "정신과",
)


def should_keep(name: str) -> bool:
    """이름 기준 필터 판정."""
    if not name:
        return False
    # 포함 키워드 있으면 무조건 유지
    if any(k in name for k in INCLUDE_KEYWORDS):
        return True
    # 제외 키워드 걸리면 제외
    if any(k in name for k in EXCLUDE_KEYWORDS):
        return False
    # 일반 의원 (특정 전문과목 명시 없음) → 유지
    return True


def main() -> None:
    rows = []
    excluded_samples = []
    total = 0
    with SRC.open(encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for r in reader:
            total += 1
            name = r.get("yadmNm", "")
            if not should_keep(name):
                if len(excluded_samples) < 10:
                    excluded_samples.append(name)
                continue
            try:
                lat = float(r["YPos"])
                lng = float(r["XPos"])
            except (TypeError, ValueError):
                continue
            rows.append(
                {
                    "id": r["ykiho"],
                    "name": name,
                    "addr": r["addr"],
                    "tel": r["telno"],
                    "lat": lat,
                    "lng": lng,
                    "gu": r["sgguCdNm"],
                    "dong": r["emdongNm"],
                    "estbDd": r["estbDd"],
                }
            )

    DST.parent.mkdir(parents=True, exist_ok=True)
    with DST.open("w", encoding="utf-8") as f:
        json.dump(rows, f, ensure_ascii=False, separators=(",", ":"))

    print(f"[info] 입력 {total}건 → 필터 후 {len(rows)}건 (제외 {total - len(rows)})")
    print(f"[info] 저장: {DST} ({DST.stat().st_size / 1024:.1f} KB)")
    print("\n[sample] 제외된 이름 예시:")
    for n in excluded_samples:
        print(f"  - {n}")


if __name__ == "__main__":
    main()
