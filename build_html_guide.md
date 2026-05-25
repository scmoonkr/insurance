# 보험 제안서 JSON 작성 지침 (v2)

## 목적
보험 설계서를 분석한 내용을 기반으로
고객 맞춤형 보험 제안서를 자동 생성하기 위한 JSON 구조 규칙.

본 JSON은:
- PPT 생성
- PDF 생성
- HTML 렌더링
- Canva 디자인 생성
- 영상 슬라이드 생성

등의 렌더링 엔진에서 공통 사용한다.

---
## 작성 형식
A4 Landscape 형식으로 만들어 인쇄 가능하도록 작성할 것

# 최상위 구조

```json
{
  "id": "proposal-id",
  "title": "'이름' 고객님 맞춤 통합 보장 블루프린트",
  "subtitle": "4개사 강점 조립형 설계",
  "documentType": "customerProposal",
  "totalPages": 15,
  "customer": {},
  "disclaimer": {},
  "renderHint": {},
  "pages": []
}
```

---

# page.id 규칙

## detail page

현재 형태 유지.

```json
"id": "page-detail-1"
"id": "page-detail-2"
"id": "page-detail-3"
"id": "page-detail-4"
```

보험사명 사용하지 않음.

---

# page.type enum

```json
"type": "openingEssay"
"type": "empathyCards"
"type": "existingAnalysis"
"type": "issueList"
"type": "sectionCover"
"type": "missionStatement"
"type": "riskIceberg"
"type": "companyPuzzleOverview"
"type": "companyMatrix"
"type": "companyDetail"
"type": "careJourney"
"type": "closingBalance"
```

---

# visual.type enum

```json
"type": "barChart"
"type": "hospitalGateway"
"type": "continuousCareCycle"
"type": "familyProtection"
"type": "iceberg"
"type": "matrix"
```

---

# 줄바꿈 규칙

문장 줄바꿈은 반드시 `\n` 사용.

```json
"body": "돈 없이 사는 것은 불가능합니다.\n내가 떠난 뒤에도 남은 가족은\n경제 문제를 피할 수 없습니다."
```

---

# 보험료 구조 규칙

```json
"premium": {
  "monthly": 104003,
  "currency": "KRW",
  "display": "104,003원"
}
```

---

# visual.bars 규칙

```json
"bars": [
  {
    "label": "표적항암",
    "amount": "3,000만 원",
    "value": 3000,
    "maxValue": 3000
  }
]
```

---

# coverageList 규칙

```json
"coverageList": [
  "암 진단비 : 1,000만 원",
  "표적항암 : 3,000만 원"
]
```

---

# 추천 디자인 시스템

```json
"renderHint": {
  "theme": "luxury",
  "layout": "center-focus",
  "background": "dark-navy",
  "accent": "gold"
}
```

---

# 핵심 목적

이 JSON은 단순 데이터가 아니라:

- 고객 공감
- 문제 인식
- 위험 현실화
- 해결 방향 제시
- 보험사 역할 분담
- 가족 보호 메시지

를 하나의 narrative flow로 연결하는
보험 제안서 생성 엔진용 구조이다.
