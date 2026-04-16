"""서울 전체 피부과 의원 목록을 HIRA API에서 수집해 CSV로 저장."""

import argparse
import csv
import sys
from pathlib import Path

import config
from hira_client import get_total_count, iter_hospitals

OUTPUT_COLUMNS = [
    "ykiho",
    "yadmNm",
    "clCdNm",
    "addr",
    "telno",
    "XPos",
    "YPos",
    "estbDd",
    "sidoCdNm",
    "sgguCd",
    "sgguCdNm",
    "emdongNm",
    "postNo",
]

DATA_DIR = Path(__file__).parent / "data"
OUTPUT_PATH = DATA_DIR / "seoul_derma.csv"


def fetch(test: bool) -> list[dict]:
    """서울 전체 피부과 의원 수집."""
    filters = dict(
        sido_cd=config.SIDO_SEOUL,
        dgsbjt_cd=config.DGSBJT_DERMA,
        cl_cd=config.CL_CD_CLINIC,
    )

    total = get_total_count(**filters)
    print(f"[info] 전체 건수 (서울 피부과 의원): {total}")

    max_pages = 1 if test else None
    num_rows = 10 if test else config.DEFAULT_NUM_OF_ROWS

    seen: set[str] = set()
    rows: list[dict] = []
    for item in iter_hospitals(**filters, num_of_rows=num_rows, max_pages=max_pages):
        ykiho = item.get("ykiho")
        if not ykiho or ykiho in seen:
            continue
        # 종별 필터 방어 (응답에 의원 외가 섞이면 제외)
        if item.get("clCdNm") and item["clCdNm"] != "의원":
            continue
        # 서울 소재만
        if item.get("sidoCdNm") != "서울":
            continue
        seen.add(ykiho)
        rows.append(item)

    return rows


def save_csv(rows: list[dict], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=OUTPUT_COLUMNS, extrasaction="ignore")
        writer.writeheader()
        for row in rows:
            writer.writerow(row)


def summarize(rows: list[dict]) -> None:
    if not rows:
        print("[warn] 수집된 행이 없습니다.")
        return

    first = rows[0]
    print("\n[sample] 첫 행:")
    for k in OUTPUT_COLUMNS:
        print(f"  {k}: {first.get(k)}")

    from collections import Counter
    gu_counts = Counter(r.get("sgguCdNm") for r in rows)
    no_coord = sum(1 for r in rows if not r.get("XPos") or not r.get("YPos"))
    print(f"\n[summary] 총 {len(rows)}건 수집 (서울)")
    print(f"  - 좌표 누락: {no_coord}/{len(rows)}")
    print(f"  - 구별 분포 (상위 10):")
    for gu, cnt in gu_counts.most_common(10):
        print(f"      {gu}: {cnt}")


def main() -> int:
    parser = argparse.ArgumentParser(description="서울 피부과 의원 목록 수집 (HIRA)")
    parser.add_argument(
        "--test",
        action="store_true",
        help="첫 페이지 10건만 조회 (스키마 검증용)",
    )
    args = parser.parse_args()

    try:
        rows = fetch(test=args.test)
    except Exception as e:
        print(f"[error] 수집 실패: {e}", file=sys.stderr)
        return 1

    summarize(rows)

    if not args.test:
        save_csv(rows, OUTPUT_PATH)
        print(f"\n[info] 저장: {OUTPUT_PATH}")
    else:
        print("\n[info] --test 모드: CSV 저장 생략")

    return 0


if __name__ == "__main__":
    sys.exit(main())
