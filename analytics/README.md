# AP 홈페이지 통계 설치 (2026-10-29)

공개 페이지는 AP 메인의 `/analytics/ap-analytics.js`를 공유합니다. GA4 측정 ID는 공개 설정값이며 비밀키가 아닙니다. 페이지를 다시 생성한 뒤 `python3 analytics/install.py`를 실행해야 태그가 유지됩니다. 기존 태그는 중복 삽입하지 않습니다. 관리자·문의·제보·결제 화면은 수집하지 않습니다. 통계 API 비밀키는 이 저장소에 저장하지 않습니다. 상세 안내: https://www.apholdings.kr/analytics/notice.html
