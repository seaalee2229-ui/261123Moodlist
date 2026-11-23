# 02. UI 구현 지침 (다크 모드)

> 대상: Antigravity IDE AI 코딩 에이전트
> 원본 디자인: `docs/DESIGN.md` (Apple 디자인 분석). 이 문서는 그 시스템을 **다크 모드 전용 플레이리스트 앱**으로 옮기는 방법을 정한다.
> 충돌 시 우선순위: **이 문서 > DESIGN.md** (다크 변형·한국어 타이포·표지·YouTube 플레이어처럼 앱에 맞춘 조정이 여기 있음)

---

## 1. 디자인 원칙 — "어두운 극장, 표지가 주인공"

DESIGN.md의 어두운 타일(`surface-tile-*`, `surface-black`) 언어를 **앱 전체에 확장**한다. 밝은 면은 쓰지 않는다.

| DESIGN.md 원칙 | Moodlist 다크 적용 |
|---|---|
| 제품 사진이 주인공, UI는 물러난다 | **플레이리스트 표지**가 주인공. 표지 아래로 곡 목록이 조용히 이어진다 |
| 가운데 정렬 스택: 이름 → 태그라인 → CTA → 제품 이미지 | 결과 화면도 가운데 정렬 스택: **표지 → 제목 → 소개 → 재생 버튼 → 곡 목록** |
| 밝은 타일 ↔ 어두운 타일 교차, 색 전환이 곧 구분선 | **검정(#000) ↔ 근흑(#272729)** 교차 |
| 상호작용 색은 하나 | 채운 버튼 배경은 `#0066cc`, 링크·포커스·선택·재생 중 표시는 `#2997ff` (DESIGN.md의 다크 면 규칙) |
| 그림자는 제품 이미지에만 | 다크 면에서는 그림자가 보이지 않으므로 **그림자 0개** |
| 그라디언트 없음 | 배경·버튼·스켈레톤 모두 단색 |
| pill = 행동, 8px = 유틸리티, 18px = 카드 | 3장 컴포넌트 표의 radius를 그대로 따른다 |

**다크 모드 고정:** `prefers-color-scheme`와 관계없이 항상 다크. 밝은 테마 전환 기능은 만들지 않는다.
`:root { color-scheme: dark; }`, `<meta name="theme-color" content="#000000">`.

**다크 변형 색 규칙:** DESIGN.md에는 다크 모드 카드 토큰이 없다(Known Gaps). 새 hex를 만들지 않고 **기존 hex에 알파만 바꿔** 파생한다.

**브랜드 주의:** Apple 로고, "Apple" 문구, SF Pro 폰트 파일 번들, Apple 제품 이미지 사용 금지.
워드마크는 텍스트 "Moodlist"(`.t-tagline`, 흰색). YouTube 로고를 그리거나 변형하지 않는다 — 텍스트 "YouTube"만 쓴다.

---

## 2. 디자인 토큰 (`public/css/tokens.css`)

아래 블록을 **그대로** `tokens.css`에 넣는다. 다른 CSS 파일에서는 hex를 쓰지 않고 이 변수만 참조한다.

```css
:root {
  color-scheme: dark;

  /* ── Accent (DESIGN.md: primary / primary-on-dark) ── */
  --color-action: #0066cc;            /* 채운 버튼 배경 (흰 글자 대비 5.6:1) */
  --color-link: #2997ff;              /* 링크, 포커스 링, 선택 테두리, 재생 중 표시 */

  /* ── Surface (어두운 순서: bg < tile-3 < field < tile-1 < tile-2) ── */
  --color-bg: #000000;                /* 페이지 기본, 입력 타일 */
  --color-tile-3: #252527;            /* 푸터 */
  --color-field: #1d1d1f;             /* 입력창, 칩 배경 (DESIGN.md ink를 면으로 사용) */
  --color-tile-1: #272729;            /* 결과 타일 */
  --color-tile-2: #2a2a2c;            /* 미니 플레이어, 글자 표지 배경 */
  --color-frosted: rgba(29, 29, 31, 0.72);   /* 서브내비·스티키 바·미니 플레이어 (ink 72%) */
  --color-nav: rgba(0, 0, 0, 0.8);           /* 글로벌 내비 */

  /* ── Text ── */
  --color-text: #ffffff;              /* 기본 */
  --color-text-2: #cccccc;            /* 보조 (DESIGN.md body-muted) */
  --color-text-3: #7a7a7a;            /* 21px 이상 큰 글자 또는 장식 숫자에만 */

  /* ── Lines (흰색 알파 파생) ── */
  --color-line: rgba(255, 255, 255, 0.08);        /* 목록 구분선, 테두리 */
  --color-line-strong: rgba(255, 255, 255, 0.16); /* 입력창·칩 테두리 */
  --color-fill-subtle: rgba(255, 255, 255, 0.12); /* 분위기 태그, 아이콘 버튼 */
  --color-fill-dim: rgba(255, 255, 255, 0.24);    /* 에너지 빈 칸 */
  --color-scrim: rgba(0, 0, 0, 0.56);             /* 표지 위 재생 배지 배경 (유일한 이미지 위 요소) */

  /* ── Typography ── */
  --font-base: system-ui, -apple-system, BlinkMacSystemFont, "Pretendard Variable", Pretendard,
               "Apple SD Gothic Neo", "Noto Sans KR", "Inter", sans-serif;

  /* ── Radius ── */
  --radius-sm: 8px;
  --radius-md: 11px;
  --radius-lg: 18px;
  --radius-pill: 9999px;

  /* ── Spacing ── */
  --space-xxs: 4px;  --space-xs: 8px;   --space-sm: 12px;  --space-md: 17px;
  --space-lg: 24px;  --space-xl: 32px;  --space-xxl: 48px; --space-section: 80px;

  /* ── Layout ── */
  --nav-height: 44px;
  --subnav-height: 52px;
  --stickybar-height: 64px;
  --content-narrow: 980px;
  --content-album: 720px;             /* 결과 화면 가운데 열 */
  --cover-size: min(480px, 100%);

  /* ── Motion / Effect ── */
  --ease-standard: cubic-bezier(0.28, 0.11, 0.32, 1);
  --duration-fast: 160ms;
  --duration-base: 400ms;
  --blur-frosted: saturate(180%) blur(20px);
}
```

### 2.1 대비 기준 (토큰만 쓰면 자동 충족)
| 조합 | 용도 | 기준 |
|---|---|---|
| `--color-text` on 모든 면 | 본문, 곡명 | AA 이상 |
| `--color-text-2` on `--color-tile-1` | 아티스트, 추천 이유 | AA |
| `--color-link` on `--color-tile-1`/`bg` | 링크, 재생 중 곡명 | AA |
| `--color-text-3` | **21px 이상 또는 장식용만** (트랙 번호) | 큰 글자 AA. 14px 본문에 쓰지 않는다 |

### 2.2 타이포그래피 유틸리티 클래스 (`base.css`)

한국어는 라틴 문자보다 자간을 덜 좁혀야 읽기 좋으므로 DESIGN.md의 px 자간을 **em 단위로 환산**한다.
`body`에 `-webkit-font-smoothing: antialiased;` 적용 (다크 면의 흰 글자가 굵어 보이는 현상 완화).

| 클래스 | 크기 / 굵기 / 행간 | 자간 | 용도 |
|---|---|---|---|
| `.t-hero` | 56px / 600 / 1.1 | -0.02em | 첫 화면 헤드라인 |
| `.t-display-lg` | 40px / 600 / 1.15 | -0.015em | 플레이리스트 제목 |
| `.t-display-md` | 34px / 600 / 1.25 | -0.01em | 글자 표지의 제목 |
| `.t-lead` | 28px / 400 / 1.3 | 0 | 히어로 부제 |
| `.t-lead-airy` | 24px / 300 / 1.5 | 0 | 되묻기 질문, 플레이리스트 소개 |
| `.t-tagline` | 21px / 600 / 1.19 | 0 | 서브내비 제목, 트랙 번호 |
| `.t-body-strong` | 17px / 600 / 1.35 | -0.01em | 곡명 |
| `.t-body` | 17px / 400 / 1.55 | -0.01em | 아티스트, 본문, 버튼 |
| `.t-caption` | 14px / 400 / 1.5 | -0.01em | 추천 이유, 칩 |
| `.t-caption-strong` | 14px / 600 / 1.4 | -0.01em | "재생 중", 라벨 |
| `.t-fine` | 12px / 400 / 1.4 | 0 | 표지 출처 표기, 푸터 |

**한국어 조정 규칙 (필수)**
- 본문 행간 **1.55**
- 모든 텍스트에 `word-break: keep-all; overflow-wrap: anywhere;`
- 굵기는 **300 / 400 / 600** 만. 500·700 금지
- 본문은 반드시 **17px**
- Pretendard는 `index.html`에서 CDN으로 불러온다:
  ```html
  <link rel="stylesheet"
    href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">
  ```

---

## 3. 컴포넌트 명세 (`components.css`)

괄호 안은 DESIGN.md 원본 컴포넌트 이름이다. **클래스명은 표를 그대로 사용**한다.

| 클래스 | 원본 | 배경 / 글자 / 테두리 | Radius | 패딩·크기 | 설명 |
|---|---|---|---|---|---|
| `.global-nav` | global-nav | `--color-nav` + blur / text | 0 | 높이 44px, fixed | 좌측 워드마크, 우측 "기록" 텍스트 버튼 |
| `.sub-nav` | sub-nav-frosted | `--color-frosted` + blur / text, 하단 1px line | 0 | 높이 52px, sticky | 좌측 "플레이리스트", 우측 `.btn-primary` "새로 만들기" |
| `.tile` | product-tile-dark* | 수정자 `--black`(bg), `--dark`(tile-1) | 0 | 상하 80px | 전폭 섹션. 타일 사이 간격 0 |
| `.btn-primary` | button-primary | action / text | pill | 11px 22px | "추천받기", "▶ 전체 재생", "다시 만들기" |
| `.btn-secondary` | button-secondary-pill | 투명 / link, 1px link 테두리 | pill | 11px 22px | "YouTube에서 열기 ↗", "다시 시도" |
| `.btn-capsule` | button-pearl-capsule (다크 변형) | field / text-2, 1px line-strong | 11px | 8px 14px | "링크 복사", "JSON 복사", "기록 삭제" |
| `.btn-icon` | button-icon-circular | fill-subtle / text | 50% | 44×44px | 닫기(✕), 미니 플레이어 일시정지 |
| `.mood-input` | search-input | field / text, 1px line-strong, placeholder text-3 | pill → 18px* | 12px 20px, 최소 높이 52px | 분위기 입력창 |
| `.chip` | configurator-option-chip | field / text, 1px line-strong | pill | 12px 16px | 예시 문장, 언어 선택, 수정 요청 |
| `.chip[aria-checked="true"]` | …-selected | 동일 + **2px link 테두리** | pill | 두께 차이는 padding으로 보정 | 선택 상태 |
| `.tag` | (신규) | fill-subtle / text | **8px** | 4px 10px | 분위기 태그. 클릭 불가이므로 pill 금지 |
| `.cover` | (신규) 제품 이미지 자리 | tile-2 | 18px, `overflow: hidden` | 1:1, `width: var(--cover-size)` | **플레이리스트 표지 = 전체 재생 버튼** (3.3) |
| `.tracklist` | footer dense-link 목록 (변형) | 투명 | 0 | 행마다 하단 1px line | **표지 아래 곡 목록** (3.4) |
| `.mini-player` | floating-sticky-bar (변형) | `--color-frosted` + blur, 1px line | 18px | 3.5 참고 | 재생이 시작되면 나타나는 YouTube 플레이어 |
| `.sticky-bar` | floating-sticky-bar | `--color-frosted` + blur, 상단 1px line | 0 | 높이 64px, 12px 32px | 결과 화면 하단 수정 요청 바 |
| `.link` | text-link-on-dark | 투명 / link | — | — | "YouTube에서 검색 ↗" |
| `.footer` | footer (다크 변형) | tile-3 / text-2 | 0 | 상하 64px | 안내 문구, 출처 표기 |

\* 입력창은 한 줄일 때 pill, 여러 줄로 늘어나면(`data-multiline`) 18px.

### 3.1 공통 상호작용
- **누름:** 모든 버튼·칩·표지·곡 행에 `:active { transform: scale(0.95); }` (곡 행은 0.98 — 행 전체가 줄어들면 어색함) + `transition: transform var(--duration-fast) var(--ease-standard)`
- **포커스:** `:focus-visible { outline: 2px solid var(--color-link); outline-offset: 2px; }` — `outline: none`만 두는 것 금지
- **호버:** 색 변화 없음. `.link`만 밑줄. (DESIGN.md: 호버를 디자인 요소로 쓰지 않음)
- **비활성:** `opacity: 0.4; cursor: not-allowed;`
- 터치 타깃 최소 **44×44px** (곡 행은 최소 높이 64px)

### 3.2 에너지 표시 `.energy-meter`
- 점 5개(지름 10px, 간격 6px, 원형). 채운 점 `--color-text`, 빈 점 `--color-fill-dim`
- 옆에 `에너지 2 / 5` (`.t-caption`, `--color-text-2`)
- `role="img"` + `aria-label="에너지 5단계 중 2"`. **파랑 금지**

### 3.3 표지 `.cover` — 클릭하면 플레이리스트 전체 재생

```html
<figure class="cover-block">
  <button class="cover" type="button" aria-label="빗길 위의 새벽 전체 재생">
    <!-- 표지 종류에 따라 아래 셋 중 하나 -->
    <img class="cover__image" src="/covers/ab12cd34.webp" alt="" width="1024" height="1024">
    <!-- 또는 <div class="cover__collage"> <img>×4 </div> -->
    <!-- 또는 <div class="cover__text"> 제목 </div> -->
    <span class="cover__badge" aria-hidden="true">▶</span>
  </button>
  <figcaption class="cover__source t-fine">AI가 만든 표지</figcaption>
</figure>
```

**표지 종류 (서버가 정하고 클라이언트가 그림, `03-feature-guide.md` 7장)**
| 종류 | 표시 | 출처 표기(`figcaption`) |
|---|---|---|
| `ai` | OpenAI로 생성한 정사각 이미지, `object-fit: cover` | "AI가 만든 표지" |
| `collage` | 수록곡 YouTube 썸네일 4장을 2×2로 배치(각 칸 `object-fit: cover`, 칸 사이 간격 0). 썸네일이 1~3장이면 첫 장 1장을 꽉 채움 | "수록곡 썸네일 · YouTube" |
| `text` | tile-2 배경 + 가운데 제목(`.t-display-md`, 최대 3줄) + 분위기 태그 | 표기 없음 |

- **표지 교체 흐름:** 결과가 뜨면 즉시 `collage`(없으면 `text`)를 보여주고, AI 표지가 준비되면 같은 자리에서 `opacity` 0→1로 겹쳐 바꾼다(`var(--duration-base)`). 생성 중에는 `figcaption`에 "AI 표지를 그리는 중…"
- AI 표지 실패·한도 초과 시 조용히 `collage`/`text`를 유지 (오류 문구 표시 안 함, 콘솔 경고만)
- **재생 배지 `.cover__badge`:** 표지 오른쪽 아래 16px 여백, 지름 56px 원, `--color-scrim` 배경 + 흰색 ▶. 표지 이미지 위에 올라가는 **유일한** 요소. 이미지에 필터·블러·텍스트를 덧씌우지 않는다
- **상태별 배지와 라벨**
  | 상태 | 배지 | `aria-label` |
  |---|---|---|
  | 대기 / 한 곡 모드 | ▶ | "{제목} 전체 재생" |
  | 전체 재생 중 | ❚❚ | "{제목} 일시정지" |
  | 전체 재생 일시정지 | ▶ | "{제목} 이어서 재생" |
- 재생할 수 있는 곡(videoId)이 하나도 없으면 표지는 버튼이 아닌 `<div>`로 렌더하고 배지를 숨긴다
- 스켈레톤: 같은 크기의 tile-2 정사각형

### 3.4 곡 목록 `.tracklist` — 곡명을 누르면 그 곡만 재생

표지 아래, **플레이리스트 순서(no 1→10) 그대로** `<ol>`로 표시한다. 순서를 정렬·셔플하지 않는다.

```
┌─────────────────────────────────────────────────────────┐
│  01   밤편지                                   ↗        │  ← 행 전체가 버튼, ↗는 별도 링크
│       아이유                                            │
│       잔잔한 피아노가 빗소리와 자연스럽게 어울립니다.     │
├─────────────── 1px line ────────────────────────────────┤
│  02   Rainy Days                               ↗        │
│       V                                                 │
│       …                                                 │
└─────────────────────────────────────────────────────────┘
```

```html
<ol class="tracklist">
  <li class="track-row" data-no="1">
    <button class="track-row__play" type="button" aria-label="아이유 - 밤편지 재생">
      <span class="track-row__no t-tagline" aria-hidden="true">01</span>
      <span class="track-row__body">
        <span class="track-row__status t-caption-strong" hidden>재생 중</span>
        <span class="track-row__title t-body-strong">밤편지</span>
        <span class="track-row__artist t-body">아이유</span>
        <span class="track-row__reason t-caption">잔잔한 피아노가 빗소리와 자연스럽게 어울립니다.</span>
      </span>
    </button>
    <a class="track-row__search link" href="https://www.youtube.com/results?search_query=…"
       target="_blank" rel="noopener noreferrer" aria-label="아이유 - 밤편지 YouTube에서 검색 (새 창)">↗</a>
  </li>
</ol>
```
- 레이아웃: `li`는 `display: grid; grid-template-columns: 1fr 44px; align-items: center;` 버튼 내부는 `grid-template-columns: 48px 1fr;`
- 번호 `text-3`, 곡명 `text`, 아티스트 `text-2`, 추천 이유 `text-2`
- **재생 중인 곡:** 곡명 색 `--color-link`, `재생 중` 라벨 표시(파랑), 번호 자리에 ▶ 글리프, `aria-current="true"`. 일시정지 상태면 라벨 "일시정지"
- 재생 중인 곡의 행을 다시 누르면 일시정지/재생 전환
- **영상을 못 찾은 곡**(`videoId: null`): 버튼을 누르면 검색 링크를 새 창으로 연다. 추천 이유 아래 `.t-fine` "YouTube에서 검색해서 들을 수 있어요"
- **여기서 재생할 수 없는 곡**(플레이어 오류): `.t-fine` "여기서는 재생할 수 없어요 · YouTube에서 검색 ↗"
- 행 사이 구분선만 있고 카드 배경·radius 없음 (DESIGN.md의 "dense list" 문법)

### 3.5 미니 플레이어 `.mini-player`

YouTube 정책상 재생 중인 플레이어는 **화면에 보여야 하고 최소 200×200px 이상**이어야 한다. 그래서 표지나 곡을 누르면 화면 하단에 플레이어가 나타난다.

```
                                     ┌──────────────────────────────┐
                                     │ 지금 재생 · 03/10        ❚❚ ✕ │  ← 헤더 44px
                                     │ 밤편지 — 아이유               │
                                     │ ┌──────────────────────────┐ │
                                     │ │  YouTube 플레이어 16:9   │ │  ← 480×270
                                     │ └──────────────────────────┘ │
                                     └──────────────────────────────┘
──────────────────────────── .sticky-bar ─────────────────────────────
```
- **데스크톱(≥ 834px):** `position: fixed; right: 24px; bottom: calc(var(--stickybar-height) + 16px); width: 480px;` 플레이어 영역 480×270
- **모바일(≤ 833px):** 좌우 12px 여백 전폭, 플레이어 높이 `max(230px, calc((100vw - 24px) * 9 / 16))` — 좁은 화면에서도 200px 이상 유지
- 헤더: `.t-caption` "지금 재생 · 03/10"(전체 재생) 또는 "한 곡 재생"(한 곡 모드), 곡명 — 아티스트(`.t-body-strong`, 한 줄 말줄임), `.btn-icon` 일시정지/재생, `.btn-icon` ✕
- ✕ = **정지하고 닫기** (재생은 계속되는데 플레이어만 숨기는 기능은 만들지 않는다)
- 처음 재생할 때 아래에서 위로 등장(`translateY(24px→0)`, `opacity`), 결과 화면을 벗어나도(새로 만들기 등) 정지 전까지 유지
- 미니 플레이어가 열려 있으면 `body`의 하단 여백에 미니 플레이어 높이를 더해 곡 목록 마지막 줄이 가리지 않게 한다 (모바일만)
- 플레이어 위에 다른 요소를 겹치지 않는다

---

## 4. 화면 구성 (단일 페이지)

```
┌ .global-nav (44px, fixed) ─────────────────────────────── 기록 ─┐
├ .sub-nav (52px, sticky) ─────────────────────── [새로 만들기] ─┤
│                                                                │
│ ① 입력 타일  .tile--black                                       │
│    t-hero    "지금, 어떤 음악이 필요하세요?"                       │
│    t-lead    "분위기나 상황을 말하면 10곡을 골라 표지까지 만들어 드릴게요."│
│    [ .mood-input ···························· ] [추천받기]     │
│    언어: (자동) (국내곡) (해외곡)                                │
│    예시: (비 오는 밤 드라이브) (새벽 공부) (주말 카페) (운동 전)   │
│                                                                │
│ ② 결과 타일  .tile--dark   (결과 있을 때만, 가운데 정렬 스택)      │
│                  ┌──────────────────────┐                      │
│                  │                      │                      │
│                  │    .cover  (1:1)     │                      │
│                  │                  (▶) │                      │
│                  └──────────────────────┘                      │
│                       AI가 만든 표지                             │
│                  t-display-lg  빗길 위의 새벽                    │
│          t-lead-airy  빗소리와 함께 천천히 달리는 밤을 위한…        │
│           [차분함][감성]  ●●○○○ 에너지 2/5  잔잔 → 고조 → 여운     │
│        [▶ 전체 재생]  [YouTube에서 열기 ↗]  (링크 복사)            │
│                    10곡 중 9곡을 여기서 재생할 수 있어요            │
│   ───────────────────────────────────────────────              │
│    01  밤편지 · 아이유 · 추천 이유                       ↗       │
│    02  …                                                       │
│    …   (10곡, 순서대로)                                         │
│    10  …                                                       │
│                                            (JSON 복사)          │
│                                                                │
│ ③ .footer (tile-3)                                             │
└ .sticky-bar (하단 고정) ─────────────────────────────────────────┘
   (더 신나게)(더 잔잔하게)(K-POP만)(해외곡만) [직접 입력…] [다시 만들기]
  + .mini-player (재생 시작 후, 스티키 바 위)
```

### 4.1 결과 타일 레이아웃
- 가운데 열 `max-width: var(--content-album)`, 모든 요소 가운데 정렬. **곡 목록만 왼쪽 정렬**
- 간격: 표지 → 출처 표기 12px → 제목 32px → 소개 12px → 태그 줄 24px → 버튼 줄 32px → 연결 상태 12px → 곡 목록 48px
- "▶ 전체 재생"(`.btn-primary`)은 표지 클릭과 **같은 동작**이다 (표지가 버튼이라는 걸 모르는 사용자를 위한 명시적 버튼)
- "YouTube에서 열기 ↗"(`.btn-secondary`)는 YouTube 웹/앱에서 10곡 목록을 새 탭으로 연다
- 연결 상태 문구(`.t-caption`, text-2): `10곡 모두 여기서 재생할 수 있어요` / `10곡 중 9곡을 여기서 재생할 수 있어요` / `오늘 YouTube 연결 한도를 다 썼어요. 곡마다 검색 링크로 들을 수 있어요.`
- YouTube 연결이 꺼진 상태(`youtube.status: "disabled"`)면 표지는 버튼이 아니고, 재생 버튼 두 개를 숨기고, 곡 행은 검색 링크로 동작

### 4.2 반응형 (DESIGN.md 브레이크포인트)

| 폭 | 변경 사항 |
|---|---|
| ≤ 1068px | `.t-hero` 40px |
| ≤ 833px | 미니 플레이어 전폭 하단 배치, 서브내비 우측 버튼만 남김 |
| ≤ 734px | `.tile` 상하 패딩 48px, 표지 `min(360px, 100%)` |
| ≤ 640px | `.t-hero` 34px, `.t-display-lg` 28px, 입력 세로 배치, 재생 버튼 두 개 세로로 전폭, 추천 이유는 2줄 말줄임(`-webkit-line-clamp: 2`) |
| ≤ 419px | `.t-hero` 28px, 예시 칩 2개만 노출, 표지 좌우 여백 20px까지 확장 |

스티키 바 칩 영역: `overflow-x: auto; scrollbar-width: none;` 끝부분 페이드 그라디언트 **금지**.

---

## 5. 화면 상태 (6종) + 재생 상태

`<main data-state="...">`로 화면 상태를, `<body data-playback="...">`로 재생 상태를 따로 관리한다.

| 화면 상태 | 트리거 | 화면 |
|---|---|---|
| `idle` | 첫 진입, "새로 만들기" | ① 입력 타일만. 입력창 자동 포커스 |
| `loading` | 추천받기 클릭 | 버튼 "만드는 중…" + `disabled`. ② 자리에 스켈레톤(정사각 표지 + 제목 줄 2개 + 곡 행 10개). 단계 문구 `.t-caption` 3초 간격 순환: "분위기를 읽는 중…" → "곡을 고르는 중…" → "YouTube에서 찾는 중…" |
| `clarify` | `status: "clarify"` | ① 아래 `.tile--dark`: 질문 1~2개(`.t-lead-airy`) + 답변 입력/칩 |
| `result` | `status: "ok"` | ② 결과 타일 + 스티키 바. 표지로 부드럽게 스크롤. AI 표지는 이후 비동기로 교체 |
| `error` | 네트워크·서버 오류 | ① 아래 오류 박스: tile-1 배경, 1px line-strong, 8px radius, ⚠︎ + 메시지 + `.btn-secondary` "다시 시도". **빨간색 금지** |
| `refining` | 스티키 바 "다시 만들기" | 기존 결과 `opacity: 0.5`, 재생 중인 곡은 계속 재생. 완료 시 표지·목록 교체 |

| 재생 상태 `data-playback` | 의미 | 표시 |
|---|---|---|
| `none` | 재생한 적 없음 / 닫음 | 미니 플레이어 없음 |
| `playlist-playing` / `playlist-paused` | 표지·전체 재생으로 시작 | 표지 배지 ❚❚/▶, 현재 곡 행 강조, 끝나면 다음 곡 |
| `single-playing` / `single-paused` | 곡 행으로 시작 | 해당 행만 강조, 표지 배지는 ▶. 곡이 끝나면 정지 (다음 곡으로 넘어가지 않음) |
| `blocked` | 브라우저가 자동 재생을 막음 | 미니 플레이어에 "▶를 한 번 더 눌러 재생을 시작하세요" (`.t-caption`) |

**스켈레톤:** 실제 요소와 같은 크기의 블록, 배경 `--color-tile-2`(검정 면) / `--color-field`(근흑 면). `opacity` 0.5 ↔ 1 펄스(1.2s)만. shimmer 금지.

---

## 6. 모션
- 결과 등장: 타일 `opacity 0→1`, `translateY(16px→0)`, `var(--duration-base) var(--ease-standard)`
- 곡 행 등장: 같은 효과에 `animation-delay: calc(var(--i) * 30ms)`
- AI 표지 교체: 새 이미지 `opacity 0→1` 겹치기 (`var(--duration-base)`)
- 재생 중 행 전환: 색만 `var(--duration-fast)`로 변경. 이퀄라이저·펄스 애니메이션 금지
- `@media (prefers-reduced-motion: reduce)`: transform·animation 제거, 표지는 즉시 교체

---

## 7. 접근성 체크리스트
- [ ] `<html lang="ko">`, 랜드마크(`header` `nav` `main` `footer`)
- [ ] 입력창에 `<label>` (시각적으로 숨길 땐 `.sr-only`)
- [ ] 결과 영역 `aria-live="polite"`, 로딩 중 `aria-busy="true"`
- [ ] 표지 버튼과 곡 버튼은 진짜 `<button>`, 상태에 따라 `aria-label` 갱신 (3.3 표), 재생 중 행 `aria-current="true"`
- [ ] 표지 이미지 `alt=""` (버튼 라벨이 의미를 전달), AI 표지 여부는 `figcaption` 텍스트로 제공
- [ ] 곡 목록은 `<ol>` (순서 의미 보존)
- [ ] 미니 플레이어 iframe에 `title="Moodlist 플레이어"`, 미니 플레이어는 `role="region" aria-label="지금 재생"`
- [ ] 곡이 바뀌면 숨김 `aria-live`에 "지금 재생: 아이유 - 밤편지"
- [ ] 키보드만으로 입력 → 추천 → 표지로 전체 재생 → 곡 하나 재생 → 정지 → 수정 요청 가능. `Space`/`Enter` 둘 다 버튼 동작
- [ ] 토큰 외 색 금지 (2.1 대비 기준 유지)

---

## 8. UI 문구 (고정 카피)

| 위치 | 문구 |
|---|---|
| 히어로 헤드라인 | 지금, 어떤 음악이 필요하세요? |
| 히어로 부제 | 분위기나 상황을 말하면 10곡을 골라 표지까지 만들어 드릴게요. |
| 입력 placeholder | 예: 비 오는 밤에 혼자 드라이브할 때 |
| 주요 버튼 | 추천받기 / 만드는 중… |
| 재생 버튼 | ▶ 전체 재생 / YouTube에서 열기 ↗ |
| 표지 출처 | AI가 만든 표지 / 수록곡 썸네일 · YouTube / AI 표지를 그리는 중… |
| 예시 칩 | 비 오는 밤 드라이브 · 새벽 공부 · 주말 오후 카페 · 운동 전 텐션 업 |
| 수정 칩 | 더 신나게 · 더 잔잔하게 · K-POP만 · 해외곡만 · 다른 곡으로 |
| 미니 플레이어 | 지금 재생 · 03/10 / 한 곡 재생 / ▶를 한 번 더 눌러 재생을 시작하세요 |
| 빈 입력 경고 | 분위기나 상황을 한 줄만 적어주세요. |
| 오류(일반) | 잠시 연결이 원활하지 않아요. 다시 시도해 주세요. |
| 오류(속도 제한) | 요청이 많아요. 1분 뒤에 다시 시도해 주세요. |
| 복사 완료 | 복사했어요 |
| 푸터 안내 | 영상과 썸네일은 YouTube에서 제공됩니다. 곡 추천과 표지는 AI가 만들어 일부 정보가 정확하지 않을 수 있어요. |

---

## 9. 금지 사항 요약
- 밝은 배경(흰색·파치먼트), 라이트 테마 전환 기능
- `box-shadow` / 그라디언트 / 토큰에 없는 hex / 두 번째 강조색
- 전폭 타일에 radius, 타일 사이 margin
- 분위기 태그·에너지 점에 파랑, 비상호작용 요소에 pill
- `font-weight: 500`·`700`, 본문 16px, 14px 본문에 `--color-text-3`
- 곡 목록 순서 변경(정렬·셔플), 곡 목록을 카드 그리드로 표시
- 재생 중인 플레이어를 숨기거나 200×200px보다 작게 만들기, 플레이어 위에 요소 겹치기
- 표지 이미지 위에 재생 배지 외의 텍스트·필터·블러 덧씌우기
- 모델 출력 문자열을 `innerHTML`로 삽입
- Apple 로고·상표·제품 이미지, YouTube 로고 변형
