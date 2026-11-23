import http from "node:http";
import fs from "node:fs/promises";
import { createReadStream, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { checkRateLimit, AppError } from "./server/rateLimit.js";
import { buildUserMessage, callOpenAI } from "./server/openai.js";
import { validatePlaylistResponse, sanitizeCoverConcept } from "./server/validate.js";
import { buildSearchLink } from "./server/links.js";
import { attachYouTube, findVideoId } from "./server/youtube.js";
import { loadCache } from "./server/youtubeCache.js";
import { pickInstantCover, startCoverJob, getCoverJob } from "./server/cover.js";
import { verifyPlaylistTracks } from "./server/verify.js";
import { COVERS_DIR } from "./server/paths.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, "public");
const PROMPT_PATH = path.join(__dirname, "prompts", "curator-system.md");

// 1. 환경변수 확인 (서버 최초 실행 시 없으면 경고 후 UI에서 키 등록 가능)
if (!process.env.OPENAI_API_KEY) {
  console.warn("안내: OPENAI_API_KEY가 아직 설정되지 않았습니다. 브라우저 설정 창에서 키를 입력해 주세요.");
}

if (!process.env.YOUTUBE_API_KEY) {
  console.warn("경고: YOUTUBE_API_KEY가 설정되지 않았습니다. YouTube 연동 꺼짐: 검색 링크만 제공됩니다.");
}

// 2. 시스템 프롬프트 및 캐시 로드 (서버 시작 시 1회)
let systemInstructions = "";
try {
  systemInstructions = await fs.readFile(PROMPT_PATH, "utf-8");
  await loadCache();
} catch (err) {
  console.error(`오류: 시스템 리소스를 읽을 수 없습니다 (${PROMPT_PATH})`);
  if (process.env.VERCEL) throw err;
  process.exit(1);
}

const PORT = Number(process.env.PORT) || 3000;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-5.6";

const MIME_MAP = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".json": "application/json; charset=utf-8",
  ".woff2": "font/woff2",
  ".webp": "image/webp"
};

const CSP_HEADER = [
  "default-src 'self'",
  "script-src 'self' https://www.youtube.com https://s.ytimg.com",
  "frame-src https://www.youtube-nocookie.com https://www.youtube.com",
  "img-src 'self' data: https://i.ytimg.com",
  "style-src 'self' https://cdn.jsdelivr.net",
  "font-src 'self' https://cdn.jsdelivr.net",
  "connect-src 'self'"
].join("; ");

function sendJson(res, statusCode, data, extraHeaders = {}) {
  const body = JSON.stringify(data);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Content-Security-Policy": CSP_HEADER,
    ...extraHeaders
  });
  res.end(body);
}

function sendError(res, statusCode, code, message) {
  sendJson(res, statusCode, {
    error: {
      code,
      message
    }
  });
}

async function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    let byteLength = 0;
    const MAX_SIZE = 8 * 1024; // 8KB

    req.on("data", (chunk) => {
      byteLength += chunk.length;
      if (byteLength > MAX_SIZE) {
        reject(new AppError("PAYLOAD_TOO_LARGE", "요청 크기가 너무 큽니다 (최대 8KB)", 413));
        req.destroy();
        return;
      }
      body += chunk;
    });

    req.on("end", () => {
      if (!body) {
        return resolve({});
      }
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new AppError("INVALID_INPUT", "올바른 JSON 형식이 아닙니다.", 400));
      }
    });

    req.on("error", (err) => {
      reject(new AppError("INVALID_INPUT", "요청 본문을 읽는 중 오류가 발생했습니다.", 400));
    });
  });
}

export async function handler(req, res) {
  try {
    const parsedUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    const pathname = parsedUrl.pathname;

    // 1. GET /api/health
    if (req.method === "GET" && pathname === "/api/health") {
      return sendJson(res, 200, {
        ok: true,
        model: OPENAI_MODEL,
        youtube: Boolean(process.env.YOUTUBE_API_KEY)
      });
    }

    // 2. POST /api/playlist
    if (req.method === "POST" && pathname === "/api/playlist") {
      // 2.1 속도 제한
      checkRateLimit(req);

      // 2.2 요청 본문 파싱 및 검증
      const body = await readJsonBody(req);
      const mood = typeof body.mood === "string" ? body.mood.trim() : "";
      if (!mood || mood.length > 300) {
        return sendError(res, 400, "INVALID_INPUT", "분위기나 상황을 1~300자 이내로 입력해 주세요.");
      }

      const language = body.language || "auto";
      if (!["auto", "ko", "global"].includes(language)) {
        return sendError(res, 400, "INVALID_INPUT", "지원하지 않는 언어 선호 옵션입니다.");
      }

      const refinement = typeof body.refinement === "string" ? body.refinement.trim().slice(0, 100) : null;
      let previous = body.previous || null;
      if (refinement && !previous) {
        return sendError(res, 400, "INVALID_INPUT", "수정 요청 시 이전 플레이리스트 정보가 필요합니다.");
      }

      // 2.3 OpenAI 메시지 생성 및 호출
      let userInput = buildUserMessage({ mood, language, refinement, previous });
      let result = await callOpenAI({ instructions: systemInstructions, input: userInput });

      // 2.4 규칙 검증 및 필요 시 1회 재시도
      let validation = validatePlaylistResponse(result);
      if (validation.hard.length > 0) {
        console.warn("검증 실패, 1회 재시도합니다:", validation.hard);
        const retryInput = `${userInput}\n\n[이전 응답의 문제]\n${validation.hard.map((msg) => `- ${msg}`).join("\n")}\n위 문제를 반드시 해결하여 다시 응답하세요.`;
        result = await callOpenAI({ instructions: systemInstructions, input: retryInput });
        validation = validatePlaylistResponse(result);
        if (validation.hard.length > 0) {
          throw new AppError("VALIDATION_FAILED", "플레이리스트 생성 규칙을 만족하지 못했습니다. 다시 시도해 주세요.", 502);
        }
      }

      // 2.5 clarify 응답인 경우
      if (result.status === "clarify") {
        return sendJson(res, 200, {
          status: "clarify",
          questions: result.questions
        });
      }

      // 2.6 status: ok인 경우 후처리
      const playlist = result.playlist;
      const rawConcept = playlist.coverConcept;
      const coverConcept = sanitizeCoverConcept(rawConcept, { mood: playlist.mood, flow: playlist.flow });
      delete playlist.coverConcept; // 응답에서 coverConcept 제거

      // 번호 재부여 및 검색 링크 생성
      playlist.tracks = playlist.tracks.map((t, idx) => ({
        no: idx + 1,
        title: t.title,
        artist: t.artist,
        reason: t.reason,
        link: buildSearchLink(t.artist, t.title),
        videoId: null,
        verified: null
      }));

      // (선택) Phase 8 곡 실존 확인
      playlist.tracks = await verifyPlaylistTracks(playlist.tracks);

      // YouTube videoId 및 전체 재생 URL 연결 (캐시 우선)
      await attachYouTube(playlist);

      // 표지 결정: 즉시 표지 + AI 표지 작업 시작 (백그라운드)
      const instantCover = pickInstantCover(playlist);
      const aiJob = startCoverJob({
        coverConcept,
        mood: playlist.mood,
        energy: playlist.energy,
        flow: playlist.flow
      });

      playlist.cover = {
        type: instantCover.type,
        thumbnails: instantCover.thumbnails,
        ai: aiJob
      };

      return sendJson(res, 200, {
        status: "ok",
        playlist
      });
    }

    // 3. GET /api/cover/:id (AI 표지 상태 폴링)
    if (req.method === "GET" && pathname.startsWith("/api/cover/")) {
      checkRateLimit(req, 60);
      const match = pathname.match(/^\/api\/cover\/([a-f0-9]{16})$/);
      if (!match) {
        return sendError(res, 400, "INVALID_INPUT", "올바르지 않은 표지 id입니다.");
      }
      const job = getCoverJob(match[1]);
      if (!job || job.status === "unknown") {
        return sendError(res, 404, "NOT_FOUND", "표지 생성 작업을 찾을 수 없습니다.");
      }
      return sendJson(res, 200, {
        status: job.status,
        url: job.url
      });
    }

    // 4. POST /api/youtube/resolve (기록 복원 시 videoId 조회)
    if (req.method === "POST" && pathname === "/api/youtube/resolve") {
      checkRateLimit(req, 20);
      const body = await readJsonBody(req);
      const tracks = Array.isArray(body.tracks) ? body.tracks.slice(0, 10) : [];
      const dummyPlaylist = { tracks: tracks.map((t) => ({ no: t.no, title: t.title, artist: t.artist, videoId: null })) };
      await attachYouTube(dummyPlaylist);
      return sendJson(res, 200, {
        tracks: dummyPlaylist.tracks.map((t) => ({ no: t.no, videoId: t.videoId })),
        youtube: dummyPlaylist.youtube
      });
    }

    // 4. GET /covers/:id.webp (data/covers/ 서빙)
    if (req.method === "GET" && pathname.startsWith("/covers/")) {
      const match = pathname.match(/^\/covers\/([a-f0-9]{16})\.webp$/);
      if (!match) {
        return sendError(res, 400, "INVALID_INPUT", "올바르지 않은 표지 요청입니다.");
      }
      const coverId = match[1];
      const filePath = path.join(COVERS_DIR, `${coverId}.webp`);
      if (!existsSync(filePath)) {
        return sendError(res, 404, "NOT_FOUND", "표지를 찾을 수 없습니다.");
      }
      res.writeHead(200, {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff"
      });
      return createReadStream(filePath).pipe(res);
    }

    // 4. 정적 파일 서빙 (public/ 한정)
    if (req.method === "GET") {
      let relativePath = pathname === "/" ? "/index.html" : pathname;
      try {
        relativePath = decodeURIComponent(relativePath);
      } catch {
        return sendError(res, 400, "BAD_REQUEST", "잘못된 경로 인코딩입니다.");
      }

      // 안전한 경로 확인
      const normalizedPath = path.normalize(path.join(PUBLIC_DIR, relativePath));
      if (!normalizedPath.startsWith(PUBLIC_DIR)) {
        return sendError(res, 403, "FORBIDDEN", "접근 권한이 없습니다.");
      }

      try {
        const stat = await fs.stat(normalizedPath);
        if (stat.isDirectory()) {
          const indexPath = path.join(normalizedPath, "index.html");
          await fs.access(indexPath);
          return serveFile(res, indexPath);
        }
        return serveFile(res, normalizedPath);
      } catch (err) {
        return sendError(res, 404, "NOT_FOUND", "요청한 파일을 찾을 수 없습니다.");
      }
    }

    // 지원하지 않는 메소드 또는 엔드포인트
    sendError(res, 404, "NOT_FOUND", "지원하지 않는 요청입니다.");
  } catch (error) {
    if (error instanceof AppError) {
      return sendError(res, error.status, error.code, error.message);
    }
    console.error("서버 내부 예외 발생:", error);
    sendError(res, 500, "SERVER_ERROR", "서버 오류가 발생했습니다.");
  }
}

function serveFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_MAP[ext] || "application/octet-stream";

  res.writeHead(200, {
    "Content-Type": contentType,
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Content-Security-Policy": CSP_HEADER
  });
  createReadStream(filePath).pipe(res);
}

// 로컬 실행 시에만 포트를 연다 (Vercel에서는 api/index.js가 handler를 사용)
if (!process.env.VERCEL) {
  http.createServer(handler).listen(PORT, () => {
    console.log(`Moodlist 서버가 포트 ${PORT}에서 실행 중입니다: http://localhost:${PORT}`);
  });
}
