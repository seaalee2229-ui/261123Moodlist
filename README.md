# Moodlist 🎵

사용자가 입력한 **분위기·상황·감정**을 바탕으로 실존하는 10곡 플레이리스트를 추천하고, Apple 디자인 감성의 다크 모드 앨범 화면 및 AI 커버를 제공하는 웹 애플리케이션입니다.

---

## 1. 사전 준비 및 설치

1. **Node.js**: 22 LTS 이상 필요 (`node -v`로 확인)
2. **환경 변수 파일 생성**:
   ```bash
   cp .env.example .env
   # Windows PowerShell인 경우:
   Copy-Item .env.example .env
   ```
3. **API 키 설정 (`.env`)**:
   - `OPENAI_API_KEY`: 필수. [OpenAI Platform](https://platform.openai.com)에서 발급받은 키를 입력합니다.
   - `YOUTUBE_API_KEY`: 선택. [Google Cloud Console](https://console.cloud.google.com)에서 `YouTube Data API v3`를 활성화한 뒤 발급받은 키를 입력합니다. (키가 없어도 검색 링크를 통해 정상 동작합니다.)
   - **YouTube 할당량 안내**: YouTube Data API의 `search.list`는 기본 무료 할당량이 하루 약 100회(약 10개 플레이리스트 생성 분량)로 제한되어 있습니다. 공개 서비스로 운영 시 Google에 할당량 상향 신청이 필요합니다.
   - **비용 보호**: `COVER_DAILY_LIMIT`(기본 30장) 설정으로 일일 AI 표지 생성 횟수를 제한하여 의도치 않은 API 비용 지출을 방지합니다.

---

## 2. 실행 방법

```bash
# 개발 모드 (파일 변경 자동 감지)
npm run dev

# 일반 실행
npm start
```

서버 실행 후 브라우저에서 `http://localhost:3000`으로 접속합니다.

---

## 3. 테스트 실행

외부 패키지 없이 Node.js 내장 테스트 러너(`node:test`)를 사용합니다.

```bash
npm test
```

---

## 4. 보안 주의사항

- `.env` 파일에는 실제 비밀 키가 포함되므로 Git 저장소에 절대 커밋하지 마세요. (이미 `.gitignore`에 등록되어 있습니다.)
- 배포 환경에서는 호스팅 서비스(Render, Railway, Fly.io 등)의 환경 변수 관리 기능을 사용하세요.
- 브라우저 클라이언트(`public/`)에는 어떠한 API 키도 노출되지 않으며, 모든 외부 API 호출은 Node 프록시 서버(`server.js`)를 거쳐 안전하게 수행됩니다.
