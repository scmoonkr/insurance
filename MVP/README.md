# KSR · Korean Swimming Registry — 운영 매뉴얼

대한민국 경영 종목 종합순위표. 메달뱅크 아쿠아틱스 매거진의 자매 프로젝트.
프레임워크 없는 순수 정적 HTML / CSS / JS.

---

## 1. 파일 구조

```
리더보드/
├── index.html        — The Index   · 메인 등재부 (종목별 Top 100)
├── errata.html       — The Errata  · 정오표 (정정 이력)
├── ledger.html       — The Ledger  · 기록대장 (신규 등재 피드)
├── charter.html      — The Charter · 헌장 (운영 원칙)
├── backend_records.html — 백엔드 · 기록 메타(WR/OR/AR/KR/WMR/KMR/ER) 입력·관리
├── backend_times.html   — 백엔드 · 등재부 기록 DB 검색·편집·삭제 (data.json 연동)
│                          ※ 두 backend 파일은 프론트와 링크 미연결. 운영자 전용
├── css/
│   └── styles.css    — 4개 프론트 페이지 공유 스타일
├── js/
│   ├── index.js      — The Index 필터·렌더링 로직
│   └── data.js       — 등재부 데이터 (window.KSR_DATA = {...})
├── data.json         — data.js의 원본 JSON (백업/재생성용)
├── images/
│   └── logo.png      — KSR 로고
├── AUTOMATION.md     — 자동화 규칙 명세 (DB 연동 시 반드시 참조)
└── README.md         — 본 문서
```

---

## 2. 페이지별 설명

### The Index (index.html)
- 종목별 Top 100 순위표. 좌측 sticky 필터(부문 / 연령부 / 성별 / 종목 / 거리 / 수영장).
- 데이터 출처: `js/data.js`의 `window.KSR_DATA`.
- 한 화면에 한 종목 = 한 테이블. Top 100까지 표시.
- hero 영역에 자석 스크롤(scroll-snap) + idle 시 탱탱볼 애니메이션.

### The Errata (errata.html)
- 모든 정정 이력의 시간순 테이블. 분류 / 정정 내용 / 제보자 / 제보일 / 반영호.
- 페이지당 100건 페이지네이션.
- 정정 내용 9개 분류 → AUTOMATION.md §5 참조.

### The Ledger (ledger.html)
- 신규 등재(갱신 / 발굴) 피드. 각 entry에 WR/OR/AR/KR/ER/WMR/KMR/AGE 비교 박스.
- 페이지당 100건 페이지네이션.
- 비교 박스 규칙 → AUTOMATION.md §2 참조.

### The Charter (charter.html)
- 운영 헌장 8개 조항. 정적 콘텐츠. 정책 변경 시에만 수동 편집.

---

## 3. 데이터 수정 방법

### 3-1. 등재부 순위 데이터 (The Index)
`js/data.js`를 직접 편집하거나, `data.json`을 수정 후 다음으로 재생성:

```js
// data.js 첫 줄
window.KSR_DATA = { ...data.json 내용... };
```

데이터 구조: `{ 시트명: [ {label, gender, stroke, distance, course, id, ranks:[...]} ] }`
시트명 — `all` / `elite` / `masters` / `adult` / `elite-adult` / `masters-adult`

### 3-2. 정오표 (The Errata)
`errata.html`의 `<tbody id="errata-tbody">` 안에 `<tr>` 행을 추가/수정.
각 행 형식: `분류 / 정정 내용 / 제보자 / 제보일 / 반영호`.
정정 내용은 9개 분류별 정형 패턴을 따를 것 → AUTOMATION.md §5-3.

### 3-3. 기록대장 (The Ledger)
`ledger.html`의 `<div class="ledger-feed">` 안에 `<article class="ledger-entry">` 추가.
비교 박스(WR/OR/AR/KR/ER/WMR/KMR/AGE)는 정해진 표기 규칙 준수 → AUTOMATION.md §2.

### 3-4. 기록 메타 (WR/OR/AR/KR/WMR/KMR/ER)
`backend_records.html`에서 입력·관리. §4 참조.

---

## 4. 백엔드 도구 (backend_records.html · backend_times.html)

운영자 전용. 프론트엔드와 링크 미연결, 별도 파일. **데스크탑 전용.**

### 4-1. backend_records.html — 기록 메타 관리
7가지 권위 기록(WR/OR/AR/KR/WMR/KMR/ER)을 종목별로 입력·수정.

- LCM 종목 34개 × 7기록. 카드별 스프레드시트 그리드.
- 컬럼: 기록·보유자·국적·연도·작성일·연령대·지역·대회명·수영장.
- 국적 칸 클릭 → 국가 검색 모달(국기 표시). 기록·작성일 숫자 자동 정형.
- 50m 배영·평영·접영의 OR은 비올림픽 종목이라 입력란 없음.
- 엑셀 붙여넣기(Ctrl+V), CSV 내보내기·불러오기 지원.
- **저장** — localStorage 보관 + `event_meta.json` 다운로드.

### 4-2. backend_times.html — 등재부 기록 DB 관리
`data.json`의 모든 등재 기록(개별 time)을 검색·편집·삭제.

- 로드 시 `js/data.js`의 6개 시트(all/elite/masters/adult/elite-adult/masters-adult)를 평탄화·중복 제거.
- 컬럼: 종목·부문·연령부·연령대·순위·선수·기록·작성일·연도·도시·수영장·대회·대회정식명.
- 검색(선수/기록/대회/도시) + 부문·종목 필터. 셀 직접 수정, × 로 삭제 표시(되돌리기 가능).
- **data.json 내보내기** — 6개 시트 재생성(종목별 시간순 재정렬·순위 재부여).
- **CSV 내보내기·불러오기** — 부문·수영장·연령대 포함 평탄 테이블.
- **저장** — 작업 상태 localStorage 보관 / **초기화** — data.json 원본 복원.

> 두 도구 모두 localStorage 기반 프로토타입. 실제 서버 연동 시 다운로드 파일을
> 백엔드 API 입력으로 사용한다.

---

## 5. 자동화 (AUTOMATION.md)

DB 연동 후 The Ledger / The Errata를 자동 생성하기 위한 전체 명세는 별도 문서
**AUTOMATION.md**에 정리되어 있다. 포함 내용:

- 데이터 스키마 (`records` / `event_meta` / `errata`)
- The Ledger 비교 박스 9개 항목 자동 계산 규칙 (§2)
- 시간·차이 표기 규칙 (§3)
- The Errata 9개 분류별 정형 패턴 (§5)
- 예외 처리 / 운영 흐름 (§6, §8)

신규 기능·표기 변경 시 AUTOMATION.md를 먼저 갱신하고 구현할 것.

---

## 6. 디자인 토큰

`css/styles.css` 상단 `:root`에서 일괄 관리.

- 배경: `#ffffff` (순백)
- 텍스트: `#0a0a0a` / 보조 `#4a4a48` / 흐림 `#8a8a86` / 가장 흐림 `#b8b6af`
- 보더: `#e3e1d8` (단일 hairline 톤으로 통일)
- 서체: Cormorant Garamond (영문 헤딩) · Nanum Myeongjo (국문) · Inter (본문) · JetBrains Mono (숫자)
- 강조색: `#b3893a` (골드, 점적 사용) · `#0a1d3a` (네이비)

레퍼런스: Oliver Wyman Forum — Industry 5.0 Index Ranking의 라이트/에디토리얼 역전.

---

## 7. 배포

순수 정적 파일이므로 어떤 정적 호스팅에도 그대로 업로드 가능.
`data.js`는 `<script>` 태그로 로드되므로 `file://` 직접 열기에서도 동작한다.

---

*최종 갱신: 2026-05-20*
