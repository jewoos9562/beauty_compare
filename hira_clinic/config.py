"""HIRA (건강보험심사평가원) API 상수."""

BASE_URL = "https://apis.data.go.kr/B551182/hospInfoServicev2"
ENDPOINT_HOSP_LIST = f"{BASE_URL}/getHospBasisList"

# 종별코드 (clCd)
CL_CD_CLINIC = "31"  # 의원

# 진료과목코드 (dgsbjtCd)
DGSBJT_DERMA = "14"  # 피부과

# 시군구코드 (sgguCd) — 서울 강남구
# HIRA 표준코드. 첫 호출 시 응답의 addr 필드로 검증.
SGGU_GANGNAM = "110003"

# 시도코드 (sidoCd) — 서울
SIDO_SEOUL = "110000"

# 요청 기본값
DEFAULT_NUM_OF_ROWS = 100
MAX_RETRIES = 3
RETRY_BACKOFF_SEC = 2
