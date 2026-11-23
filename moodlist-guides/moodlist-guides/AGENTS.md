# AGENTS.md — Moodlist (분위기 기반 플레이리스트 추천 웹앱)

> 이 파일은 Antigravity 에이전트가 **매 작업마다 자동으로 읽는 워크스페이스 규칙**이다.
> 상세 지침은 `docs/` 아래 문서에 있으며, 작업 단계에 맞는 문서를 **작업 시작 전에 반드시 읽는다.**

## 1. 프로젝트 한 줄 요약
사용자가 입력한 **분위기·상황·감정**을 OpenAI API로 분석해 **실존 곡 10곡** 플레이리스트를 만든다.
화면은 Apple 디자인 언어(DESIGN.md)를 **다크 모드 전용**으로 옮긴 앨범 페이지 형태다:
**표지**(수록곡 썸네일 콜라주 → OpenAI로 생성한 AI 표지로 교체)가 맨 위에 있고, 그 아래에 **곡명·아티스트가 플레이리스트 순서대로** 나온다.
**표지를 누르면 전체 재생, 곡명을 누르면 그 곡만 재생**된다 (YouTube). HTML·CSS·JS 웹앱.

## 2. 어떤 문서를 언제 읽는가
| 작업 | 먼저 읽을 문서 |
|---|---|
| 폴더 생성, 환경 설정, 서버 골격, 작업 순서 | `docs/01-project-setup.md` |
| 화면, 표지, 곡 목록, 미니 플레이어, 다크 토큰, 반응형, 접근성 | `docs/02-ui-guide.md` + `docs/DESIGN.md` |
| OpenAI 연동, API 계약, 검증, 수정 요청, 기록 | `docs/03-feature-guide.md` + `prompts/curator-system.md` |
| YouTube 검색·캐시 | `docs/03-feature-guide.md` 6장 |
| 표지 생성(콜라주·AI) | `docs/03-feature-guide.md` 7장 |
| 재생(표지=전체, 곡명=한 곡) | `docs/03-feature-guide.md` 8장 |

## 3. 절대 규칙 (10개, 어기면 작업 실패로 간주)
1. **API 키는 브라우저에 절대 노출하지 않는다.** OpenAI(텍스트·이미지)·YouTube Data API 호출은 `server.js`(Node 프록시)에서만 한다. `public/` 안의 어떤 파일에도 키·`api.openai.com`·`googleapis.com` 호출이 있으면 안 된다. (브라우저는 YouTube IFrame 플레이어·썸네일과 자기 서버의 `/covers/`만 직접 불러온다.)
2. **프레임워크·번들러 금지.** 프론트는 순수 HTML + CSS + ES Module JS, 서버는 Node.js 내장 모듈만 쓴다. npm 패키지 추가는 사용자 승인 후에만.
3. **모델 출력은 신뢰하지 않는다.** 서버에서 스키마·곡 수·아티스트 중복·에너지 범위를 다시 검증하고, 화면에는 `textContent`로만 넣는다(`innerHTML`에 모델 출력 금지).
4. **링크·영상 ID는 코드로 만든다.** 곡별 `link`는 `https://www.youtube.com/results?search_query=아티스트+곡명` 검색 링크만 허용. 재생용 `videoId`는 **YouTube Data API 검색 결과에서 얻은 값만** 쓴다. 모델이 만든 URL·ID는 절대 쓰지 않는다.
5. **곡 목록은 플레이리스트 순서(no 1→10) 그대로 표시한다.** 정렬·셔플·카드 그리드 금지.
6. **표지 이미지 규칙:** AI 표지 프롬프트는 서버의 고정 틀 안에 모델의 `coverConcept`만 넣어 만든다. 이미지에 글자·로고·실존 인물·뮤지션 닮은꼴·기존 앨범 아트를 넣지 않는다. 클라이언트가 임의 프롬프트로 이미지를 만들게 하는 엔드포인트를 만들지 않는다. 생성은 비동기로 하고 일일 한도를 둔다.
7. **가사 원문을 화면·프롬프트·예시 데이터에 넣지 않는다.**
8. **다크 모드 전용, 토큰 외 색·그림자·그라디언트 금지.** 밝은 배경을 만들지 않는다. 채운 버튼은 `#0066cc`, 링크·포커스·선택·재생 중 표시는 `#2997ff`, 그 외 강조색 없음. 그림자 0개.
9. **외부 연동 실패가 앱을 멈추게 하지 않는다.** YouTube 키 없음·한도 초과 → 검색 링크로 대체. AI 표지 실패·한도 초과 → 콜라주/글자 표지 유지. 재생 중인 YouTube 플레이어는 **항상 보이게(200×200px 이상)** 두고, 페이지를 열자마자 소리가 나는 자동 재생은 하지 않는다.
10. **브랜드·언어:** Apple 로고·상표·제품 사진, YouTube 로고 변형 금지 (워드마크는 텍스트 "Moodlist"). UI 문구와 AI 생성 텍스트는 **한국어**, 곡명·아티스트명은 **공식 표기 그대로**.

## 4. 기술 스택 고정값
- Node.js **22 LTS 이상** (`--env-file`, 내장 `fetch`, `node --test` 사용)
- OpenAI **Responses API** (`POST /v1/responses`) + **Structured Outputs** (`text.format: json_schema, strict: true`) — 모델 `OPENAI_MODEL` (기본 `gpt-5.6`)
- OpenAI **Images API** (`POST /v1/images/generations`) — 모델 `OPENAI_IMAGE_MODEL` (기본 `gpt-image-2`), 1024×1024 webp
- YouTube: **Data API v3 `search.list`**(서버, API 키) + **IFrame Player API**(브라우저, `youtube-nocookie.com`). 하루 검색 한도가 작으므로 videoId 캐시 필수
- 모델명은 코드에 하드코딩하지 않는다 (환경변수로만)

## 5. 작업 방식
- 큰 작업은 **계획(Plan) → 사용자 확인 → 구현** 순서로 진행한다. 계획에는 바꿀 파일 목록을 적는다.
- 한 번에 **한 단계(Phase)** 만 구현하고, 단계 끝마다 `docs/01-project-setup.md`의 "완료 조건"을 확인한다.
- 코드 주석·커밋 메시지는 한국어로 써도 된다. 변수·함수명은 영어 camelCase.
- 불확실한 사양은 추측하지 말고 문서의 해당 절을 다시 읽은 뒤, 그래도 없으면 사용자에게 묻는다.
