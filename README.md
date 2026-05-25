# Insurance Proposal MVP

보험 설계 제안서를 JSON 데이터로 작성하고, 정적 HTML 산출물로 렌더링하기 위한 MVP 저장소입니다.

고객 정보, 기존 보험 분석, 보장 공백, 보험사별 역할, 월 보험료, 최종 제안 메시지를 하나의 JSON 구조로 정리하여 A4 Landscape형 제안서, HTML 렌더링, PDF/PPT/Canva 등 다른 출력 포맷으로 확장할 수 있도록 설계했습니다.

## 주요 기능

- 고객 맞춤 보험 제안서 JSON 스키마 정리
- 15페이지 내외의 보험 제안서 서사 구조 제공
- 기존 보험 분석, 문제점, 보장 전략, 보험사별 상세 페이지 구성
- 보험사별 월 보험료와 핵심 보장 내용 표현
- 정적 HTML 기반 샘플 산출물 제공
- 향후 PDF, PPT, Canva, 영상 슬라이드 생성 엔진으로 확장 가능한 데이터 구조

## 저장소 구조

```text
.
├── README.md
├── build_html_guide.md
└── MVP/
    ├── insure_sample.json      # 보험 제안서 JSON 샘플
    ├── insure_report.html      # 번들링된 보험 제안서 HTML 산출물
    ├── data1.json              # 이전/실험용 JSON 데이터
    ├── data2.json              # 작성 규칙 및 샘플 JSON
    ├── data3.json              # 이전/실험용 JSON 데이터
    ├── index.html              # 정적 HTML 샘플 페이지
    ├── css/
    │   └── styles.css
    ├── js/
    │   ├── data.js
    │   └── index.js
    └── images/
        └── logo.png
```

## 빠른 실행

별도 빌드 과정 없이 HTML 파일을 브라우저에서 열어 확인할 수 있습니다.

```bash
cd MVP
```

이후 다음 파일 중 하나를 브라우저에서 엽니다.

- `insure_report.html`: 보험 제안서 렌더링 산출물
- `index.html`: 정적 HTML 샘플 페이지

로컬 서버로 확인하고 싶다면 원하는 정적 서버를 사용할 수 있습니다.

```bash
python -m http.server 8000
```

접속 주소:

```text
http://localhost:8000
```

## Git 명령어

### 1. 처음 한 번만 초기화하고 GitHub에 올리기

현재 폴더를 Git 저장소로 초기화한 뒤 GitHub `scmoonkr/insurance` 저장소에 처음 올리는 명령입니다.

```bash
git init
git branch -M main
git add .
git commit -m "Initial insurance proposal MVP"
git remote add origin https://github.com/scmoonkr/insurance.git
git push -u origin main
```

### 2. 이후 작업 내용을 push하기

파일을 수정한 뒤 GitHub에 올릴 때 사용합니다.

```bash
git status
git add .
git commit -m "Update insurance proposal MVP"
git push origin main
```

### 3. GitHub 최신 내용을 pull하기

원격 저장소의 최신 내용을 현재 폴더로 내려받을 때 사용합니다.

```bash
git pull origin main
```

### 4. 자주 쓰는 확인 명령

```bash
git status
git remote -v
git log --oneline -5
```

## JSON 작성 흐름

1. `MVP/insure_sample.json` 또는 `MVP/data2.json`을 기준으로 고객별 JSON을 작성합니다.
2. 고객명, 나이, 성별, 계약자, 기존 보험 분석, 보험사별 보장 내용, 보험료를 입력합니다.
3. 각 페이지의 `type`에 맞춰 필요한 필드를 채웁니다.
4. 작성된 JSON을 HTML/PDF/PPT/Canva 렌더링 엔진의 입력값으로 사용합니다.

## 핵심 JSON 구조

```json
{
  "id": "proposal-id",
  "title": "'고객명' 고객님 맞춤 통합 보장 블루프린트",
  "subtitle": "4개사 강점 조립형 설계",
  "documentType": "customerProposal",
  "totalPages": 15,
  "customer": {
    "name": "고객명",
    "age": 79,
    "gender": "남",
    "contractor": "계약자명"
  },
  "disclaimer": {
    "text": "본 자료는 보험 가입 검토를 돕기 위한 요약 제안서입니다."
  },
  "pages": []
}
```

## 페이지 타입

현재 샘플에서 사용하는 주요 페이지 타입은 다음과 같습니다.

- `openingEssay`: 도입 에세이
- `empathyCards`: 고객 공감 카드
- `existingAnalysis`: 기존 가입 보험 분석
- `issueList`: 기존 보험의 문제점
- `sectionCover`: 제안 섹션 커버
- `missionStatement`: 보험의 목적과 제안 방향
- `riskIceberg`: 질병/간병 리스크 구조
- `companyPuzzleOverview`: 보험사 조합 개요
- `companyMatrix`: 보험사별 역할 매트릭스
- `companyDetail`: 보험사별 상세 보장 페이지
- `careJourney`: 치료 여정별 보장 흐름
- `closingBalance`: 월 보험료와 미래 부담 비교

## 작성 규칙

자세한 JSON 작성 규칙은 `build_html_guide.md`와 `MVP/data2.json`에 정리되어 있습니다.

주요 원칙:

- 고객명은 제안서 전체에서 동일한 표기로 유지합니다.
- 문장 줄바꿈은 JSON 문자열 안에서 `\n`으로 처리합니다.
- 보험료는 숫자값과 표시용 문자열을 함께 관리합니다.
- 보험사 상세 페이지는 실제 제안에 포함되는 보험사 수만큼 작성합니다.
- 기존 보험 분석 자료가 있는 경우 `existingAnalysis`, `issueList`, `missionStatement`를 함께 작성합니다.
- 보장 내용은 약관을 대체하지 않으며, 최종 판단 기준은 각 보험사의 약관 및 상품설명서입니다.

## 산출물 방향

이 저장소의 JSON은 단순 데이터 파일이 아니라 제안서의 narrative flow를 담는 원천 데이터입니다.

향후 다음 산출물로 확장할 수 있습니다.

- 정적 HTML 제안서
- PDF 제안서
- PPT 슬라이드
- Canva 디자인
- 상담용 영상 슬라이드

## 주의사항

이 프로젝트는 보험 가입 검토를 돕기 위한 제안서 생성 MVP입니다. 실제 보장 내용, 보험금 지급 기준, 면책/감액 조건, 인수 가능 여부는 각 보험사의 약관, 상품설명서, 청약 심사 결과를 기준으로 확인해야 합니다.
