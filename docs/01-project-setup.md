# 01. 프로젝트 생성 지침

> 대상: Antigravity IDE AI 코딩 에이전트
> 목적: Moodlist 프로젝트의 폴더 구조, 실행 환경, 서버 골격, 작업 순서(Phase)를 정의한다.
> 관련 문서: `02-ui-guide.md`(화면), `03-feature-guide.md`(기능), `DESIGN.md`(디자인 원본)

---

## 1. 아키텍처 개요

```
[브라우저]                         [Node 서버: server.js]                 [외부 API]
public/index.html  ── POST ──▶  /api/playlist                    ──▶  OpenAI /v1/responses
public/js/*.js     ◀── JSON ──  ├ 입력 검증·속도 제한                   (Structured Outputs)
public/css/*.css                ├ 프롬프트 조립 (prompts/curator-system.md)
                                ├ 응답 파싱·규칙 검증·재시도
                                ├ 곡별 videoId 찾기 (캐시 우선)   ──▶  YouTube Data API v3
                                ├ 검색 링크·전체 재생 URL 생성          search.list
                                └ AI 표지 작업 시작 (백그라운드)  ──▶  OpenAI /v1/images/generations
public/js/cover.js ── GET ──▶  /api/cover/:id  (상태 폴링)
<img>              ── GET ──▶  /covers/:id.webp (data/covers/)

[브라우저] YouTube IFrame Player ◀── 영상 스트리밍 ── youtube-nocookie.com
```

**왜 서버가 필요한가:** 순수 프론트엔드에서 OpenAI·YouTube API를 직접 호출하면 API 키가 개발자 도구에 그대로 노출된다.
그래서 정적 파일 서빙과 API 프록시를 겸하는 **의존성 0개짜리 Node 서버 하나**를 둔다. 여전히 전체 스택은 HTML·CSS·JS다.

---

## 2. 사전 준비

| 항목 | 요구 사항 | 확인 방법 |
|---|---|---|
| Node.js | 22 LTS 이상 | `node -v` |
| OpenAI API 키 | platform.openai.com에서 발급. 텍스트(플레이리스트)와 이미지(표지) 생성에 같은 키 사용 | `.env`에 저장 |
| YouTube Data API 키 | Google Cloud Console → YouTube Data API v3 사용 설정 → API 키 발급 (OAuth 불필요) | `.env`에 저장. 없어도 앱은 동작(검색 링크만 제공) |
| 브라우저 | 최신 Chrome / Safari / Edge | — |

npm 패키지는 설치하지 않는다. `.env` 로딩은 Node 내장 `--env-file` 옵션을 사용한다.

---

## 3. 폴더 구조 (이대로 생성)

```
moodlist/
├─ AGENTS.md                  # 에이전트 규칙 (루트에 둔다)
├─ README.md                  # 사람용 실행 안내
├─ package.json               # scripts만 정의, dependencies 없음
├─ .env.example               # 키 템플릿 (커밋 O)
├─ .env                       # 실제 키 (커밋 X)
├─ .gitignore
├─ server.js                  # 정적 서빙 + /api/playlist 프록시 (진입점)
├─ server/
│  ├─ openai.js               # Responses API 호출, 응답 파싱
│  ├─ schema.js               # Structured Outputs JSON Schema
│  ├─ validate.js             # 플레이리스트 규칙 검증
│  ├─ links.js                # YouTube 검색 링크 생성
│  ├─ rateLimit.js            # IP별 간단한 속도 제한
│  ├─ youtube.js              # YouTube Data API 검색 → videoId, 전체 재생 URL
│  ├─ youtubeCache.js         # videoId 캐시 (메모리 + data/ 파일, 7일)
│  ├─ cover.js                # 표지: 즉시 표지 결정, AI 표지 프롬프트·생성·작업 관리
│  └─ verify.js               # (Phase 8, 선택) 곡 실존 확인
├─ data/                      # 실행 중 생성되는 파일 (커밋 X)
│  ├─ youtube-cache.json
│  └─ covers/                 # AI 표지 이미지 <id>.webp
├─ prompts/
│  └─ curator-system.md       # 시스템 프롬프트 (큐레이터 지침)
├─ public/
│  ├─ index.html
│  ├─ css/
│  │  ├─ tokens.css           # 디자인 토큰 (CSS 변수)
│  │  ├─ base.css             # 리셋, 타이포, 공통
│  │  └─ components.css       # 컴포넌트 스타일
│  └─ js/
│     ├─ main.js              # 진입점, 이벤트 바인딩
│     ├─ api.js               # /api/playlist 호출
│     ├─ state.js             # 화면 상태 관리
│     ├─ render.js            # DOM 렌더링 (textContent만 사용)
│     ├─ cover.js             # 표지 렌더(콜라주/글자/AI), AI 표지 폴링·교체
│     ├─ player.js            # YouTube 플레이어: 표지=전체 재생, 곡명=한 곡 재생, 미니 플레이어
│     └─ storage.js           # localStorage 기록
├─ tests/
│  ├─ validate.test.js
│  ├─ links.test.js
│  ├─ youtube.test.js
│  └─ cover.test.js
└─ docs/
   ├─ 01-project-setup.md     # (이 문서)
   ├─ 02-ui-guide.md
   ├─ 03-feature-guide.md
   └─ DESIGN.md               # 사용자가 제공한 Apple 디자인 분석 원본
```

> **Antigravity 참고:** 루트의 `AGENTS.md`만 규칙(Rules)으로 자동 로드된다. `docs/` 문서는 규칙 파일이 아니므로
> 용량 제한(규칙 파일당 약 24,000바이트)에 걸리지 않으며, 에이전트가 필요할 때 직접 열어 읽는다.
> 문서를 `.agents/rules/`로 옮기거나 `@` 참조로 규칙에 포함시키지 않는다 — 한글은 글자당 3바이트라 제한을 쉽게 넘는다.

---

## 4. 초기 파일 내용

### 4.1 `package.json`
```json
{
  "name": "moodlist",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "engines": { "node": ">=22" },
  "scripts": {
    "dev": "node --env-file=.env --watch server.js",
    "start": "node --env-file=.env server.js",
    "test": "node --test tests/"
  }
}
```

### 4.2 `.env.example`
```dotenv
# OpenAI
OPENAI_API_KEY=sk-여기에-키를-넣으세요
OPENAI_MODEL=gpt-5.6

# YouTube (비워두면 플레이어·전체 재생 없이 검색 링크만 제공)
YOUTUBE_API_KEY=

# 서버
PORT=3000
REQUEST_TIMEOUT_MS=45000
RATE_LIMIT_PER_MINUTE=10

# 표지
COVER_MODE=auto                 # auto(콜라주→AI 교체) | ai(글자→AI 교체) | collage(AI 안 씀)
OPENAI_IMAGE_MODEL=gpt-image-2  # 계정에서 쓸 수 있는 최신 GPT Image 모델로 교체 가능
COVER_QUALITY=medium            # low | medium | high
COVER_DAILY_LIMIT=30            # 하루 AI 표지 생성 최대 장수 (비용 보호)

# (선택) Phase 8 곡 실존 확인
VERIFY_TRACKS=false
```

### 4.3 `.gitignore`
```gitignore
.env
data/
node_modules/
.DS_Store
*.log
```

### 4.4 `server.js` 골격 요구 사항
에이전트는 아래 요구 사항을 만족하도록 `server.js`를 작성한다. (세부 로직은 `03-feature-guide.md`)

- `node:http`, `node:fs/promises`, `node:path`, `node:url`만 사용한다.
- `node:http`의 응답에서 `data/youtube-cache.json` 같은 내부 파일이 절대 서빙되지 않도록 정적 경로는 `public/`으로만 한정한다.
- 시작 시 `OPENAI_API_KEY`가 없으면 **명확한 한국어 오류 메시지를 출력하고 종료**한다.
- 시작 시 `YOUTUBE_API_KEY`가 없으면 **경고만 출력하고 계속 실행**한다 ("YouTube 연동 꺼짐: 검색 링크만 제공").
- 라우팅
  - `POST /api/playlist` → 플레이리스트 생성/수정 (+ YouTube videoId 연결)
  - `GET /api/cover/:id` → AI 표지 상태 (`pending` / `ready` / `failed`). 이미지를 새로 만들지 않음
  - `GET /covers/:id.webp` → `data/covers/`의 표지 파일만 서빙 (id는 `/^[a-f0-9]{16}$/`)
  - `POST /api/youtube/resolve` → 기록 복원 시 videoId 다시 찾기 (`03-feature-guide.md` 2.6)
  - `GET /api/health` → `{ "ok": true, "model": "<OPENAI_MODEL>", "youtube": true|false }` (키는 절대 포함 금지)
  - 그 외 `GET` → `public/` 정적 파일. `/`는 `index.html`
- 정적 서빙 보안
  - `path.normalize` 후 결과 경로가 `public/` 밖이면 **403** (경로 탐색 방지)
  - MIME 맵: `.html .css .js .svg .png .ico .json .woff2`
  - 응답 헤더: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`
    (⚠️ `same-origin`·`no-referrer` 금지 — YouTube 플레이어가 Referer를 받지 못하면 오류 153으로 재생이 막힌다)
  - CSP (YouTube 플레이어·썸네일 허용):
    ```
    default-src 'self';
    script-src 'self' https://www.youtube.com https://s.ytimg.com;
    frame-src https://www.youtube-nocookie.com https://www.youtube.com;
    img-src 'self' data: https://i.ytimg.com;
    style-src 'self' https://cdn.jsdelivr.net;
    font-src 'self' https://cdn.jsdelivr.net;
    connect-src 'self'
    ```
    플레이어가 CSP 때문에 막히면 브라우저 콘솔의 차단 메시지를 보고 **필요한 YouTube 도메인만** 추가한다 (`*` 허용 금지).
- 요청 본문 최대 **8KB**, 초과 시 413.
- 모든 오류 응답 형식: `{ "error": { "code": "STRING", "message": "한국어 메시지" } }`

### 4.5 `README.md` 필수 항목
1. 설치: `cp .env.example .env` 후 OpenAI 키 입력, YouTube Data API 키 발급 방법과 하루 사용 한도 안내
2. 실행: `npm run dev` → `http://localhost:3000`
3. 테스트: `npm test`
4. 보안 안내: `.env`를 커밋하지 말 것, 배포 시 호스팅 서비스의 환경변수 기능 사용

---

## 5. 작업 순서 (Phase)

에이전트는 **Phase 단위로** 구현하고, 각 Phase의 완료 조건을 모두 만족한 뒤 다음으로 넘어간다.

### Phase 0 — 스캐폴딩
- 3장의 폴더·파일 생성, 4장 내용 반영, `docs/DESIGN.md` 위치 확인
- **완료 조건:** `npm start` 시 키가 없으면 안내 후 종료, 키가 있으면 `GET /api/health` 200

### Phase 1 — 서버 프록시 + 프롬프트
- `server/openai.js`, `schema.js`, `validate.js`, `links.js`, `rateLimit.js` 구현
- `prompts/curator-system.md` 로딩 (서버 시작 시 1회 읽어 메모리에 캐시)
- **완료 조건:** `curl -X POST localhost:3000/api/playlist -H 'Content-Type: application/json' -d '{"mood":"비 오는 밤 드라이브"}'` 결과가 10곡 JSON, 링크가 모두 검색 링크 형식

### Phase 2 — 정적 UI (다크 모드, 목업 데이터)
- `02-ui-guide.md` 기준으로 `index.html` + CSS 3종 구현. **처음부터 다크 토큰만 사용**
- `render.js`에 **하드코딩된 목업 JSON**으로 결과 화면을 먼저 그린다 (API 연결 전). 표지는 글자 표지, 미니 플레이어는 16:9 빈 블록
- **완료 조건:** 6가지 화면 상태(대기·로딩·되묻기·결과·오류·수정 중)를 목업으로 모두 확인, 표지 아래 곡 목록이 1~10번 순서대로, 5개 브레이크포인트에서 레이아웃 깨짐 없음, 밝은 배경 0곳

### Phase 3 — 연동
- `api.js`, `state.js`, `main.js`로 실제 API 연결, 목업 제거
- **완료 조건:** 입력 → 로딩 → 결과 흐름 동작, 모호한 입력("아무거나") 시 되묻기 화면 표시

### Phase 4 — YouTube 연결 + 재생
- 서버: `server/youtube.js`, `youtubeCache.js`, `/api/youtube/resolve` (`03-feature-guide.md` 6장)
- 클라이언트: `player.js`, 미니 플레이어, 표지 클릭 = 전체 재생, 곡명 클릭 = 그 곡만 재생 (`03-feature-guide.md` 8장)
- **완료 조건:** 표지를 누르면 1번부터 이어서 재생, 곡명을 누르면 그 곡만 재생 후 정지, "YouTube에서 열기"가 목록을 열고, `YOUTUBE_API_KEY`를 지우면 검색 링크만으로 정상 동작

### Phase 5 — 플레이리스트 표지
- 서버: `server/cover.js`, `/api/cover/:id`, `/covers/:id.webp` (`03-feature-guide.md` 7장)
- 클라이언트: `cover.js` — 콜라주/글자 표지 즉시 표시, AI 표지 폴링 후 교체
- **완료 조건:** 결과 즉시 콜라주 표지, 잠시 뒤 AI 표지로 교체, `COVER_MODE=collage`면 이미지 생성 호출 0회, 생성 실패·한도 초과 시 오류 없이 기존 표지 유지

### Phase 6 — 수정 요청 + 기록
- 하단 고정 바에서 "더 신나게", "K-POP만" 등 수정 요청 → 나머지 조건 유지한 채 재생성, 표지·목록 교체 (재생은 끊지 않음)
- `storage.js`로 최근 10개 기록 저장/불러오기 (videoId·표지 URL 포함), JSON·링크 복사 버튼
- **완료 조건:** 수정 요청 후 요청 외 조건 유지, 새로고침 후 기록에서 표지와 함께 바로 재생 가능

### Phase 7 — 품질 점검
- `npm test` 통과, `03-feature-guide.md` 13장 수동 테스트 시나리오 전부 수행
- Lighthouse 접근성 90점 이상, 콘솔 오류 0개 (YouTube iframe 내부 경고는 제외)
- `public/` 전체에서 `sk-`, `AIza`, `api.openai.com`, `googleapis.com` 문자열 검색 결과 0건

### Phase 8 — (선택) 곡 실존 확인
- `VERIFY_TRACKS=true`일 때만 동작. 세부 사항은 `03-feature-guide.md` 11장
- **완료 조건:** 확인 실패 곡이 교체되거나 "확인 필요" 표시됨, 끄면 기존 동작과 동일

---

## 6. 코딩 규칙

| 항목 | 규칙 |
|---|---|
| 모듈 | 서버·클라이언트 모두 ES Module (`import`/`export`) |
| 비동기 | `async/await`, 모든 `fetch`에 타임아웃(`AbortSignal.timeout`) |
| 오류 처리 | 서버는 예외를 삼키지 말고 오류 코드로 변환, 스택 트레이스를 클라이언트에 보내지 않음 |
| DOM | `document.createElement` + `textContent`. 템플릿은 `<template>` 요소 사용 |
| CSS | 값은 반드시 `tokens.css`의 변수로. 하드코딩된 hex 금지 (토큰 정의 파일 제외) |
| 로그 | 서버 로그에 사용자 입력 전문·API 키 출력 금지. 요청 ID, 소요 시간, 오류 코드만 |
| 파일 크기 | 한 파일 300줄을 넘으면 분리 검토 |

---

## 7. 배포 메모 (참고)
- 정적 파일 + Node 서버이므로 Render, Railway, Fly.io 등 Node 호스팅에 그대로 올릴 수 있다.
- 서버리스(Vercel/Netlify Functions, Cloudflare Workers)로 옮길 경우 `/api/playlist` 핸들러만 이식하고 `public/`은 정적 호스팅한다. 이 경우에도 키는 플랫폼 환경변수에만 둔다.
- 공개 배포 시 속도 제한 값을 낮추고, OpenAI 대시보드에서 프로젝트별 사용 한도를 설정하도록 README에 안내한다.
- YouTube Data API는 `search.list` 하루 기본 한도가 작아(약 100회 = 플레이리스트 약 10개, 캐시 적중분 제외) 공개 서비스에는 부족하다. 사용자가 늘면 Google의 할당량 확장 신청이 필요하다는 점을 README에 적는다.
- 서버리스로 옮기면 파일 캐시(`data/`)를 쓸 수 없으므로 캐시는 KV 저장소, 표지 이미지는 객체 저장소(S3·R2 등)로 바꾼다. AI 표지 작업도 응답 뒤 계속 실행돼야 하므로 백그라운드 작업 기능이 있는 플랫폼을 고른다.
- AI 표지는 장당 비용이 든다. `COVER_DAILY_LIMIT`와 OpenAI 대시보드 사용 한도를 함께 설정하도록 README에 안내한다.
