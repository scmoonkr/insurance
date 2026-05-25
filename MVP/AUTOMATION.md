# KSR 데이터 자동화 규칙 (v1)

DB 연결 시 The Ledger의 각 entry를 자동 생성하기 위한 스키마·계산 규칙·표기 규칙.
The Index / The Errata / The Charter는 별도 자동화 규칙이 거의 필요 없거나(헌장은 정적), 등재부 row 단위로만 갱신되므로 본 문서는 **Ledger 자동화**를 중심으로 정리.

---

## 1. 데이터 스키마

### 1-1. `records` — 단일 등재 row

```typescript
type Record = {
  id: string                  // "m-breast-100-lcm-2026-05-18-kimmh" (event_key + date + slug)
  event_key: string           // "m-breast-100-lcm"
  gender: "m" | "f"
  stroke: "free" | "back" | "breast" | "fly" | "im"
  distance: 25 | 50 | 100 | 200 | 400 | 800 | 1500
  course: "lcm" | "scm"
  division: "elite" | "masters" | "all"
  group: "adult" | "high" | "mid" | "elem" | "youth"  // 현재 adult만 활성

  rank: number                // 1, 2, ... (해당 종목 내 순위)
  time: string                // "00:59.18" 표기용 (mm:ss.dd 또는 hh:mm:ss.dd)
  time_ms: number             // 59180 — 계산용 밀리초 정수

  athlete: {
    name: string              // "김민호"
    name_hanja?: string       // "金民湖"
    name_en?: string          // "Kim Minho"
    birth_year?: number       // 2002
    city: string              // "광주"
    affiliation?: string      // "광주광역시청"
  }

  date: string                // ISO "2026-05-18"
  meet: string                // 축약형 "25 코리아챔피언십"
  meet_full: string           // 풀네임 "2025 KB금융 코리아 스위밍 챔피언십"
  venue?: string              // "김천시시설관리공단실내수영장"
  city_of_meet?: string       // "김천"

  source: "official" | "video" | "photo" | "reporter"
  verification_ref?: string   // 결과지/영상 URL, 사진 파일 경로

  entry_type: "new_record" | "recovered"
  // new_record: 최근 발생한 기록의 등재 (갱신)
  // recovered: 과거 누락분의 등재 (발굴)

  created_at: string          // 등재부에 추가된 시점 (ISO)
  issue_no: number            // 등재된 발행 호 (1, 2, 3 ...)
}
```

### 1-2. `event_meta` — 종목별 메타데이터 (별도 테이블)

```typescript
type EventMeta = {
  event_key: string
  label_ko: string            // "남자 평영 100M LCM"
  label_en?: string           // "Men 100m Breaststroke LCM"

  world_record: {
    time: string              // "00:56.88"
    time_ms: number
    holder: string            // "Adam Peaty"
    country: string           // "GBR"
    year: number              // 2019
    meet?: string             // "World Aquatics Championships"
  }

  asian_record: {
    time: string              // "00:58.49"
    time_ms: number
    holder: string            // "Yan Zibei"
    country: string           // "CHN"
    year: number
    meet?: string
  } | null

  olympic_record: {
    time: string              // "00:56.88"
    time_ms: number
    holder: string            // "Adam Peaty"
    country: string
    games: string             // "Tokyo 2020"
    year: number
  } | null                    // 종목이 올림픽 정식 종목이 아니면 null

  enhanced_games_record: {
    time: string              // "00:20.89"
    time_ms: number
    holder: string            // "Kristian Gkolomeev"
    country: string           // "GRE"
    edition: string           // "Las Vegas 2026" (첫 대회) / "2026 II" 등
    year: number              // 2026
  } | null                    // Enhanced Games 미실시 종목 (장거리·평영·배영 다수)이면 null

  korean_record: {
    time: string              // "00:59.18"
    time_ms: number
    holder: string            // "김민호"
    year: number
    date: string              // "2026-05-18"
    meet?: string
    record_id?: string        // 위 records.id 참조
  }

  world_masters_record: {
    time: string
    time_ms: number
    holder: string
    country: string
    year: number
    age_group?: string        // "25-29" 등 (마스터즈는 연령대별)
  } | null

  korean_masters_record: {
    time: string
    time_ms: number
    holder: string
    year: number
    age_group?: string
    record_id?: string
  } | null

  korean_record_history?: Array<{
    holder: string
    time: string
    date: string
    record_id?: string
  }>
}
```

### 1-3. `errata` — 정오표 entry (참고용)

```typescript
type ErrataEntry = {
  id: number
  kind: "신기록 신규 등재" | "누락건 신규 등재" | "기록오류 정정"
      | "종목오류 정정" | "날짜오류 정정" | "이름오류 정정"
      | "순위오류 정정" | "기타오류 정정" | "오류건 삭제"
  description: string         // 정정 내용 텍스트
  reporter: string            // 제보자 (실명 또는 "익명")
  reporter_anonymous: boolean
  reported_at: string         // "2026-05-18"
  issue_no: number            // 2 (반영호)
  related_record_id?: string  // 영향받은 records.id
}
```

---

## 2. The Ledger entry 자동 생성 규칙

각 ledger entry는 다음 4개 요소로 구성된다.

1. **헤더** (`h3`) — 종목명 (예: `남자 평영 100M LCM`)
2. **선수 정보** (`.athlete`) — `[rank]위 [name]`
3. **본문 한 줄** (`p`) — 정형 패턴 (아래 2-0 참조)
4. **비교 박스** (`.compare`) — 정량 정보 (2-1~2-9)

### 2-0. 본문 한 줄 — 정형 패턴

`body p`는 자유 텍스트를 사용하지 않는다. 자동화 가능하도록 다음 정형 패턴 중 하나로만 생성한다.

| 조건 | 패턴 |
|---|---|
| `entry_type == "new_record"` AND `rank == 1` AND `record.id == event_meta.korean_record.record_id` | `신규 한국기록 등재 — 본인이 현 한국기록 보유자.` |
| `entry_type == "new_record"` AND `rank == 1` AND `record.id == event_meta.korean_masters_record.record_id` (마스터즈) | `신규 한국마스터즈기록 등재 — 본인이 현 한국마스터즈기록 보유자.` |
| `entry_type == "new_record"` AND `rank > 1` | `신규 등재 — 한국 [rank]위.` |
| `entry_type == "recovered"` | `발굴 등재 — 등재부 누락분 보완.` |

**원칙**: 본문은 *entry의 분류 정체성*만 짧게 표기한다. 정량 정보(직전 기록 대비 차이, 세대교체 분석 등)는 사람이 작성해야 하므로 자동화하지 않는다. 모든 정량 비교는 비교 박스(`.compare`)에 통일적으로 들어간다.

### 비교 박스 계산 규칙

### 2-1. WR (세계신기록)

```
diff_ms = record.time_ms − event_meta.world_record.time_ms
```

| 조건 | 표기 |
|---|---|
| `record.id == event_meta.world_record.record_id` | `세계신기록 보유자 (본인)` |
| `diff_ms > 0` | `세계신기록 [WR.time] · +X.XX초` (이름·국적·연도 크레딧 노출) |
| `event_meta.world_record == null` | 줄 생략 (WR 데이터 없는 마이너 종목) |

**원칙**: 본인이 기록 보유자인 경우, 직전 기록 대비 차이는 표기하지 않는다. 등재부의 누락 가능성이 있는 한 직전 기록의 정확성을 보장할 수 없기 때문이다.

### 2-2. AR (아시아기록)

```
diff_ms = record.time_ms − event_meta.asian_record.time_ms
```

| 조건 | 표기 |
|---|---|
| `event_meta.asian_record == null` | 줄 생략 |
| `record.id == event_meta.asian_record.record_id` | `아시아신기록 보유자 (본인)` |
| `diff_ms > 0` | `아시아신기록 [AR.time] · +X.XX초` (크레딧 노출) |

### 2-3. OR (올림픽기록)

```
diff_ms = record.time_ms − event_meta.olympic_record.time_ms
```

| 조건 | 표기 |
|---|---|
| `event_meta.olympic_record == null` | 줄 생략 (50m 평·배·접영 등 비올림픽 종목, 또는 SCM 전반) |
| `record.id == event_meta.olympic_record.record_id` | `올림픽기록 보유자 (본인)` |
| `diff_ms > 0` | `올림픽기록 [OR.time] · +X.XX초` (크레딧 노출) |

### 2-4. KR (한국신기록)

```
diff_ms = record.time_ms − event_meta.korean_record.time_ms
```

| 조건 | 표기 |
|---|---|
| `record.id == event_meta.korean_record.record_id` | `한국신기록 보유자 (본인)` |
| `diff_ms > 0` | `한국신기록 [KR.time] · +X.XX초` (크레딧 노출) |

**중요**: 본인이 보유자인 경우 *직전 기록 대비 차이*는 절대 표기하지 않는다. 등재부에 누락된 기록이 있을 가능성이 있어, 우리가 알고 있는 "직전 기록"이 진짜 직전 기록인지 보장할 수 없기 때문이다. 한국기록 보유자라는 사실만 명시한다.

### 2-4-AA. ER (인핸스드게임 기록)

도핑 허용을 전제로 한 비공식 인류 한계 기록. WR보다 빠를 수 있다. 첫 대회는 2026년 5월 Las Vegas. 종목 수가 적어 (sprint 위주) 다수 entry에서는 생략. **위치: KR 바로 아래, WMR 바로 위**.

```
diff_ms = record.time_ms − event_meta.enhanced_games_record.time_ms
```

| 조건 | 표기 |
|---|---|
| `event_meta.enhanced_games_record == null` | 줄 생략 (인핸스드게임 미실시 종목) |
| `record.id == event_meta.enhanced_games_record.record_id` | `인핸스드게임기록 보유자 (본인)` |
| `diff_ms > 0` | `인핸스드게임기록 [time] · +X.XX초` (Holder · CTY · Edition year 크레딧) |

### 2-4-A. WMR (세계 마스터즈 기록)

엘리트·마스터즈 entries 모두에 노출. 엘리트 기록을 보는 사용자도 마스터즈 세계와 비교 가능.

```
diff_ms = record.time_ms − event_meta.world_masters_record.time_ms
```

| 조건 | 표기 |
|---|---|
| `event_meta.world_masters_record == null` | 줄 생략 |
| `record.id == event_meta.world_masters_record.record_id` | `세계마스터즈기록 보유자 (본인)` |
| `diff_ms > 0` | `세계마스터즈기록 [time] · +X.XX초` (크레딧 + 연령대 노출) |
| `diff_ms < 0` (엘리트가 더 빠른 경우) | `세계마스터즈기록 [time] · +X.XX초` |

### 2-4-B. KMR (한국 마스터즈 기록)

```
diff_ms = record.time_ms − event_meta.korean_masters_record.time_ms
```

| 조건 | 표기 |
|---|---|
| `event_meta.korean_masters_record == null` | 줄 생략 |
| `record.id == event_meta.korean_masters_record.record_id` | `한국마스터즈기록 보유자 (본인)` |
| `diff_ms > 0` | `한국마스터즈기록 [time] · +X.XX초` (크레딧 + 연령대 노출) |
| `diff_ms < 0` (엘리트가 더 빠른 경우) | `한국마스터즈기록 [time] · +X.XX초` |

### 2-5. ↑ (바로 위 순위)

해당 record와 같은 (event_key, division, group, gender) 안에서 `rank = record.rank − 1`인 row 조회.

| 조건 | 표기 |
|---|---|
| `record.rank == 1` | `이 종목 정상 (1위)` |
| upper row 존재 | `↑ [upper.athlete.name] [upper.time] · −X.XX초 차이` |
| upper row 미등재 (공동순위 등) | 줄 생략 |

### 2-6. ↓ (바로 아래 순위)

`rank = record.rank + 1`인 row 조회.

| 조건 | 표기 |
|---|---|
| `record.rank == 100` 또는 lower row 없음 | `리더보드 컷오프 · 다음 자리 미등재` |
| lower row 존재 | `↓ [lower.athlete.name] [lower.time] · +X.XX초` |

**참고**: `+X.XX초` 표기는 단순 시간 차이 절대값. "우위"같은 의미 부여 단어는 붙이지 않는다.

### 2-7. AGE (작성 시 본인 나이)

**엘리트 entries 전용**. 마스터즈 entries에는 노출하지 않는다 (마스터즈는 연령 자체가 분류 기준이므로 별도 표기 불필요).

조건 모두 충족 시에만 출력:
1. `record.division == "elite"` (또는 `"all"`)
2. `athlete.birth_year != null`

```
age = record.date.year − athlete.birth_year
```

표기: `이 기록은 본인 [age]세 때 작성`

| 조건 | 처리 |
|---|---|
| `record.division == "masters"` | 줄 생략 |
| `athlete.birth_year == null` | 줄 생략 (계산 불가) |
| 위 둘 다 충족 | `이 기록은 본인 [age]세 때 작성` |

### 2-8. NOTE (시간 컨텍스트 — 발굴 entry 전용)

`entry_type == "recovered"`일 때만 생성.

```
record_age_years = current_year − record_year
maintained_years = (next_replacement_date − record.date) / 365
                  또는 (now − record.date) / 365 if 아직 유지 중
```

표기: `[year]년 기록 · 작성 후 [record_age_years]년 · 이 자리 [maintained_years]년째 유지`

예: `2023년 기록 · 작성 후 3년 · 이 자리 3년째 유지`

`entry_type == "new_record"`이면 생략.

### 2-9. ALSO (다른 종목 등재)

같은 `athlete.name` (또는 더 엄격하게 `athlete.name + birth_year`)으로 등재된 *다른 event_key*의 record 조회.

```
others = records.where(athlete.name == X AND event_key != current.event_key)
        .order_by(rank ASC).limit(3)
```

| 조건 | 표기 |
|---|---|
| `others.length == 0` | 줄 생략 |
| `others.length ≤ 3` | `이 선수는 [event_label] ([rank]위), ... 에도 등재` |
| `others.length > 3` | `이 선수는 [Top 3 event_label]에도 등재 (외 N건)` |

---

## 3. 시간 표기 규칙

### 3-1. 단일 시간

| 길이 | 형식 | 예 |
|---|---|---|
| < 1분 | `mm:ss.dd` (mm은 00) | `00:21.72` |
| 1분 이상 | `mm:ss.dd` | `01:55.42` |
| 10분 이상 | `mm:ss.dd` | `15:41.92` |
| 1시간 이상 (드물) | `hh:mm:ss.dd` | `01:14:32.18` |

### 3-2. 차이 (delta)

| 조건 | 형식 | 예 |
|---|---|---|
| `\|diff\| < 60초` | `±X.XX초` | `+2.30초`, `−0.24초` |
| `\|diff\| ≥ 60초` | `±M:SS.dd` | `+1:11.25` |
| 부호 | 양수: `+` (반드시), 음수: `−` (U+2212, ASCII `-` 아님) | |

### 3-3. 갱신/단축 표기

- "단축": 본인이 갱신한 경우, `−X.XX초` 또는 `X.XX초 단축`
- "차이": 비-본인 비교, `+X.XX초` 또는 `X.XX초 차이`

---

## 4. The Ledger entry 구분 규칙

### 4-1. `entry_type` 결정

명시 필드. 자동 추론하려면:

```
if (record.date >= now − 6months) AND (record.rank == 1):
    entry_type = "new_record"   # 갱신
else:
    entry_type = "recovered"    # 발굴
```

다만 *수동 지정 권장*. 6개월 기준은 휴리스틱.

### 4-2. 자동 등재 vs 수동 검토

| 케이스 | 처리 |
|---|---|
| 공식 대회 결과지에서 자동 수집 | `source: "official"` + 자동 등재 |
| 영상/사진 증빙 제보 | `source: "video"\|"photo"` + 위원 검토 후 등재 |
| 본인/익명 제보 | `source: "reporter"` + The Charter §04 절차 |

---

## 5. The Errata 자동 생성

### 5-1. record가 변경될 때마다 자동 errata entry 생성

```typescript
on record_change(old, new):
  errata.push({
    kind: detect_kind(old, new),     // 아래 표 참조
    description: build_description(old, new),
    reporter: trigger.reporter,
    reported_at: now,
    issue_no: current_issue,
    related_record_id: new.id,
  })
```

### 5-2. `kind` 판별 규칙

| 변경 | kind |
|---|---|
| `old == null` AND `new.rank == 1` AND 이전 1위와 시간 단축 | `신기록 신규 등재` |
| `old == null` AND 그 외 | `누락건 신규 등재` |
| `old.time != new.time` | `기록오류 정정` |
| `old.event_key != new.event_key` | `종목오류 정정` |
| `old.date != new.date` | `날짜오류 정정` |
| `old.athlete.name != new.athlete.name` 또는 `name_hanja` 변경 | `이름오류 정정` |
| `old.rank != new.rank` (다른 변경 없이) | `순위오류 정정` |
| `new == null` (삭제) | `오류건 삭제` |
| 그 외 | `기타오류 정정` |

### 5-3. `description` 정형 패턴 — 9가지 분류별 자동 생성 규칙

errata entry의 본문(`description`)은 자유 텍스트가 아니라 분류(`kind`)별로 정해진 정형 패턴으로만 생성한다. 변수는 records 테이블의 필드명을 그대로 채워 넣는다.

**공통 변수**
- `{gender}` — "남자" / "여자"
- `{stroke}` — "자유형" / "배영" / "평영" / "접영" / "개인혼영"
- `{distance}` — 정수 (예: 50, 100, 200)
- `{course}` — "LCM" / "SCM"
- `{rank}` — 정수 (해당 시점의 순위)
- `{name}` — 한글 성명 (이름오류 정정 시는 변경 전/후 둘 다)
- `{time}` — 기록 시간 ("00:59.18" 형식)
- `{date}` — ISO 일자 ("2026-05-18")
- `{meet}` — 대회명 (풀네임 또는 짧은 이름 정책에 따라)
- `{venue}` — 경기장명 (있을 때만, 없으면 `, {venue}` 부분 생략)
- `{reason}` — 정정 사유 (제보자가 입력하는 short text)
- `{event_label}` — `{gender} {stroke} {distance}M {course}` 결합 라벨

**마스터즈 entries는 `{gender}` 앞에 `마스터즈 ` 접두 추가** (예: `마스터즈 남자 자유형 50M LCM ...`)

#### 분류별 패턴

**1. 신기록 신규 등재** — 새 한국기록/한국마스터즈기록의 신규 등재
```
{gender} {stroke} {distance}M {course} 1위 {name} {time} 신기록 등재 ({date} {meet}, {venue})
```
예: `남자 평영 100M LCM 1위 김민호 00:59.18 신기록 등재 (2026-05-18 코리아오픈, 김천시시설관리공단실내수영장)`

**2. 누락건 신규 등재** — 기존 누락분의 신규 등재 (1위가 발굴되어도 신기록이 아닌 경우 포함)
```
{gender} {stroke} {distance}M {course} {rank}위 {name} {time} 누락 보완 등재 ({date} {meet}, {venue})
```
예: `남자 평영 50M LCM 1위 김철수 00:27.85 누락 보완 등재 (2023-04-15 충남도민체전, 천안한들문화센터수영장)`

**3. 기록오류 정정** — 시간 값 정정
```
{gender} {stroke} {distance}M {course} {rank}위 {name} {old.time} → {new.time} 정정 ({reason})
```
예: `여자 자유형 200M LCM 5위 박영희 02:01.43 → 02:01.34 정정 (대회 공식 결과지 재확인)`

**4. 종목오류 정정** — 종목 또는 거리/수영장이 잘못 분류된 경우
```
{old.event_label} {old.rank}위 {name} {time} → {new.event_label} {new.rank}위 정정 ({reason})
```
예: `남자 자유형 100M LCM 4위 박상우 00:50.34 → 남자 자유형 100M SCM 1위 정정 (SCM 대회였음)`

**5. 날짜오류 정정** — 기록 작성 일자 정정
```
{gender} {stroke} {distance}M {course} {rank}위 일자 정정 — {old.date} → {new.date}
```
예: `여자 평영 100M LCM 1위 일자 정정 — 2024-08-13 → 2024-08-12`

**6. 이름오류 정정** — 성명 표기 정정 (한자, 영문, 동명이인 분리 등)
```
{gender} {stroke} {distance}M {course} {rank}위 이름 표기 정정 — {old.name} → {new.name} ({reason})
```
예: `마스터즈 남자 자유형 50M LCM 3위 이름 표기 정정 — 김명환(金明煥) → 김명환(金明煥) (동음이의어)`

**7. 순위오류 정정** — 순위만 정정 (시간/이름 그대로)
```
{gender} {stroke} {distance}M {course} {name} {time} {old.rank}위 → {new.rank}위 정정 ({reason})
```
예: `남자 자유형 50M LCM 황선우 00:22.34 5위 → 4위 정정 (직전 4위 기록의 신규 정정에 따른 후순위 재정렬)`

**8. 기타오류 정정** — 도시, 경기장, 대회명 등 기타 필드 정정
```
{gender} {stroke} {distance}M {course} {rank}위 {field_label} 정정 — {old.value} → {new.value} ({context})
```
`{field_label}` 후보: `대회 도시`, `경기장명`, `대회명`, `소속` 등

예: `여자 접영 50M SCM 7위 대회 도시 정정 — 광주 → 대구 (2023 동아대회)`

**9. 오류건 삭제** — 등재 자체를 철회
```
{gender} {stroke} {distance}M {course} {rank}위 {name} {time} 삭제 (사유: {reason})
```
예: `남자 자유형 100M LCM 6위 OOO 00:51.42 삭제 (사유: 비공인 대회 출전 기록으로 확인됨)`

#### 분기 룰 요약

- `old` 값이 있으면 항상 `→` 화살표로 변경 전/후 표시
- `reason`은 항상 괄호 안에 명시. 비어 있으면 괄호 자체 생략
- `venue` 없으면 `, {venue}` 부분 생략 (괄호 닫기는 유지)
- 마스터즈는 `{gender}` 앞에 `마스터즈 ` 접두
- 시간 단축 (개선)인지 시간 추가 (오류 정정)인지의 의미는 표기하지 않음 — `→` 화살표로 사실만 명시

---

## 6. 예외 / 엣지 케이스

| 상황 | 처리 |
|---|---|
| WR 데이터 없는 종목 (예: 마스터즈 일부 카테고리) | WR 줄 생략. KR만 표기 |
| 공동 순위 (동일 시간 2명) | 둘 다 같은 rank 부여, ↑↓는 그 순위의 윗/아래 단일 순위 참조 |
| 이름 동명이인 | `athlete.name + birth_year` 또는 `affiliation` 추가로 구분 |
| 본인이 같은 종목 여러 기록 보유 (Top 10에 2개) | 각각 별도 record. ALSO에는 *다른 event_key*만 노출 |
| 한국기록 직전 보유자가 미상 | `한국신기록 본인 (직전 기록 미상)` |
| 데이터가 부분적 (예: city 누락) | 해당 필드만 `—`로 표기, 그 외 줄은 정상 출력 |

---

## 7. 향후 확장 후보 (현재 v1에서 미적용)

- **시·도 출신 중 순위** — "광주 출신 중 1위"
- **연령대 컨텍스트** — "본인 17세 때 작성"
- **Top 10 평균 대비** — "Top 10 평균 03:45.20 대비 +0.61초"
- **다음 마일스톤** — "다음 1위 진입까지 0.46초", "한국기록까지 2.85초"
- **국가대표 선발선** — 대회별 컷오프 비교 (외부 데이터 필요)
- **국제 시즌 랭킹** — World Aquatics 시즌 랭킹 N위 (외부 API)

---

## 8. 데이터 운영 흐름

```
┌─ 공식 결과지 (PDF/HTML scrape) ─┐
│                                 │
├─ 영상/사진 증빙 (수동 입력) ────┼──→ records 테이블 → The Index 자동 갱신
│                                 │                  └→ The Errata 자동 entry
└─ 본인/익명 제보 (검증 후) ─────┘                  └→ The Ledger 자동 카드 (1주 1회 발행)
                                                       └→ event_meta KR 자동 갱신
```

매월 1일 (또는 매거진 인쇄 cycle):
1. 그 달의 errata entries → `issue_no` 부여 → 인쇄본 부속서로 출력
2. 그 달의 새 records (entry_type별로 분리) → The Ledger 정리 → 인쇄본 출력
3. event_meta의 KR 갱신 분 → 한국기록 갱신 알림

---

*Last revised: 2026-06-02 · v1.0.0*
