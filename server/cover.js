import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { COVERS_DIR as COVER_DIR } from "./paths.js";

// Vercel: 응답 후에도 백그라운드 작업이 끝날 때까지 함수를 유지
function keepAlive(promise) {
  try {
    globalThis[Symbol.for("@vercel/request-context")]?.get?.()?.waitUntil?.(promise);
  } catch {}
}

export class CoverError extends Error {
  constructor(code, message) {
    super(message || `Cover error: ${code}`);
    this.code = code;
  }
}

// 1. 일일 한도 및 최근 생성 횟수 관리
let dailyBudget = {
  date: new Date().toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" }),
  count: 0
};
const ipCoverTimestamps = new Map();

function checkDailyBudget() {
  const today = new Date().toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" });
  if (dailyBudget.date !== today) {
    dailyBudget = { date: today, count: 0 };
  }
  const maxLimit = Number(process.env.COVER_DAILY_LIMIT) ?? 30;
  if (dailyBudget.count >= maxLimit) {
    return false;
  }
  dailyBudget.count += 1;
  return true;
}

export function pickInstantCover(playlist, mode = process.env.COVER_MODE || "auto") {
  const ids = (playlist.tracks || []).map((t) => t.videoId).filter((id) => typeof id === "string" && /^[A-Za-z0-9_-]{11}$/.test(id));
  if (mode !== "ai" && ids.length > 0) {
    return {
      type: "collage",
      thumbnails: ids.slice(0, 4)
    };
  }
  return {
    type: "text",
    thumbnails: []
  };
}

export function buildCoverPrompt({ coverConcept, mood = [], energy = 3, flow = "" }) {
  return [
    "Square album cover artwork for a music playlist, displayed on a dark interface.",
    `Visual concept: ${coverConcept}`,
    `Mood: ${mood.join(", ")}. Energy ${energy} of 5. Tempo flow: ${flow}.`,
    "Style: cinematic photograph or refined abstract art, one strong focal point, generous negative space,",
    "rich but restrained colors that read well on black.",
    "Strict rules: no text, no letters, no numbers, no logos, no watermarks, no album titles,",
    "no real or recognizable people, no musicians, no celebrity likeness, no existing album artwork, no brand imagery."
  ].join("\n");
}

export async function generateCover(prompt, fetchFn = globalThis.fetch) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new CoverError("CONFIG_ERROR", "OpenAI API 키가 없습니다.");

  const model = process.env.OPENAI_IMAGE_MODEL || "gpt-image-2";
  const isDalle = model.startsWith("dall-e");
  const rawQuality = process.env.COVER_QUALITY || (isDalle ? "standard" : "medium");

  // DALL·E 3는 output_format/output_compression을 받지 않고, quality는 standard|hd만 허용
  // gpt-image 계열은 quality가 low|medium|high|auto
  const body = isDalle
    ? {
        model,
        prompt,
        size: "1024x1024",
        quality: rawQuality === "hd" || rawQuality === "high" ? "hd" : "standard",
        n: 1
      }
    : {
        model,
        prompt,
        size: "1024x1024",
        quality: rawQuality === "standard" ? "medium" : rawQuality,
        output_format: "webp",
        output_compression: 80,
        n: 1
      };

  const res = await fetchFn("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120000)
  });

  if (!res.ok) {
    let detail = "";
    try {
      detail = (await res.json())?.error?.message || "";
    } catch {}
    throw new CoverError(res.status, `OpenAI 이미지 생성 오류 (${res.status})${detail ? `: ${detail}` : ""}`);
  }

  const { data } = await res.json();
  const b64 = data?.[0]?.b64_json;
  if (b64) return Buffer.from(b64, "base64");

  // 일부 모델은 b64 대신 임시 URL을 돌려줌
  const imageUrl = data?.[0]?.url;
  if (imageUrl) {
    const imgRes = await fetchFn(imageUrl, { signal: AbortSignal.timeout(60000) });
    if (!imgRes.ok) throw new CoverError(imgRes.status, `표지 이미지 다운로드 오류 (${imgRes.status})`);
    return Buffer.from(await imgRes.arrayBuffer());
  }

  throw new CoverError("EMPTY_RESPONSE", "이미지 데이터가 비어 있습니다.");
}

const jobs = new Map(); // id -> { status, url, createdAt }

export function getCoverJob(id) {
  if (!/^[a-f0-9]{16}$/.test(id)) return null;
  const filePath = path.join(COVER_DIR, `${id}.webp`);
  if (existsSync(filePath)) {
    return { id, status: "ready", url: `/covers/${id}.webp` };
  }
  if (jobs.has(id)) {
    return { id, ...jobs.get(id) };
  }
  return { id, status: "unknown", url: null };
}

export function startCoverJob(input, fetchFn = globalThis.fetch) {
  const mode = process.env.COVER_MODE || "auto";
  if (mode === "collage") {
    return null; // AI 표지 미사용 모드
  }

  const prompt = buildCoverPrompt(input);
  const hash = crypto.createHash("sha256").update(`${process.env.OPENAI_IMAGE_MODEL || "gpt-image-2"}|${prompt}`).digest("hex");
  const id = hash.slice(0, 16);
  const filePath = path.join(COVER_DIR, `${id}.webp`);

  if (existsSync(filePath)) {
    return { id, status: "ready", url: `/covers/${id}.webp` };
  }
  if (jobs.has(id)) {
    return { id, ...jobs.get(id) };
  }

  if (!checkDailyBudget()) {
    console.warn("표지 생성 일일 한도를 초과하여 AI 표지 생성을 건너뜁니다.");
    return null;
  }

  jobs.set(id, { status: "pending", url: null, createdAt: Date.now() });

  const work = generateCover(prompt, fetchFn)
    .then(async (buf) => {
      await fs.mkdir(COVER_DIR, { recursive: true });
      const tempPath = `${filePath}.tmp.${Date.now()}`;
      await fs.writeFile(tempPath, buf);
      await fs.rename(tempPath, filePath);
      jobs.set(id, { status: "ready", url: `/covers/${id}.webp`, createdAt: Date.now() });
    })
    .catch((err) => {
      console.warn("AI 표지 생성 실패:", err.message);
      jobs.set(id, { status: "failed", url: null, createdAt: Date.now() });
    });
  keepAlive(work);

  return { id, status: "pending", url: null };
}
