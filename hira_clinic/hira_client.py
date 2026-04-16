"""HIRA 병원정보서비스 API 클라이언트."""

import os
import time
from typing import Any, Iterator

import requests
from dotenv import load_dotenv

import config

load_dotenv()

SERVICE_KEY = os.getenv("SERVICE_KEY")
if not SERVICE_KEY:
    raise RuntimeError(".env에 SERVICE_KEY가 설정되지 않았습니다.")


class HiraAPIError(Exception):
    """HIRA API 호출 실패."""


def _request_page(
    sido_cd: str | None,
    sggu_cd: str | None,
    dgsbjt_cd: str | None,
    cl_cd: str | None,
    page_no: int,
    num_of_rows: int,
) -> dict[str, Any]:
    """HIRA getHospBasisList 한 페이지 호출."""
    params = {
        "ServiceKey": SERVICE_KEY,
        "_type": "json",
        "pageNo": page_no,
        "numOfRows": num_of_rows,
    }
    if sido_cd:
        params["sidoCd"] = sido_cd
    if sggu_cd:
        params["sgguCd"] = sggu_cd
    if dgsbjt_cd:
        params["dgsbjtCd"] = dgsbjt_cd
    if cl_cd:
        params["clCd"] = cl_cd

    last_exc: Exception | None = None
    for attempt in range(1, config.MAX_RETRIES + 1):
        try:
            resp = requests.get(config.ENDPOINT_HOSP_LIST, params=params, timeout=30)
            resp.raise_for_status()
        except requests.RequestException as e:
            last_exc = e
            if attempt < config.MAX_RETRIES:
                time.sleep(config.RETRY_BACKOFF_SEC * attempt)
                continue
            raise HiraAPIError(f"HTTP 요청 실패: {e}") from e

        # HIRA는 에러 시 XML로 돌려보내는 경우가 있음
        ctype = resp.headers.get("Content-Type", "")
        if "xml" in ctype.lower() or resp.text.lstrip().startswith("<"):
            raise HiraAPIError(f"XML 에러 응답: {resp.text[:500]}")

        try:
            data = resp.json()
        except ValueError as e:
            raise HiraAPIError(
                f"JSON 파싱 실패 (status={resp.status_code}): {resp.text[:500]}"
            ) from e

        response = data.get("response", {})
        header = response.get("header", {})
        result_code = header.get("resultCode")
        if result_code != "00":
            raise HiraAPIError(
                f"API 에러: resultCode={result_code}, msg={header.get('resultMsg')}"
            )
        return response

    raise HiraAPIError(f"재시도 후에도 실패: {last_exc}")


def iter_hospitals(
    sido_cd: str | None = None,
    sggu_cd: str | None = None,
    dgsbjt_cd: str | None = None,
    cl_cd: str | None = None,
    num_of_rows: int = config.DEFAULT_NUM_OF_ROWS,
    max_pages: int | None = None,
) -> Iterator[dict[str, Any]]:
    """
    조건에 맞는 병원을 페이지네이션하며 하나씩 yield.

    max_pages: None이면 전체, 정수면 해당 페이지 수까지만.
    """
    page_no = 1
    total_count: int | None = None

    while True:
        response = _request_page(sido_cd, sggu_cd, dgsbjt_cd, cl_cd, page_no, num_of_rows)
        body = response.get("body", {})
        if total_count is None:
            total_count = int(body.get("totalCount", 0))

        items_field = body.get("items")
        if not items_field:
            break

        # HIRA 응답은 items: {"item": [...]} 또는 items: {"item": {...}} 형태
        if isinstance(items_field, dict):
            items = items_field.get("item", [])
        else:
            items = items_field

        if isinstance(items, dict):
            items = [items]

        for item in items:
            yield item

        fetched = page_no * num_of_rows
        if fetched >= total_count:
            break
        if max_pages is not None and page_no >= max_pages:
            break

        page_no += 1


def get_total_count(
    sido_cd: str | None = None,
    sggu_cd: str | None = None,
    dgsbjt_cd: str | None = None,
    cl_cd: str | None = None,
) -> int:
    """조건에 맞는 병원 총 건수만 반환."""
    response = _request_page(sido_cd, sggu_cd, dgsbjt_cd, cl_cd, page_no=1, num_of_rows=1)
    return int(response.get("body", {}).get("totalCount", 0))
